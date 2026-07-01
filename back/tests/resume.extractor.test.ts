import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractFromResume } from '@back/pipeline/extractors/resume';
import { SAMPLE_RESUME } from './fixtures/resume_sample';

describe('resume extractor', () => {
  it('extracts fields from a PDF resume', async () => {
    const filePath = fileURLToPath(new URL('./fixtures/resume_sample.pdf', import.meta.url));
    const bytes = readFileSync(filePath);
    const record = await extractFromResume(bytes);

    expect(record.full_name).toBe('Arjun Sharma');
    expect(record.emails).toEqual(['arjun.sharma@gmail.com']);
    expect(record.phones).toEqual(['+91 98765 43210']);
    expect(record.headline).toBe('Senior Backend Engineer');
    expect(record.location).toEqual({
      city: 'Bengaluru',
      region: null,
      country: 'India'
    });
    expect(record.skills?.map((skill) => skill.name).sort()).toEqual(['AWS', 'Java', 'Kafka', 'Python', 'Redis', 'Spring Boot'].sort());
  });

  it('extracts education from resume text sections', async () => {
    const record = await extractFromResume(SAMPLE_RESUME);

    expect(record.education).toEqual([
      {
        institution: 'National Institute of Technology, Trichy',
        degree: 'B.Tech',
        field: 'Computer Science',
        end_year: 2018
      }
    ]);
  });

  it('extracts v3-style stacked contact blocks and skills sections', async () => {
    const record = await extractFromResume(`Karthik Reddy
karthik.reddy@gmail.com
9876600001
Chennai, India

PROFILE
Software professional with experience in backend systems.

EXPERIENCE
Zoho - Principal Engineer
January 2022 - Present

EDUCATION
Anna University - B.E. Computer Science
2018

SKILLS
Java, Microservices, Kafka, System Design`);

    expect(record.location).toEqual({
      city: 'Chennai',
      region: null,
      country: 'India'
    });
    expect(record.skills?.map((skill) => skill.name).sort()).toEqual(
      ['Java', 'Kafka', 'Microservices', 'System Design'].sort()
    );
    expect(record.experience?.[0]).toEqual(
      expect.objectContaining({
        company: 'Zoho',
        title: 'Principal Engineer',
        start: '2022-01',
        end: null
      })
    );
  });
});
