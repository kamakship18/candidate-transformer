import { describe, expect, it } from 'vitest';
import { extractFromLinkedIn } from '@back/pipeline/extractors/linkedin';

const SAMPLE_LINKEDIN = {
  firstName: 'Arjun',
  lastName: 'Sharma',
  headline: 'Senior Backend Engineer | Distributed Systems | Cloud',
  location: { city: 'Bengaluru', country: 'India' },
  positions: [
    {
      title: 'Senior Software Engineer',
      companyName: 'Infosys',
      startDate: { year: 2021, month: 6 },
      endDate: null,
      description: 'Leading backend architecture for a fintech platform'
    }
  ],
  educations: [
    {
      schoolName: 'National Institute of Technology, Trichy',
      degreeName: 'B.Tech',
      fieldOfStudy: 'Computer Science',
      endDate: { year: 2018 }
    }
  ],
  skills: ['Java', 'Python', 'Kubernetes', 'AWS']
};

describe('LinkedIn extractor', () => {
  it('extracts canonical partial data from exported LinkedIn JSON', () => {
    const record = extractFromLinkedIn(SAMPLE_LINKEDIN);

    expect(record.full_name).toBe('Arjun Sharma');
    expect(record.headline).toBe('Senior Backend Engineer | Distributed Systems | Cloud');
    expect(record.location).toEqual({ city: 'Bengaluru', region: null, country: 'India' });
    expect(record.experience).toEqual([
      {
        company: 'Infosys',
        title: 'Senior Software Engineer',
        start: '2021-06',
        end: null,
        summary: 'Leading backend architecture for a fintech platform'
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
    expect(record.skills).toHaveLength(4);
  });

  it('returns an empty record for malformed JSON', () => {
    expect(extractFromLinkedIn('{bad json')).toEqual({});
  });
});