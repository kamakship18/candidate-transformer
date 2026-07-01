import { describe, expect, it } from 'vitest';
import { ingestSources } from '@back/pipeline/ingest';
import { SAMPLE_RESUME } from './fixtures/resume_sample';

describe('ingest', () => {
  it('reads resume txt files as text', async () => {
    const file = new File([SAMPLE_RESUME], 'resume_sample.txt', { type: 'text/plain' });
    const bundles = await ingestSources({ resume: file });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.type).toBe('resume');
    expect(bundles[0]?.instanceId).toBe('resume:resume_sample.txt');
    expect(bundles[0]?.rawData).toBe(SAMPLE_RESUME);
  });
});
