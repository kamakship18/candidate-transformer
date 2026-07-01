import type { PipelineError, SourceBundle, SourceType } from '../types';

export interface RawSourceInputs {
  csv?: File | File[] | null;
  ats_json?: File | File[] | null;
  github_username?: string | null;
  linkedin?: File | File[] | null;
  notes?: File | File[] | null;
  resume?: File | File[] | null;
}

function asFileList(value?: File | File[] | null): File[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function createInstanceId(type: SourceType, file: File) {
  return `${type}:${file.name}`;
}

/**
 * Reads a File using the FileReader API and returns its text content.
 */
async function readFileAsText(file: File): Promise<string> {
  return file.text();
}

/**
 * Fetches GitHub user data and repos for the given username.
 * Returns a combined object for the GitHub extractor.
 */
async function fetchGitHubData(username: string): Promise<{ user: unknown; repos: unknown }> {
  const trimmed = username.trim().replace(/^(https?:\/\/)?(www\.)?github\.com\//, '');

  const [userResponse, reposResponse] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(trimmed)}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    }),
    fetch(`https://api.github.com/users/${encodeURIComponent(trimmed)}/repos?per_page=100`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    }),
  ]);

  if (!userResponse.ok) {
    throw new Error(`GitHub API error ${userResponse.status}: ${userResponse.statusText}`);
  }

  const user = await userResponse.json();
  const repos = reposResponse.ok ? await reposResponse.json() : [];

  return { user, repos };
}

function isTextResume(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith('.txt') || file.type === 'text/plain';
}

/**
 * Reads a File as an ArrayBuffer for binary formats like PDF.
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

async function ingestTextFile(type: SourceType, file: File, parseJson = false): Promise<SourceBundle> {
  const errors: PipelineError[] = [];
  let rawData: unknown = null;

  try {
    const text = await readFileAsText(file);
    if (parseJson) {
      try {
        rawData = JSON.parse(text);
      } catch (e) {
        errors.push({
          stage: 'ingest',
          source: type,
          code: 'JSON_PARSE_ERROR',
          message: `${type} JSON parse failed: ${e instanceof Error ? e.message : String(e)}`,
          details: e,
        });
      }
    } else {
      rawData = text;
    }
  } catch (e) {
    errors.push({
      stage: 'ingest',
      source: type,
      code: 'FILE_READ_ERROR',
      message: e instanceof Error ? e.message : `Failed to read ${type} file`,
      details: e,
    });
  }

  return {
    type,
    instanceId: createInstanceId(type, file),
    sourceLabel: file.name,
    rawData,
    fetchedAt: new Date().toISOString(),
    errors,
  };
}

async function ingestResumeFile(file: File): Promise<SourceBundle> {
  const errors: PipelineError[] = [];
  let rawData: unknown = null;

  try {
    rawData = isTextResume(file) ? await readFileAsText(file) : await readFileAsArrayBuffer(file);
  } catch (e) {
    errors.push({
      stage: 'ingest',
      source: 'resume',
      code: 'FILE_READ_ERROR',
      message: e instanceof Error ? e.message : 'Failed to read resume file',
      details: e,
    });
  }

  return {
    type: 'resume',
    instanceId: createInstanceId('resume', file),
    sourceLabel: file.name,
    rawData,
    fetchedAt: new Date().toISOString(),
    errors,
  };
}

/**
 * Ingests all raw source inputs and returns an array of SourceBundles.
 * Each bundle contains the parsed/fetched data along with any per-source errors.
 * Never throws — all errors are captured inside the bundle.
 */
export async function ingestSources(inputs: RawSourceInputs): Promise<SourceBundle[]> {
  const bundles: SourceBundle[] = [];

  for (const file of asFileList(inputs.csv)) {
    bundles.push(await ingestTextFile('csv', file));
  }

  for (const file of asFileList(inputs.ats_json)) {
    bundles.push(await ingestTextFile('ats_json', file, true));
  }

  if (inputs.github_username?.trim()) {
    const errors: PipelineError[] = [];
    let rawData: unknown = null;

    try {
      rawData = await fetchGitHubData(inputs.github_username);
    } catch (e) {
      const isRateLimit =
        e instanceof Error && (e.message.includes('403') || e.message.toLowerCase().includes('rate limit'));

      errors.push({
        stage: 'ingest',
        source: 'github',
        code: isRateLimit ? 'RATE_LIMIT' : 'FETCH_ERROR',
        message: e instanceof Error ? e.message : 'Failed to fetch GitHub data',
        details: e,
      });
    }

    bundles.push({
      type: 'github',
      instanceId: `github:${inputs.github_username.trim()}`,
      sourceLabel: inputs.github_username.trim(),
      rawData,
      fetchedAt: new Date().toISOString(),
      errors,
    });
  }

  for (const file of asFileList(inputs.linkedin)) {
    bundles.push(await ingestTextFile('linkedin', file, true));
  }

  for (const file of asFileList(inputs.notes)) {
    bundles.push(await ingestTextFile('notes', file));
  }

  for (const file of asFileList(inputs.resume)) {
    bundles.push(await ingestResumeFile(file));
  }

  return bundles;
}
