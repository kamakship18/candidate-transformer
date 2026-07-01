import Papa from 'papaparse';
import type { CandidateExperience, PartialCandidateRecord } from '../types';

function getFirstValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function parseLocation(locationText: string | null) {
  if (!locationText) {
    return null;
  }

  const parts = locationText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return null;
  }

  return {
    city: parts[0] ?? null,
    region: parts[1] ?? null,
    country: parts.slice(2).join(', ') || parts[parts.length - 1] || null
  };
}

function buildExperience(company: string | null, title: string | null): CandidateExperience[] {
  if (!company && !title) {
    return [];
  }

  return [
    {
      company: company ?? '',
      title: title ?? '',
      start: null,
      end: null,
      summary: null
    }
  ];
}

function extractRow(row: Record<string, string>): PartialCandidateRecord {
  const fullName = getFirstValue(row, ['name', 'full_name', 'candidate_name']);
  const email = getFirstValue(row, ['email', 'contact_email']);
  const phone = getFirstValue(row, ['phone', 'contact_phone', 'mobile']);
  const currentCompany = getFirstValue(row, ['current_company', 'company', 'employer']);
  const title = getFirstValue(row, ['title', 'current_position', 'position']);
  const location = getFirstValue(row, ['location']);
  const linkedin = getFirstValue(row, ['linkedin_url', 'linkedin']);
  const github = getFirstValue(row, ['github_url', 'github']);
  const resumeRef = getFirstValue(row, ['resume_path', 'resume_file', 'resume_filename', 'resume']);
  const yearsRaw = getFirstValue(row, ['years_experience', 'years_exp', 'experience_years']);

  const record: PartialCandidateRecord = {};

  if (fullName) {
    record.full_name = fullName;
  }

  if (email) {
    record.emails = [email];
  }

  if (phone && phone.toUpperCase() !== 'NULL') {
    record.phones = [phone];
  }

  if (yearsRaw) {
    const years = Number(yearsRaw);
    if (Number.isFinite(years)) {
      record.years_experience = years;
    }
  }

  const experience = buildExperience(currentCompany, title);
  if (experience.length) {
    record.experience = experience;
  }

  const parsedLocation = parseLocation(location);
  if (parsedLocation) {
    record.location = parsedLocation;
  }

  if (linkedin || github) {
    record.links = {};
    if (linkedin) {
      record.links.linkedin = linkedin;
    }
    if (github) {
      record.links.github = github;
    }
  }

  if (resumeRef) {
    record.resume_ref = resumeRef;
  }

  return record;
}

function hasIdentitySignals(record: PartialCandidateRecord) {
  return Boolean(
    record.full_name ||
      record.emails?.length ||
      record.phones?.length ||
      record.resume_ref
  );
}

export function extractAllFromCSV(rawData: unknown): PartialCandidateRecord[] {
  try {
    if (typeof rawData !== 'string' || !rawData.trim()) {
      return [];
    }

    const parsed = Papa.parse<Record<string, string>>(rawData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false
    });

    if (parsed.errors.length || !parsed.data.length) {
      return [];
    }

    return parsed.data
      .map((row) => extractRow(row))
      .filter((record) => Object.keys(record).length > 0 && hasIdentitySignals(record));
  } catch {
    return [];
  }
}

export function extractFromCSV(rawData: unknown): PartialCandidateRecord {
  return extractAllFromCSV(rawData)[0] ?? {};
}
