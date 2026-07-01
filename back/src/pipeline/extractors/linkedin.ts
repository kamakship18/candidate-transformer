import type { CandidateEducation, CandidateExperience, CandidateSkill, PartialCandidateRecord } from '../types';

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

function normalizeDatePart(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const year = typeof value.year === 'number' ? value.year : Number(value.year);
  if (!Number.isInteger(year)) {
    return null;
  }

  const monthValue = value.month;
  const month = monthValue === undefined || monthValue === null ? 1 : Number(monthValue);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return `${year}-01`;
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}

function joinName(firstName: unknown, lastName: unknown) {
  const first = typeof firstName === 'string' ? firstName.trim() : '';
  const last = typeof lastName === 'string' ? lastName.trim() : '';
  return [first, last].filter(Boolean).join(' ') || null;
}

function buildExperience(rawPositions: unknown): CandidateExperience[] {
  if (!Array.isArray(rawPositions)) {
    return [];
  }

  return rawPositions.flatMap((position) => {
    if (!isRecord(position)) {
      return [];
    }

    const company = typeof position.companyName === 'string' ? position.companyName.trim() : '';
    const title = typeof position.title === 'string' ? position.title.trim() : '';
    if (!company && !title) {
      return [];
    }

    return [
      {
        company,
        title,
        start: normalizeDatePart(position.startDate),
        end: position.endDate === null || position.endDate === undefined ? null : normalizeDatePart(position.endDate),
        summary: typeof position.description === 'string' && position.description.trim() ? position.description.trim() : null
      }
    ];
  });
}

function buildEducation(rawEducations: unknown): CandidateEducation[] {
  if (!Array.isArray(rawEducations)) {
    return [];
  }

  return rawEducations.flatMap((education) => {
    if (!isRecord(education)) {
      return [];
    }

    const institution = typeof education.schoolName === 'string' ? education.schoolName.trim() : '';
    if (!institution) {
      return [];
    }

    const endYear = isRecord(education.endDate) && typeof education.endDate.year === 'number' ? education.endDate.year : null;

    return [
      {
        institution,
        degree: typeof education.degreeName === 'string' && education.degreeName.trim() ? education.degreeName.trim() : null,
        field: typeof education.fieldOfStudy === 'string' && education.fieldOfStudy.trim() ? education.fieldOfStudy.trim() : null,
        end_year: endYear
      }
    ];
  });
}

function buildSkills(rawSkills: unknown): CandidateSkill[] {
  if (!Array.isArray(rawSkills)) {
    return [];
  }

  return rawSkills.flatMap((skill) => {
    if (typeof skill !== 'string' || !skill.trim()) {
      return [];
    }

    return [{ name: skill.trim(), confidence: 0.8, sources: ['linkedin'] }];
  });
}

export function extractFromLinkedIn(rawData: unknown): PartialCandidateRecord {
  const record = parseInput(rawData);
  if (!record) {
    return {};
  }

  const partial: PartialCandidateRecord = {};
  const fullName = joinName(record.firstName, record.lastName);
  if (fullName) {
    partial.full_name = fullName;
  }

  if (typeof record.headline === 'string' && record.headline.trim()) {
    partial.headline = record.headline.trim();
  }

  if (isRecord(record.location)) {
    partial.location = {
      city: typeof record.location.city === 'string' ? record.location.city : null,
      region: null,
      country: typeof record.location.country === 'string' ? record.location.country : null
    };
  }

  const experience = buildExperience(record.positions);
  if (experience.length) {
    partial.experience = experience;
  }

  const education = buildEducation(record.educations);
  if (education.length) {
    partial.education = education;
  }

  const skills = buildSkills(record.skills);
  if (skills.length) {
    partial.skills = skills;
  }

  return partial;
}