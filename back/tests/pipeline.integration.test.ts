import { describe, it, expect } from 'vitest';
import { runPipeline, DEFAULT_OUTPUT_CONFIG } from '@back/pipeline/runner';
import { mergePartialProfiles } from '@back/pipeline/merger';
import type { RawSourceInputs } from '@back/pipeline/ingest';
import { makeSourceProfile } from './fixtures/source_profile';

describe('Pipeline Edge Cases', () => {
  it('handles completely empty inputs without throwing', async () => {
    const inputs: RawSourceInputs = {
      csv: null,
      ats_json: null,
      github_username: null,
      linkedin: null,
      notes: null,
    };

    const result = await runPipeline(inputs, DEFAULT_OUTPUT_CONFIG);
    expect(result.canonical.candidate_id).toBe('candidate-empty');
    expect(result.canonical.full_name).toBeNull();
    expect(result.errors).toHaveLength(0);
  });

  it('handles malformed files gracefully without throwing', async () => {
    const csvFile = new File(['invalid,csv,file\n"unclosed quote'], 'malformed.csv', { type: 'text/csv' });
    const inputs: RawSourceInputs = {
      csv: csvFile,
      ats_json: null,
      github_username: null,
      linkedin: null,
      notes: null,
    };

    const result = await runPipeline(inputs, DEFAULT_OUTPUT_CONFIG);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.canonical).toBeDefined();
  });

  it('deduplicates emails and phones in merger stage', () => {
    const partials = [
      makeSourceProfile('csv', { emails: ['test@example.com'], phones: ['+919876543210'] }),
      makeSourceProfile('linkedin', { emails: ['test@example.com'], phones: ['+919876543210'] }),
    ];
    const merged = mergePartialProfiles(partials, { policy: 'weighted' });
    expect(merged.emails).toEqual(['test@example.com']);
    expect(merged.phones).toEqual(['+919876543210']);
  });

  it('preserves fields from different sources when there is no conflict', () => {
    const partials = [
      makeSourceProfile('csv', { full_name: 'Arjun Sharma' }),
      makeSourceProfile('github', { headline: 'OSS Maintainer' }),
    ];
    const merged = mergePartialProfiles(partials, { policy: 'weighted' });
    expect(merged.full_name).toBe('Arjun Sharma');
    expect(merged.headline).toBe('OSS Maintainer');
  });
});
