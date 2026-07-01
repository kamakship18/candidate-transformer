import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractAllFromCSV } from '@back/pipeline/extractors/csv';
import { extractFromResume } from '@back/pipeline/extractors/resume';
import { runPipeline, DEFAULT_OUTPUT_CONFIG } from '@back/pipeline/runner';

const BASE = path.resolve(process.cwd(), 'test_data_v3');

function loadV3Pipeline(resumeNames: string[]) {
  const csv = readFileSync(`${BASE}/recruiter.csv`, 'utf8');
  const csvFile = new File([csv], 'recruiter.csv', { type: 'text/csv' });
  const resumeFiles = resumeNames.map((name) => {
    const text = readFileSync(`${BASE}/resumes/${name}.txt`, 'utf8');
    return new File([text], `${name}.txt`, { type: 'text/plain' });
  });

  return runPipeline({ csv: [csvFile], resume: resumeFiles }, DEFAULT_OUTPUT_CONFIG);
}

describe('external test_data_v3 agreement merge', () => {
  it('extracts skills, experience, and education from v3 resume format', async () => {
    const karthikResume = readFileSync(`${BASE}/resumes/karthik_reddy.txt`, 'utf8');
    const record = await extractFromResume(karthikResume);

    expect(record.skills?.map((skill) => skill.name).sort()).toEqual(
      ['Java', 'Kafka', 'Microservices', 'System Design'].sort()
    );
    expect(record.experience).toEqual([
      expect.objectContaining({
        company: 'Zoho',
        title: 'Principal Engineer',
        start: '2022-01',
        end: null
      })
    ]);
    expect(record.education).toEqual([
      expect.objectContaining({ institution: 'Anna University', end_year: 2018 })
    ]);
    expect(record.location).toEqual({
      city: 'Chennai',
      region: null,
      country: 'India'
    });
  });

  it('enriches matched candidates with resume skills, experience, and education', async () => {
    const result = await loadV3Pipeline([
      'karthik_reddy',
      'sunita_rao',
      'lakshmi_menon',
      'imran_patel',
      'bhavna_iyer',
      'deepak_nair'
    ]);

    const karthik = result.candidates.find((candidate) =>
      candidate.emails.some((email) => email.includes('karthik'))
    );
    const bhavna = result.candidates.find((candidate) =>
      candidate.emails.some((email) => email.includes('bhavna'))
    );

    expect(karthik?.skills.length).toBeGreaterThan(0);
    expect(karthik?.experience.length).toBeGreaterThan(0);
    expect(karthik?.education.length).toBeGreaterThan(0);
    expect(karthik?.location?.city).toBe('Chennai');
    expect(karthik?.headline).toBeNull();
    expect(karthik?.years_experience).toBeNull();

    expect(bhavna?.phones.length).toBeGreaterThan(0);
    expect(bhavna?.phones[0]).not.toBe('NULL');
  });

  it('only outputs years_experience when csv and resume agree and are plausible', async () => {
    const csv = readFileSync(`${BASE}/recruiter.csv`, 'utf8');
    const lakshmiResume = readFileSync(`${BASE}/resumes/lakshmi_menon.txt`, 'utf8');

    const lakshmiCsv = extractAllFromCSV(csv).find((row) => row.emails?.[0]?.includes('lakshmi'));
    const lakshmiPartial = await extractFromResume(lakshmiResume);

    expect(lakshmiCsv?.years_experience).toBe(6);
    expect(lakshmiPartial.years_experience).not.toBe(6);
    expect(lakshmiPartial.years_experience).toBeLessThanOrEqual(3);

    const result = await loadV3Pipeline(['karthik_reddy', 'lakshmi_menon']);
    const lakshmi = result.candidates.find((candidate) =>
      candidate.emails.some((email) => email.includes('lakshmi'))
    );
    const karthik = result.candidates.find((candidate) =>
      candidate.emails.some((email) => email.includes('karthik'))
    );

    expect(lakshmi?.years_experience).toBeNull();
    expect(lakshmi?.skills.length).toBeGreaterThan(0);
    expect(lakshmi?.experience.length).toBeGreaterThan(0);
    expect(lakshmi?.education.length).toBeGreaterThan(0);
    expect(karthik?.years_experience).toBeNull();
    expect(lakshmi?.emails[0]).toContain('lakshmi.menon@gmail.com');
    expect(result.profile.years_experience).toBeUndefined();
  });
});
