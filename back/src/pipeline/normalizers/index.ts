import type { PartialCandidateRecord } from '../types';
import { canonicalizeSkill } from './skills';
import { normalizeCountry } from './country';
import { normalizeDate } from './date';
import { normalizePhone } from './phone';

function normalizeExperienceDates(profile: PartialCandidateRecord): PartialCandidateRecord {
  if (!profile.experience) {
    return profile;
  }

  return {
    ...profile,
    experience: profile.experience.map((entry) => ({
      ...entry,
      start: entry.start === null || entry.start === undefined ? null : normalizeDate(entry.start).value,
      end: entry.end === null || entry.end === undefined ? null : normalizeDate(entry.end).value
    }))
  };
}

function normalizeEducationYears(profile: PartialCandidateRecord): PartialCandidateRecord {
  if (!profile.education) {
    return profile;
  }

  return {
    ...profile,
    education: profile.education.map((entry) => ({
      ...entry,
      end_year: entry.end_year === null || entry.end_year === undefined ? null : Number(entry.end_year)
    }))
  };
}

export function normalizePartialProfile(profile: PartialCandidateRecord): PartialCandidateRecord {
  const normalizedSkills = profile.skills?.map((skill) => {
    const canonicalName = canonicalizeSkill(skill.name).value ?? skill.name;
    return { ...skill, name: canonicalName };
  });

  const normalizedPhones = profile.phones?.map((phone) => normalizePhone(phone).value).filter((phone): phone is string => Boolean(phone));

  const normalizedLocation = profile.location
    ? {
        ...profile.location,
        country: profile.location.country === null || profile.location.country === undefined ? null : normalizeCountry(profile.location.country).value
      }
    : profile.location;

  return normalizeEducationYears({
    ...normalizeExperienceDates({
      ...profile,
      skills: normalizedSkills,
      phones: normalizedPhones,
      location: normalizedLocation
    })
  });
}