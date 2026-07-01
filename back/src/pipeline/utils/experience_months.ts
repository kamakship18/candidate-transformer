import { normalizeDate } from '../normalizers/date';
import type { CandidateEducation, CandidateExperience } from '../types';

function parseYearMonth(value: string) {
  const normalized = normalizeDate(value).value;
  if (!normalized) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(normalized);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2])
  };
}

export function parseDateRangeLine(line: string): { start: string; end: string | null } | null {
  const trimmed = line.trim();
  if (!trimmed.includes('-') && !trimmed.includes('–') && !trimmed.includes('—')) {
    return null;
  }

  const parts = trimmed.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) {
    return null;
  }

  const start = normalizeDate(parts[0]?.trim() ?? '').value;
  if (!start) {
    return null;
  }

  const endToken = parts[1]?.trim() ?? '';
  if (/^present$/i.test(endToken)) {
    return { start, end: null };
  }

  const end = normalizeDate(endToken).value;
  if (!end) {
    return null;
  }

  return { start, end };
}

export function monthsBetweenYearMonths(
  startYm: string,
  endYm: string | null,
  referenceDate = new Date()
): number {
  const start = parseYearMonth(startYm);
  if (!start) {
    return 0;
  }

  const end = endYm
    ? parseYearMonth(endYm)
    : {
        year: referenceDate.getFullYear(),
        month: referenceDate.getMonth() + 1
      };

  if (!end) {
    return 0;
  }

  const months = (end.year - start.year) * 12 + (end.month - start.month);
  return Math.max(0, months);
}

export function totalExperienceMonths(
  experiences: CandidateExperience[],
  referenceDate = new Date()
): number {
  return experiences.reduce((total, experience) => {
    if (!experience.start) {
      return total;
    }

    return total + monthsBetweenYearMonths(experience.start, experience.end, referenceDate);
  }, 0);
}

export function calculateYearsExperienceFromMonths(
  experiences: CandidateExperience[],
  referenceDate = new Date()
): number | null {
  const totalMonths = totalExperienceMonths(experiences, referenceDate);
  if (totalMonths <= 0) {
    return null;
  }

  return Math.floor(totalMonths / 12);
}

export function maxPlausibleExperienceMonthsFromEducation(
  education: CandidateEducation[],
  referenceDate = new Date()
): number | null {
  const graduationYears = education
    .map((entry) => entry.end_year)
    .filter((year): year is number => typeof year === 'number');

  if (!graduationYears.length) {
    return null;
  }

  const earliestGraduation = Math.min(...graduationYears);
  const startYm = `${earliestGraduation}-06`;
  return monthsBetweenYearMonths(startYm, null, referenceDate);
}

export function experienceMonthsIsPlausible(
  totalMonths: number,
  education: CandidateEducation[],
  referenceDate = new Date()
): boolean {
  const maxPlausibleMonths = maxPlausibleExperienceMonthsFromEducation(education, referenceDate);
  if (maxPlausibleMonths === null) {
    return true;
  }

  return totalMonths <= maxPlausibleMonths + 12;
}
