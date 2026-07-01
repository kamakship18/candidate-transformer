import type { CandidateEducation, CandidateExperience, CandidateLocation, CandidateSkill, PartialCandidateRecord } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseInput(rawData: unknown): Record<string, unknown> | null {
  if (isRecord(rawData)) {
    return rawData;
  }

  if (typeof rawData !== 'string' || !rawData.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawData) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function findFirstValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function parseYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d{4}$/.test(value.trim())) {
    return Number(value.trim());
  }

  if (isRecord(value)) {
    return parseYear(value.year);
  }

  return null;
}

function parseCommaSeparatedLocation(locationText: string): CandidateLocation {
  const parts = locationText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { city: null, region: null, country: null };
  }

  if (parts.length === 1) {
    return { city: parts[0], region: null, country: null };
  }

  if (parts.length === 2) {
    return { city: parts[0], region: null, country: parts[1] };
  }

  return {
    city: parts[0],
    region: parts[1],
    country: parts.slice(2).join(', ')
  };
}

function buildLocation(record: Record<string, unknown>): CandidateLocation | null {
  if (isRecord(record.location)) {
    const nested = record.location;
    const city = typeof nested.city === 'string' && nested.city.trim() ? nested.city.trim() : null;
    const regionValue = nested.region ?? nested.state;
    const region = typeof regionValue === 'string' && regionValue.trim() ? regionValue.trim() : null;
    const country = typeof nested.country === 'string' && nested.country.trim() ? nested.country.trim() : null;

    if (city || region || country) {
      return { city, region, country };
    }
  }

  const locationText = findFirstValue(record, ['location', 'candidate_location', 'work_location']);
  if (typeof locationText === 'string') {
    const parsed = parseCommaSeparatedLocation(locationText);
    if (parsed.city || parsed.region || parsed.country) {
      return parsed;
    }
  }

  const city = findFirstValue(record, ['location_city', 'city']);
  const region = findFirstValue(record, ['location_region', 'location_state', 'region', 'state']);
  const country = findFirstValue(record, ['location_country', 'country']);

  if (typeof city === 'string' || typeof region === 'string' || typeof country === 'string') {
    return {
      city: typeof city === 'string' ? city : null,
      region: typeof region === 'string' ? region : null,
      country: typeof country === 'string' ? country : null
    };
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === 'string' && item.trim() ? [item.trim()] : []));
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildExperience(record: Record<string, unknown>): CandidateExperience[] {
  const company = findFirstValue(record, ['employer', 'company']);
  const title = findFirstValue(record, ['current_position']);

  if (typeof company !== 'string' && typeof title !== 'string') {
    return [];
  }

  return [
    {
      company: typeof company === 'string' ? company : '',
      title: typeof title === 'string' ? title : '',
      start: null,
      end: null,
      summary: null
    }
  ];
}

function buildEducationEntry(record: Record<string, unknown>): CandidateEducation | null {
  const institution = findFirstValue(record, [
    'school_name',
    'education_institution',
    'schoolName',
    'institution',
    'school'
  ]);
  const degree = findFirstValue(record, ['degree', 'degreeName']);
  const field = findFirstValue(record, ['field', 'fieldOfStudy', 'field_of_study', 'major']);
  const endYear = parseYear(record.education_end_year ?? record.end_year ?? record.endDate);

  if (typeof institution !== 'string') {
    return null;
  }

  return {
    institution,
    degree: typeof degree === 'string' ? degree : null,
    field: typeof field === 'string' ? field : null,
    end_year: endYear
  };
}

function buildEducation(record: Record<string, unknown>): CandidateEducation[] {
  const rawEducation = record.education ?? record.educations ?? record.education_history;

  if (Array.isArray(rawEducation)) {
    return rawEducation.flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }

      const parsed = buildEducationEntry(entry);
      return parsed ? [parsed] : [];
    });
  }

  const flatEducation = buildEducationEntry(record);
  return flatEducation ? [flatEducation] : [];
}

function buildSkills(record: Record<string, unknown>): CandidateSkill[] {
  const skills = toStringArray(record.skills_list ?? record.competencies);
  return skills.map((skill) => ({ name: skill, confidence: 0.95, sources: ['ats_json'] }));
}

export function extractFromATS(rawData: unknown): PartialCandidateRecord {
  const record = parseInput(rawData);
  if (!record) {
    return {};
  }

  const fullName = findFirstValue(record, ['applicant_name', 'candidate_name']);
  const email = findFirstValue(record, ['contact_email', 'applicant_email', 'email']);
  const phone = findFirstValue(record, ['contact_phone', 'mobile', 'phone']);
  const headline = findFirstValue(record, ['profile_summary']);
  const yearsExperience = findFirstValue(record, ['years_exp']);

  const partial: PartialCandidateRecord = {};

  if (typeof fullName === 'string') {
    partial.full_name = fullName;
  }

  if (typeof email === 'string') {
    partial.emails = [email];
  }

  if (typeof phone === 'string') {
    partial.phones = [phone];
  }

  if (typeof headline === 'string') {
    partial.headline = headline;
  }

  if (typeof yearsExperience === 'number') {
    partial.years_experience = yearsExperience;
  }

  const location = buildLocation(record);
  if (location) {
    partial.location = location;
  }

  const experience = buildExperience(record);
  if (experience.length) {
    partial.experience = experience;
  }

  const education = buildEducation(record);
  if (education.length) {
    partial.education = education;
  }

  const skills = buildSkills(record);
  if (skills.length) {
    partial.skills = skills;
  }

  return partial;
}
