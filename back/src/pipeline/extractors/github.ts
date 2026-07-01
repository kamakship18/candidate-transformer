import type { CandidateSkill, PartialCandidateRecord, SourceType } from '../types';

interface GitHubUserResponse {
  name?: string | null;
  bio?: string | null;
  location?: string | null;
  blog?: string | null;
  company?: string | null;
  html_url?: string | null;
}

interface GitHubRepoResponse {
  language?: string | null;
  topics?: string[];
}

interface IngestedGitHubPayload {
  user: GitHubUserResponse;
  repos: GitHubRepoResponse[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIngestedGitHubPayload(value: unknown): value is IngestedGitHubPayload {
  if (!isRecord(value)) {
    return false;
  }

  const user = value.user;
  const repos = value.repos;
  return isRecord(user) && Array.isArray(repos);
}

function extractUsername(rawData: unknown): string | null {
  if (typeof rawData !== 'string') {
    return null;
  }

  const trimmed = rawData.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    return pathSegments[0] ?? null;
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function isGitHubUrl(value: string) {
  return /github\.com/i.test(value);
}

function buildSkills(repos: GitHubRepoResponse[]): CandidateSkill[] {
  const languageCounts = new Map<string, number>();
  let reposWithLanguage = 0;

  for (const repo of repos) {
    const language = typeof repo.language === 'string' && repo.language.trim() ? repo.language.trim() : null;
    if (!language) {
      continue;
    }

    reposWithLanguage += 1;
    languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
  }

  if (!reposWithLanguage) {
    return [];
  }

  return Array.from(languageCounts.entries())
    .map(([name, count]) => {
      const frequency = count / reposWithLanguage;
      const confidence = frequency > 0.5 ? 0.8 : frequency >= 0.25 ? 0.6 : 0.4;
      return { name, confidence, sources: ['github' as SourceType] };
    })
    .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name));
}

function buildPortfolioUrl(value: string | null | undefined): string | null {
  if (!value || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (isGitHubUrl(trimmed) || /^https?:\/\//i.test(trimmed) && /linkedin\.com/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export async function extractFromGitHub(rawData: unknown): Promise<PartialCandidateRecord> {
  if (isIngestedGitHubPayload(rawData)) {
    return buildRecordFromGitHubData(rawData.user, rawData.repos);
  }

  const username = extractUsername(rawData);
  if (!username) {
    return {};
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Accept': 'application/vnd.github+json'
  };

  try {
    const userResponse = await fetch(`https://api.github.com/users/${username}`, { headers });
    if (!userResponse.ok) {
      return {};
    }

    const userData = (await userResponse.json()) as GitHubUserResponse;
    let repos: GitHubRepoResponse[] = [];

    try {
      const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
        headers
      });

      if (reposResponse.ok) {
        const repoData = (await reposResponse.json()) as unknown;
        if (Array.isArray(repoData)) {
          repos = repoData.filter((repo): repo is GitHubRepoResponse => typeof repo === 'object' && repo !== null) as GitHubRepoResponse[];
        }
      }
    } catch {
      repos = [];
    }

    return buildRecordFromGitHubData(userData, repos);
  } catch {
    return {};
  }
}

function buildRecordFromGitHubData(
  userData: GitHubUserResponse,
  repos: GitHubRepoResponse[]
): PartialCandidateRecord {
  const skills = buildSkills(repos);
  const record: PartialCandidateRecord = {};

  if (typeof userData.name === 'string' && userData.name.trim()) {
    record.full_name = userData.name.trim();
  }

  if (typeof userData.bio === 'string' && userData.bio.trim()) {
    record.headline = userData.bio.trim();
  }

  if (typeof userData.location === 'string' && userData.location.trim()) {
    record.location = { city: userData.location.trim(), region: null, country: null };
  }

  const portfolioUrl = buildPortfolioUrl(userData.blog);
  if (portfolioUrl) {
    record.links = { portfolio: portfolioUrl };
  }

  if (typeof userData.company === 'string' && userData.company.trim()) {
    record.experience = [
      {
        company: userData.company.trim(),
        title: '',
        start: null,
        end: null,
        summary: null
      }
    ];
  }

  if (typeof userData.html_url === 'string' && userData.html_url.trim()) {
    record.links = {
      ...(record.links ?? {}),
      github: userData.html_url.trim()
    };
  }

  if (skills.length) {
    record.skills = skills;
  }

  return record;
}