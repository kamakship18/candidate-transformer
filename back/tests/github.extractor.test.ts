import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractFromGitHub } from '@back/pipeline/extractors/github';
import { SAMPLE_GITHUB_REPOS, SAMPLE_GITHUB_USER } from './fixtures/sample_github_response';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitHub extractor', () => {
  it('extracts from pre-fetched ingest payload without making network calls', async () => {
    const record = await extractFromGitHub({
      user: SAMPLE_GITHUB_USER,
      repos: SAMPLE_GITHUB_REPOS
    });

    expect(record.full_name).toBe('Arjun Sharma');
    expect(record.links).toEqual({ portfolio: 'https://arjun.dev', github: 'https://github.com/arjunsharma' });
    expect(record.skills).toEqual([
      { name: 'TypeScript', confidence: 0.8, sources: ['github'] },
      { name: 'Python', confidence: 0.6, sources: ['github'] }
    ]);
  });

  it('extracts user profile and aggregates repo languages', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/repos?per_page=100')) {
        return {
          ok: true,
          json: async () => SAMPLE_GITHUB_REPOS
        } as Response;
      }

      return {
        ok: true,
        json: async () => SAMPLE_GITHUB_USER
      } as Response;
    });

    vi.stubGlobal('fetch', fetchMock);

    const record = await extractFromGitHub('https://github.com/arjunsharma');

    expect(record.full_name).toBe('Arjun Sharma');
    expect(record.headline).toBe('Backend engineer focused on distributed systems');
    expect(record.location).toEqual({ city: 'Bengaluru, India', region: null, country: null });
    expect(record.links).toEqual({ portfolio: 'https://arjun.dev', github: 'https://github.com/arjunsharma' });
    expect(record.experience).toEqual([
      {
        company: 'Infosys',
        title: '',
        start: null,
        end: null,
        summary: null
      }
    ]);
    expect(record.skills).toEqual([
      { name: 'TypeScript', confidence: 0.8, sources: ['github'] },
      { name: 'Python', confidence: 0.6, sources: ['github'] }
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns an empty record when the user request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) } as Response)));
    await expect(extractFromGitHub('arjunsharma')).resolves.toEqual({});
  });
});