import { describe, expect, it } from 'vitest';
import { mergePartialProfiles } from '@back/pipeline/merger';
import { makeSourceProfile } from './fixtures/source_profile';

describe('merger', () => {
  const weighted = { policy: 'weighted' as const };

  it('boosts confidence when two sources agree on the same scalar value', () => {
    const profiles = [
      makeSourceProfile('csv', { full_name: 'Arjun Sharma' }),
      makeSourceProfile('linkedin', { full_name: 'Arjun Sharma' }),
    ];

    const merged = mergePartialProfiles(profiles, weighted);
    const nameProvenance = merged.provenance.filter((entry) => entry.field === 'full_name');

    expect(merged.full_name).toBe('Arjun Sharma');
    expect(nameProvenance).toHaveLength(2);
    expect(nameProvenance.every((entry) => entry.confidence > 0.85)).toBe(true);
  });

  it('marks scalar conflicts explicitly and keeps the higher-weight source value', () => {
    const merged = mergePartialProfiles(
      [
        makeSourceProfile('csv', { full_name: 'Arjun S.' }),
        makeSourceProfile('ats_json', { full_name: 'Arjun Sharma' }),
      ],
      weighted
    );

    const nameProvenance = merged.provenance.filter((entry) => entry.field === 'full_name');

    expect(merged.full_name).toBe('Arjun Sharma');
    expect(nameProvenance.some((entry) => entry.conflicted)).toBe(true);
    expect(nameProvenance[0].conflictReason).toBe('Conflict: sources disagree. ats_json has "Arjun Sharma", csv has "Arjun S."');
  });

  it('requires csv and resume agreement before emitting years_experience', () => {
    const merged = mergePartialProfiles([
      makeSourceProfile('csv', { years_experience: 6, emails: ['a@example.com'] }),
      makeSourceProfile('resume', { years_experience: 6, emails: ['a@example.com'], education: [{ institution: 'MIT', degree: null, field: null, end_year: 2023 }] }),
    ]);

    expect(merged.years_experience).toBeNull();
    expect(merged.emails).toEqual(['a@example.com']);
  });

  it('omits years_experience when csv and resume values conflict', () => {
    const merged = mergePartialProfiles([
      makeSourceProfile('csv', { years_experience: 6, emails: ['a@example.com'] }),
      makeSourceProfile('resume', { years_experience: 4, emails: ['a@example.com'] }),
    ]);

    expect(merged.years_experience).toBeNull();
    const expProvenance = merged.provenance.filter((entry) => entry.field === 'years_experience');
    expect(expProvenance.some((entry) => entry.conflicted)).toBe(true);
    expect(expProvenance[0].conflictReason).toBe('Conflict: CSV states 6 years of experience, but Resume states/calculates 4 years');
  });

  it('enriches skills and experience from resume when identity is confirmed via email', () => {
    const merged = mergePartialProfiles([
      makeSourceProfile('csv', {
        full_name: 'Karthik Reddy',
        emails: ['karthik.reddy@gmail.com'],
        experience: [{ company: 'Zoho', title: 'Senior Engineer', start: null, end: null, summary: null }]
      }),
      makeSourceProfile('resume', {
        full_name: 'Karthik Reddy',
        emails: ['karthik.reddy@gmail.com'],
        skills: [{ name: 'Java', confidence: 0.75, sources: ['resume'] }],
        experience: [{ company: 'Zoho', title: 'Principal Engineer', start: null, end: null, summary: null }],
        education: [{ institution: 'Anna University', degree: 'B.E.', field: 'CS', end_year: 2018 }]
      })
    ]);

    expect(merged.skills.map((skill) => skill.name)).toEqual(['Java']);
    expect(merged.experience).toHaveLength(1);
    expect(merged.experience[0]?.title).toBe('Principal Engineer');
    expect(merged.education).toHaveLength(1);
    expect(merged.headline).toBeNull();
  });
});
