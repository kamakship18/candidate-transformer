import { describe, expect, it } from 'vitest';
import { extractFromATS } from '@back/pipeline/extractors/ats_json';
import { ATS_WITH_UNKNOWN_FIELDS, SAMPLE_ATS } from './fixtures/sample_ats';

describe('ATS extractor', () => {
  it('maps known ATS aliases to the canonical partial profile', () => {
    const record = extractFromATS(SAMPLE_ATS);

    expect(record.full_name).toBe('Arjun Sharma');
    expect(record.emails).toEqual(['arjun.sharma@gmail.com']);
    expect(record.phones).toEqual(['+91-98765-43210']);
    expect(record.headline).toBe('Backend engineer with 6 years building distributed systems');
    expect(record.years_experience).toBe(6);
    expect(record.location).toEqual({ city: 'Bangalore', region: null, country: 'India' });
    expect(record.experience).toEqual([
      {
        company: 'Infosys',
        title: 'Sr. Software Engineer',
        start: null,
        end: null,
        summary: null
      }
    ]);
    expect(record.education).toEqual([
      {
        institution: 'National Institute of Technology, Trichy',
        degree: 'B.Tech',
        field: 'Computer Science',
        end_year: 2018
      }
    ]);
    expect(record.skills).toHaveLength(5);
  });

  it('supports nested location objects and education arrays', () => {
    const record = extractFromATS({
      applicant_name: 'Jane Doe',
      location: { city: 'Austin', state: 'Texas', country: 'United States' },
      educations: [
        {
          schoolName: 'MIT',
          degreeName: 'M.S.',
          fieldOfStudy: 'Computer Science',
          endDate: { year: 2020 }
        }
      ]
    });

    expect(record.location).toEqual({
      city: 'Austin',
      region: 'Texas',
      country: 'United States'
    });
    expect(record.education).toEqual([
      {
        institution: 'MIT',
        degree: 'M.S.',
        field: 'Computer Science',
        end_year: 2020
      }
    ]);
  });

  it('parses comma-separated location strings and string graduation years', () => {
    const record = extractFromATS({
      applicant_name: 'Jane Doe',
      location: 'Seattle, Washington, United States',
      school_name: 'UW',
      degree: 'B.S.',
      education_end_year: '2019'
    });

    expect(record.location).toEqual({
      city: 'Seattle',
      region: 'Washington',
      country: 'United States'
    });
    expect(record.education?.[0]?.end_year).toBe(2019);
  });

  it('returns an empty record for unknown field names', () => {
    expect(extractFromATS(ATS_WITH_UNKNOWN_FIELDS)).toEqual({});
  });

  it('returns an empty record for malformed JSON', () => {
    expect(extractFromATS('{bad json')).toEqual({});
  });
});
