import { describe, expect, it } from 'vitest';
import { extractFromNotes } from '@back/pipeline/extractors/notes';

describe('notes extractor', () => {
  it('extracts emails, phones, skills, and a headline from free text', () => {
    const record = extractFromNotes(`
Spoke with Arjun on June 15. Strong communicator, very clear on distributed systems.
Mentioned interest in ML/AI infrastructure — seemed genuine.
Has worked with Kafka and Redis in production but not on resume.
Might be open to relocation. Salary expectation around 25-30 LPA.
GitHub: github.com/arjunsharma — has some open source contributions.
Email arjun.sharma@gmail.com, phone +91 98765 43210.
    `);

    expect(record.emails).toEqual(['arjun.sharma@gmail.com']);
    expect(record.phones).toEqual(['+91 98765 43210']);
    expect(record.skills?.map((skill) => skill.name).sort()).toEqual(['Kafka', 'Machine Learning', 'Redis'].sort());
    expect(record.headline).toBe('Spoke with Arjun on June 15');
  });
});