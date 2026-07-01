import { describe, expect, it } from 'vitest';
import { extractAllFromCSV } from '@back/pipeline/extractors/csv';

const MULTI_ROW_CSV = `name,email,phone,current_company,title,location,linkedin_url,github_url,resume_path
Arjun Sharma,arjun.sharma@gmail.com,9876543210,Infosys,Senior Software Engineer,"Bengaluru, Karnataka, India",https://linkedin.com/in/arjunsharma,https://github.com/arjunsharma,resume_sample.txt
Aditi Verma,aditi.verma@gmail.com,9998889988,TCS,Product Manager,"Mumbai, Maharashtra, India",https://linkedin.com/in/aditiverma,https://github.com/aditiverma,aditi_verma.txt`;

describe('CSV extractor', () => {
  it('extracts mapped fields from the first row', () => {
    const record = extractAllFromCSV(MULTI_ROW_CSV)[0];

    expect(record?.full_name).toBe('Arjun Sharma');
    expect(record?.emails).toEqual(['arjun.sharma@gmail.com']);
    expect(record?.phones).toEqual(['9876543210']);
    expect(record?.resume_ref).toBe('resume_sample.txt');
    expect(record?.years_experience).toBeUndefined();
  });

  it('extracts all rows from a multi-candidate CSV', () => {
    const records = extractAllFromCSV(MULTI_ROW_CSV);

    expect(records).toHaveLength(2);
    expect(records[1]?.full_name).toBe('Aditi Verma');
    expect(records[1]?.resume_ref).toBe('aditi_verma.txt');
  });

  it('returns an empty list for malformed input', () => {
    expect(extractAllFromCSV('name,"unterminated')).toEqual([]);
  });
});
