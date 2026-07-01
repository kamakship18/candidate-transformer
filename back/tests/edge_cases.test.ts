import { describe, expect, it } from 'vitest';
import { mergePartialProfiles } from '@back/pipeline/merger';
import { makeSourceProfile } from './fixtures/source_profile';

describe('merge edge cases', () => {
  const weighted = { policy: 'weighted' as const };

  it('is deterministic across source ordering when names conflict across three sources', () => {
    const left = mergePartialProfiles(
      [
        makeSourceProfile('csv', { full_name: 'Arjun Sharma' }),
        makeSourceProfile('linkedin', { full_name: 'Arjun S.' }),
        makeSourceProfile('ats_json', { full_name: 'Arjun Sharma' }),
      ],
      weighted
    );

    const right = mergePartialProfiles(
      [
        makeSourceProfile('ats_json', { full_name: 'Arjun Sharma' }),
        makeSourceProfile('csv', { full_name: 'Arjun Sharma' }),
        makeSourceProfile('linkedin', { full_name: 'Arjun S.' }),
      ],
      weighted
    );

    expect(left.full_name).toBe(right.full_name);
    expect(left.provenance.filter((entry) => entry.field === 'full_name').length).toBe(3);
  });
});
