import { normalizePhone } from '../normalizers/phone';
import {
  calculateYearsExperienceFromMonths,
  experienceMonthsIsPlausible,
  totalExperienceMonths
} from '../utils/experience_months';
import { scoreField } from './conflict';
import type {
  CandidateEducation,
  CandidateExperience,
  PartialCandidateLocation,
  PartialCandidateRecord,
  ProvenanceRecord,
  SourceProfile,
  SourceType
} from '../types';

export type MergePolicy = 'weighted' | 'csv_resume_agreement';

export interface MergeOptions {
  policy?: MergePolicy;
  agreementSources?: SourceType[];
}

const DEFAULT_AGREEMENT_SOURCES: SourceType[] = ['csv', 'resume'];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhoneValue(phone: string) {
  return normalizePhone(phone).value ?? phone.replace(/\D/g, '');
}

function stableScalarKey(value: unknown) {
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return JSON.stringify(value);
}

function pickSourceProfile(profiles: SourceProfile[], source: SourceType) {
  return profiles.find((profile) => profile.source === source);
}

function buildAgreementProvenance(
  field: string,
  csvValue: unknown,
  resumeValue: unknown,
  conflicted: boolean,
  included: boolean,
  conflictReason?: string
): ProvenanceRecord[] {
  const agreementCount = included ? 2 : 1;
  return [
    {
      field,
      source: 'csv',
      method: 'merged',
      rawValue: csvValue,
      confidence: scoreField('csv', agreementCount, conflicted),
      conflicted: conflicted || undefined,
      conflictReason
    },
    {
      field,
      source: 'resume',
      method: 'merged',
      rawValue: resumeValue,
      confidence: scoreField('resume', agreementCount, conflicted),
      conflicted: conflicted || undefined,
      conflictReason
    }
  ];
}

function buildResumeProvenance(field: string, value: unknown): ProvenanceRecord[] {
  return [
    {
      field,
      source: 'resume',
      method: 'merged',
      rawValue: value,
      confidence: scoreField('resume', 1, false)
    }
  ];
}

function resolveAgreementScalar<T extends string | number>(
  field: string,
  csvValue: T | null | undefined,
  resumeValue: T | null | undefined,
  normalize: (value: T) => string = stableScalarKey as (value: T) => string
) {
  if (csvValue === null || csvValue === undefined || csvValue === '') {
    return { value: null, provenance: [], conflicted: false };
  }

  if (resumeValue === null || resumeValue === undefined || resumeValue === '') {
    return { value: null, provenance: [], conflicted: false };
  }

  const csvKey = normalize(csvValue);
  const resumeKey = normalize(resumeValue);

  if (csvKey !== resumeKey) {
    const reason = `Conflict: CSV has "${csvValue}" but Resume has "${resumeValue}"`;
    return {
      value: null,
      provenance: buildAgreementProvenance(field, csvValue, resumeValue, true, false, reason),
      conflicted: true
    };
  }

  return {
    value: csvValue,
    provenance: buildAgreementProvenance(field, csvValue, resumeValue, false, true),
    conflicted: false
  };
}

function resolveAgreementYearsExperience(
  csvProfile: PartialCandidateRecord,
  resumeProfile: PartialCandidateRecord
) {
  const csvYears = csvProfile.years_experience ?? null;
  if (csvYears === null) {
    return { value: null, provenance: [], conflicted: false };
  }

  const experiences = resumeProfile.experience ?? [];
  const calculatedMonths = totalExperienceMonths(experiences);
  const calculatedYears = calculateYearsExperienceFromMonths(experiences);
  const statedResumeYears = resumeProfile.years_experience ?? null;
  const resumeYearsForComparison = calculatedYears ?? statedResumeYears;

  if (resumeYearsForComparison === null) {
    return { value: null, provenance: [], conflicted: false };
  }

  if (csvYears !== resumeYearsForComparison) {
    const reason = `Conflict: CSV states ${csvYears} years of experience, but Resume states/calculates ${resumeYearsForComparison} years`;
    return {
      value: null,
      provenance: buildAgreementProvenance(
        'years_experience',
        csvYears,
        calculatedYears ?? statedResumeYears,
        true,
        false,
        reason
      ),
      conflicted: true
    };
  }

  if (
    calculatedYears !== null &&
    statedResumeYears !== null &&
    calculatedYears !== statedResumeYears
  ) {
    const reason = `Conflict: Resume stated experience (${statedResumeYears} years) disagrees with Resume calculated experience (${calculatedYears} years)`;
    return {
      value: null,
      provenance: buildAgreementProvenance(
        'years_experience',
        csvYears,
        { stated: statedResumeYears, calculated: calculatedYears, calculatedMonths },
        true,
        false,
        reason
      ),
      conflicted: true
    };
  }

  if (
    calculatedMonths > 0 &&
    !experienceMonthsIsPlausible(calculatedMonths, resumeProfile.education ?? [])
  ) {
    const reason = `Conflict: Resume experience history of ${calculatedYears ?? Math.floor(calculatedMonths / 12)} years is implausible given education timeline`;
    return {
      value: null,
      provenance: buildAgreementProvenance(
        'years_experience',
        csvYears,
        { years: resumeYearsForComparison, calculatedMonths },
        true,
        false,
        reason
      ),
      conflicted: true
    };
  }

  const monthsToValidate =
    calculatedMonths > 0 ? calculatedMonths : resumeYearsForComparison * 12;
  if (!experienceMonthsIsPlausible(monthsToValidate, resumeProfile.education ?? [])) {
    const reason = `Conflict: Resume experience history is implausible given education timeline`;
    return {
      value: null,
      provenance: buildAgreementProvenance(
        'years_experience',
        csvYears,
        { years: resumeYearsForComparison, calculatedMonths, monthsToValidate },
        true,
        false,
        reason
      ),
      conflicted: true
    };
  }

  return {
    value: csvYears,
    provenance: buildAgreementProvenance(
      'years_experience',
      csvYears,
      calculatedYears ?? statedResumeYears,
      false,
      true
    ),
    conflicted: false
  };
}

function resolveAgreementName(csvProfile: PartialCandidateRecord, resumeProfile: PartialCandidateRecord) {
  return resolveAgreementScalar(
    'full_name',
    csvProfile.full_name ?? null,
    resumeProfile.full_name ?? null,
    normalizeName
  );
}

function resolveAgreementHeadline(csvProfile: PartialCandidateRecord, resumeProfile: PartialCandidateRecord) {
  const resumeHeadline =
    resumeProfile.headline ??
    resumeProfile.experience?.[0]?.title ??
    null;
  const csvHeadline = csvProfile.headline ?? csvProfile.experience?.[0]?.title ?? null;

  return resolveAgreementScalar('headline', csvHeadline, resumeHeadline, (value) => value.trim().toLowerCase());
}

function locationHasValue(location: PartialCandidateLocation | null | undefined) {
  return Boolean(location?.city || location?.region || location?.country);
}

function resolveEnrichedLocation(
  csvProfile: PartialCandidateRecord,
  resumeProfile: PartialCandidateRecord,
  identityConfirmed: boolean
) {
  const csvHasLocation = locationHasValue(csvProfile.location);
  const resumeHasLocation = locationHasValue(resumeProfile.location);

  if (csvHasLocation && resumeHasLocation) {
    const csvCity = csvProfile.location?.city ?? null;
    const resumeCity = resumeProfile.location?.city ?? null;
    const city = resolveAgreementScalar('location.city', csvCity, resumeCity);

    const csvCountry = csvProfile.location?.country ?? null;
    const resumeCountry = resumeProfile.location?.country ?? null;
    const country = resolveAgreementScalar('location.country', csvCountry, resumeCountry);

    const csvRegion = csvProfile.location?.region ?? null;
    const resumeRegion = resumeProfile.location?.region ?? null;
    const region = resolveAgreementScalar('location.region', csvRegion, resumeRegion);

    if (!city.value && !country.value && !region.value) {
      return { value: null, provenance: [...city.provenance, ...region.provenance, ...country.provenance] };
    }

    return {
      value: {
        city: city.value,
        region: region.value,
        country: country.value
      },
      provenance: [...city.provenance, ...region.provenance, ...country.provenance]
    };
  }

  if (identityConfirmed && resumeHasLocation && resumeProfile.location) {
    return {
      value: resumeProfile.location,
      provenance: buildResumeProvenance('location', resumeProfile.location)
    };
  }

  if (csvHasLocation && csvProfile.location) {
    return {
      value: csvProfile.location,
      provenance: [
        {
          field: 'location',
          source: 'csv' as SourceType,
          method: 'merged' as const,
          rawValue: csvProfile.location,
          confidence: scoreField('csv', 1, false)
        }
      ]
    };
  }

  return { value: null, provenance: [] as ProvenanceRecord[] };
}

function mergeAgreementEmails(csvProfile: PartialCandidateRecord, resumeProfile: PartialCandidateRecord) {
  const csvEmails = csvProfile.emails ?? [];
  const resumeEmails = resumeProfile.emails ?? [];

  if (!csvEmails.length || !resumeEmails.length) {
    return { values: [] as string[], provenance: [] as ProvenanceRecord[], conflicted: false };
  }

  const resumeSet = new Set(resumeEmails.map(normalizeEmail));
  const shared = csvEmails.filter((email) => resumeSet.has(normalizeEmail(email)));

  if (!shared.length) {
    const reason = `Conflict: CSV email "${csvEmails[0]}" disagrees with Resume email "${resumeEmails[0]}"`;
    return {
      values: [],
      provenance: buildAgreementProvenance('emails', csvEmails[0], resumeEmails[0], true, false, reason),
      conflicted: true
    };
  }

  return {
    values: shared,
    provenance: shared.flatMap((email) => buildAgreementProvenance(`emails[${email}]`, email, email, false, true)),
    conflicted: false
  };
}

function mergeEnrichedPhones(
  csvProfile: PartialCandidateRecord,
  resumeProfile: PartialCandidateRecord,
  identityConfirmed: boolean
) {
  const csvPhones = csvProfile.phones ?? [];
  const resumePhones = resumeProfile.phones ?? [];

  if (csvPhones.length && resumePhones.length) {
    const resumeSet = new Set(resumePhones.map(normalizePhoneValue));
    const shared = csvPhones.filter((phone) => resumeSet.has(normalizePhoneValue(phone)));

    if (!shared.length) {
      const reason = `Conflict: CSV phone "${csvPhones[0]}" disagrees with Resume phone "${resumePhones[0]}"`;
      return {
        values: [] as string[],
        provenance: buildAgreementProvenance('phones', csvPhones[0], resumePhones[0], true, false, reason),
        conflicted: true
      };
    }

    return {
      values: shared,
      provenance: shared.flatMap((phone) =>
        buildAgreementProvenance(`phones[${phone}]`, phone, phone, false, true)
      ),
      conflicted: false
    };
  }

  if (identityConfirmed && resumePhones.length) {
    return {
      values: resumePhones,
      provenance: resumePhones.flatMap((phone) => buildResumeProvenance(`phones[${phone}]`, phone)),
      conflicted: false
    };
  }

  if (csvPhones.length) {
    return {
      values: csvPhones,
      provenance: csvPhones.map((phone) => ({
        field: `phones[${phone}]`,
        source: 'csv' as SourceType,
        method: 'merged' as const,
        rawValue: phone,
        confidence: scoreField('csv', 1, false)
      })),
      conflicted: false
    };
  }

  return { values: [] as string[], provenance: [] as ProvenanceRecord[], conflicted: false };
}

function enrichExperienceFromResume(
  resumeProfile: PartialCandidateRecord,
  identityConfirmed: boolean
): CandidateExperience[] {
  if (!identityConfirmed) {
    return [];
  }

  return (resumeProfile.experience ?? []).map((entry) => ({ ...entry }));
}

function enrichEducationFromResume(
  resumeProfile: PartialCandidateRecord,
  identityConfirmed: boolean
): CandidateEducation[] {
  if (!identityConfirmed) {
    return [];
  }

  return (resumeProfile.education ?? []).map((entry) => ({ ...entry }));
}

export function mergeWithCsvResumeAgreement(profiles: SourceProfile[]) {
  const csvProfile = pickSourceProfile(profiles, 'csv')?.profile;
  const resumeProfile = pickSourceProfile(profiles, 'resume')?.profile;

  if (!csvProfile || !resumeProfile) {
    return null;
  }

  const emails = mergeAgreementEmails(csvProfile, resumeProfile);
  const identityConfirmed = emails.values.length > 0;

  const name = resolveAgreementName(csvProfile, resumeProfile);
  const headline = resolveAgreementHeadline(csvProfile, resumeProfile);
  const yearsExperience = resolveAgreementYearsExperience(csvProfile, resumeProfile);
  const location = resolveEnrichedLocation(csvProfile, resumeProfile, identityConfirmed);
  const phones = mergeEnrichedPhones(csvProfile, resumeProfile, identityConfirmed);
  const experience = enrichExperienceFromResume(resumeProfile, identityConfirmed);
  const education = enrichEducationFromResume(resumeProfile, identityConfirmed);

  return {
    full_name: name.value,
    headline: headline.value,
    years_experience: yearsExperience.value,
    location: location.value,
    emails: emails.values,
    phones: phones.values,
    experience,
    education,
    identityConfirmed,
    provenance: [
      ...name.provenance,
      ...headline.provenance,
      ...yearsExperience.provenance,
      ...location.provenance,
      ...emails.provenance,
      ...phones.provenance
    ]
  };
}

export { DEFAULT_AGREEMENT_SOURCES };
