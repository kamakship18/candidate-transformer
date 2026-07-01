import { canonicalizeSkill } from '../normalizers/skills';
import { computeOverallConfidence } from '../scorer';
import { mergeWithCsvResumeAgreement, type MergeOptions } from './agreement';
import { resolveConflict, scoreField } from './conflict';
import { SOURCE_WEIGHTS } from '../constants';
import type {
  CandidateEducation,
  CandidateExperience,
  CandidateRecord,
  CandidateSkill,
  PartialCandidateRecord,
  ProvenanceRecord,
  SourceProfile,
  SourceType
} from '../types';

function createCandidateId(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return `candidate-${hash.toString(36)}`;
}

function uniqueSources(profiles: SourceProfile[]) {
  return Array.from(new Set(profiles.map((profile) => profile.source))).sort();
}

function isTruthyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function stableArrayKey(value: CandidateExperience | CandidateEducation) {
  return JSON.stringify(value).toLowerCase();
}

function mergeEmails(field: 'emails' | 'phones', profiles: SourceProfile[]) {
  const entries = new Map<string, { value: string; sources: SourceType[] }>();

  for (const profile of profiles) {
    const values = profile.profile[field] ?? [];
    for (const rawValue of values) {
      const value = rawValue.trim();
      if (!value) {
        continue;
      }

      const key = field === 'emails' ? value.toLowerCase() : value;
      const existing = entries.get(key);
      if (existing) {
        existing.sources.push(profile.source);
      } else {
        entries.set(key, { value, sources: [profile.source] });
      }
    }
  }

  const provenance: ProvenanceRecord[] = [];
  const values = Array.from(entries.values())
    .sort((left, right) => left.value.localeCompare(right.value))
    .map((entry) => {
      const agreementCount = entry.sources.length;
      for (const source of entry.sources) {
        provenance.push({
          field: field === 'emails' ? `emails[${entry.value}]` : `phones[${entry.value}]`,
          source,
          method: 'merged',
          rawValue: entry.value,
          confidence: scoreField(source, agreementCount, false),
          conflicted: undefined
        });
      }

      return entry.value;
    });

  return { values, provenance };
}

function mergeScalarField<T extends string | number | boolean>(
  field: string,
  profiles: SourceProfile[],
  getter: (profile: PartialCandidateRecord) => T | null | undefined
) {
  const candidates = profiles.flatMap((profile) => {
    const value = getter(profile.profile);
    if (value === null || value === undefined || value === '') {
      return [];
    }

    return [{ source: profile.source, value }];
  });

  return resolveConflict(field, candidates);
}

function mergeLocation(profiles: SourceProfile[]) {
  const city = mergeScalarField('location.city', profiles, (profile) => profile.location?.city ?? null);
  const region = mergeScalarField('location.region', profiles, (profile) => profile.location?.region ?? null);
  const country = mergeScalarField('location.country', profiles, (profile) => profile.location?.country ?? null);

  const locationValues = {
    city: city.value ?? null,
    region: region.value ?? null,
    country: country.value ?? null
  };

  if (!locationValues.city && !locationValues.region && !locationValues.country) {
    return { value: null, provenance: [...city.provenance, ...region.provenance, ...country.provenance] };
  }

  return {
    value: locationValues,
    provenance: [...city.provenance, ...region.provenance, ...country.provenance]
  };
}

function mergeLinks(profiles: SourceProfile[]) {
  const result: CandidateRecord['links'] = {};

  for (const profile of profiles) {
    const links = profile.profile.links;
    if (!links) {
      continue;
    }

    if (!result.linkedin && isTruthyString(links.linkedin)) {
      result.linkedin = links.linkedin;
    }

    if (!result.github && isTruthyString(links.github)) {
      result.github = links.github;
    }

    if (!result.portfolio && isTruthyString(links.portfolio)) {
      result.portfolio = links.portfolio;
    }

    if (links.other?.length) {
      result.other = Array.from(new Set([...(result.other ?? []), ...links.other.filter(isTruthyString)]));
    }
  }

  return result;
}

function mergeSkills(profiles: SourceProfile[]) {
  const entries = new Map<string, { skill: CandidateSkill; sources: SourceType[] }>();

  for (const profile of profiles) {
    for (const skill of profile.profile.skills ?? []) {
      const canonicalName = canonicalizeSkill(skill.name).value ?? skill.name.trim();
      if (!canonicalName) {
        continue;
      }

      const key = canonicalName.toLowerCase();
      const existing = entries.get(key);
      if (existing) {
        existing.sources.push(...skill.sources, profile.source);
      } else {
        entries.set(key, {
          skill: { name: canonicalName, confidence: skill.confidence, sources: Array.from(new Set([...skill.sources, profile.source])) },
          sources: [profile.source, ...skill.sources]
        });
      }
    }
  }

  return Array.from(entries.values())
    .map((entry) => {
      const uniqueSourcesList = Array.from(new Set(entry.sources)).sort();
      const bestSource = uniqueSourcesList.sort().reduce<SourceType>((best, source) => {
        return SOURCE_WEIGHTS[source] > SOURCE_WEIGHTS[best] ? source : best;
      }, uniqueSourcesList[0]);

      return {
        name: entry.skill.name,
        confidence: scoreField(bestSource, uniqueSourcesList.length, false),
        sources: uniqueSourcesList
      } satisfies CandidateSkill;
    })
    .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name));
}

function mergeExperience(profiles: SourceProfile[]) {
  const entries = new Map<string, { item: CandidateExperience; sources: SourceType[] }>();

  for (const profile of profiles) {
    for (const experience of profile.profile.experience ?? []) {
      const key = stableArrayKey(experience);
      const existing = entries.get(key);
      if (existing) {
        existing.sources.push(profile.source);
        existing.item.summary = existing.item.summary ?? experience.summary;
      } else {
        entries.set(key, {
          item: { ...experience },
          sources: [profile.source]
        });
      }
    }
  }

  return Array.from(entries.values())
    .map((entry) => entry.item)
    .sort((left, right) => left.company.localeCompare(right.company) || left.title.localeCompare(right.title));
}

function mergeEducation(profiles: SourceProfile[]) {
  const entries = new Map<string, { item: CandidateEducation; sources: SourceType[] }>();

  for (const profile of profiles) {
    for (const education of profile.profile.education ?? []) {
      const key = stableArrayKey(education);
      const existing = entries.get(key);
      if (existing) {
        existing.sources.push(profile.source);
      } else {
        entries.set(key, {
          item: { ...education },
          sources: [profile.source]
        });
      }
    }
  }

  return Array.from(entries.values())
    .map((entry) => entry.item)
    .sort((left, right) => left.institution.localeCompare(right.institution));
}

export function mergePartialProfiles(profiles: SourceProfile[], options: MergeOptions = {}): CandidateRecord {
  const policy = options.policy ?? 'csv_resume_agreement';

  if (policy === 'csv_resume_agreement') {
    return mergeWithAgreementPolicy(profiles);
  }

  return mergeWithWeightedPolicy(profiles);
}

function mergeWithAgreementPolicy(profiles: SourceProfile[]): CandidateRecord {
  const sortedProfiles = [...profiles].sort((left, right) => left.source.localeCompare(right.source));
  const sourcesAttempted = uniqueSources(sortedProfiles);
  const sourcesSucceeded = sortedProfiles
    .filter((profile) => Object.keys(profile.profile).length > 0)
    .map((profile) => profile.source)
    .sort();

  const agreement = mergeWithCsvResumeAgreement(sortedProfiles);
  const links = mergeLinks(sortedProfiles);

  const skills = mergeAgreementSkills(sortedProfiles);
  const provenance = [...(agreement?.provenance ?? [])];

  for (const skill of skills) {
    provenance.push({
      field: `skills.${skill.name}`,
      source: skill.sources[0] ?? 'resume',
      method: 'merged',
      rawValue: skill.name,
      confidence: skill.confidence,
      conflicted: undefined
    });
  }

  for (const item of agreement?.experience ?? []) {
    provenance.push({
      field: `experience.${item.company}.${item.title}`,
      source: 'resume',
      method: 'merged',
      rawValue: item,
      confidence: scoreField('resume', 1, false)
    });
  }

  for (const item of agreement?.education ?? []) {
    provenance.push({
      field: `education.${item.institution}`,
      source: 'resume',
      method: 'merged',
      rawValue: item,
      confidence: scoreField('resume', 1, false)
    });
  }

  const merged: CandidateRecord = {
    candidate_id: createCandidateId(
      JSON.stringify({ sourcesAttempted, name: agreement?.full_name, emails: agreement?.emails ?? [] })
    ),
    full_name: agreement?.full_name ?? null,
    emails: agreement?.emails ?? [],
    phones: agreement?.phones ?? [],
    location: agreement?.location
      ? {
          city: agreement.location.city ?? null,
          region: agreement.location.region ?? null,
          country: agreement.location.country ?? null
        }
      : null,
    links,
    headline: agreement?.headline ?? null,
    years_experience:
      agreement?.years_experience === null || agreement?.years_experience === undefined
        ? null
        : Number(agreement.years_experience),
    skills,
    experience: agreement?.experience ?? [],
    education: agreement?.education ?? [],
    provenance,
    overall_confidence: 0,
    pipeline_meta: {
      processed_at: new Date().toISOString(),
      sources_attempted: sourcesAttempted,
      sources_succeeded: sourcesSucceeded,
      errors: []
    }
  };

  merged.overall_confidence = computeOverallConfidence(merged);
  return merged;
}

function mergeAgreementSkills(profiles: SourceProfile[]) {
  const csvProfile = profiles.find((profile) => profile.source === 'csv')?.profile;
  const resumeProfile = profiles.find((profile) => profile.source === 'resume')?.profile;

  if (!csvProfile || !resumeProfile) {
    return [];
  }

  const csvEmails = csvProfile.emails ?? [];
  const resumeEmails = resumeProfile.emails ?? [];
  if (!csvEmails.length || !resumeEmails.length) {
    return [];
  }

  const resumeSet = new Set(resumeEmails.map((email) => email.trim().toLowerCase()));
  const identityConfirmed = csvEmails.some((email) => resumeSet.has(email.trim().toLowerCase()));
  if (!identityConfirmed || !resumeProfile.skills?.length) {
    return [];
  }

  return resumeProfile.skills.map((skill) => ({
    name: canonicalizeSkill(skill.name).value ?? skill.name,
    confidence: scoreField('resume', 1, false),
    sources: ['resume'] as SourceType[]
  }));
}

function mergeWithWeightedPolicy(profiles: SourceProfile[]): CandidateRecord {
  const sortedProfiles = [...profiles].sort((left, right) => left.source.localeCompare(right.source));
  const sourcesAttempted = uniqueSources(sortedProfiles);
  const sourcesSucceeded = sortedProfiles
    .filter((profile) => Object.keys(profile.profile).length > 0)
    .map((profile) => profile.source)
    .sort();

  const name = mergeScalarField('full_name', sortedProfiles, (profile) => profile.full_name ?? null);
  const headline = mergeScalarField('headline', sortedProfiles, (profile) => profile.headline ?? null);
  const yearsExperience = mergeScalarField('years_experience', sortedProfiles, (profile) => profile.years_experience ?? null);
  const location = mergeLocation(sortedProfiles);
  const links = mergeLinks(sortedProfiles);
  const emails = mergeEmails('emails', sortedProfiles);
  const phones = mergeEmails('phones', sortedProfiles);
  const skills = mergeSkills(sortedProfiles);
  const experience = mergeExperience(sortedProfiles);
  const education = mergeEducation(sortedProfiles);

  const provenance = [
    ...name.provenance,
    ...headline.provenance,
    ...yearsExperience.provenance,
    ...location.provenance,
    ...emails.provenance,
    ...phones.provenance
  ];

  for (const skill of skills) {
    provenance.push({
      field: `skills.${skill.name}`,
      source: skill.sources[0] ?? 'notes',
      method: 'merged',
      rawValue: skill.name,
      confidence: skill.confidence,
      conflicted: skill.sources.length > 1 ? true : undefined
    });
  }

  for (const item of experience) {
    provenance.push({
      field: `experience.${item.company}.${item.title}`,
      source: sortedProfiles[0]?.source ?? 'csv',
      method: 'merged',
      rawValue: item,
      confidence: 0.7
    });
  }

  for (const item of education) {
    provenance.push({
      field: `education.${item.institution}`,
      source: sortedProfiles[0]?.source ?? 'csv',
      method: 'merged',
      rawValue: item,
      confidence: 0.7
    });
  }

  const merged: CandidateRecord = {
    candidate_id: createCandidateId(JSON.stringify({ sourcesAttempted, name: name.value, emails: emails.values })),
    full_name: name.value ?? null,
    emails: emails.values,
    phones: phones.values,
    location: location.value,
    links,
    headline: headline.value ?? null,
    years_experience: yearsExperience.value === null || yearsExperience.value === undefined ? null : Number(yearsExperience.value),
    skills,
    experience,
    education,
    provenance,
    overall_confidence: 0,
    pipeline_meta: {
      processed_at: new Date().toISOString(),
      sources_attempted: sourcesAttempted,
      sources_succeeded: sourcesSucceeded,
      errors: []
    }
  };

  merged.overall_confidence = computeOverallConfidence(merged);
  return merged;
}