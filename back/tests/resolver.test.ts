import { describe, it, expect } from 'vitest';
import { resolveDotPath } from '@back/pipeline/projector/resolver';

const sampleRecord = {
  full_name: 'Jane Doe',
  emails: ['jane@example.com', 'jane@work.com'],
  phones: ['+14155550000'],
  skills: [
    { name: 'Python', confidence: 0.95, sources: ['csv'] },
    { name: 'AWS',    confidence: 0.80, sources: ['ats_json', 'github'] },
  ],
  location: { city: 'San Francisco', region: 'CA', country: 'US' },
  experience: [
    { company: 'Acme', title: 'SWE', start: '2020-01', end: null, summary: null },
  ],
  overall_confidence: 0.87,
  links: { github: 'https://github.com/janedoe' },
};

describe('resolveDotPath', () => {
  describe('scalar fields', () => {
    it('returns top-level scalar', () => {
      expect(resolveDotPath(sampleRecord, 'full_name')).toBe('Jane Doe');
    });

    it('returns number field', () => {
      expect(resolveDotPath(sampleRecord, 'overall_confidence')).toBe(0.87);
    });

    it('returns undefined for missing field', () => {
      expect(resolveDotPath(sampleRecord, 'nonexistent')).toBeUndefined();
    });

    it('returns undefined for empty path', () => {
      expect(resolveDotPath(sampleRecord, '')).toBeUndefined();
    });
  });

  describe('nested object paths', () => {
    it('resolves one level deep', () => {
      expect(resolveDotPath(sampleRecord, 'location.city')).toBe('San Francisco');
    });

    it('resolves country code', () => {
      expect(resolveDotPath(sampleRecord, 'location.country')).toBe('US');
    });

    it('returns undefined for missing nested key', () => {
      expect(resolveDotPath(sampleRecord, 'location.zip')).toBeUndefined();
    });

    it('returns undefined when parent is null', () => {
      const r = { ...sampleRecord, location: null };
      expect(resolveDotPath(r as unknown as Record<string, unknown>, 'location.city')).toBeUndefined();
    });
  });

  describe('array index access', () => {
    it('returns first email', () => {
      expect(resolveDotPath(sampleRecord, 'emails[0]')).toBe('jane@example.com');
    });

    it('returns second email', () => {
      expect(resolveDotPath(sampleRecord, 'emails[1]')).toBe('jane@work.com');
    });

    it('returns undefined for out-of-bounds index', () => {
      expect(resolveDotPath(sampleRecord, 'emails[99]')).toBeUndefined();
    });

    it('resolves nested field of indexed element', () => {
      expect(resolveDotPath(sampleRecord, 'experience[0].company')).toBe('Acme');
    });

    it('resolves nested field two levels deep', () => {
      expect(resolveDotPath(sampleRecord, 'skills[0].name')).toBe('Python');
    });
  });

  describe('spread/map [] syntax', () => {
    it('returns entire array for bare []', () => {
      const result = resolveDotPath(sampleRecord, 'emails[]');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('maps skill names via skills[].name', () => {
      const result = resolveDotPath(sampleRecord, 'skills[].name') as string[];
      expect(result).toEqual(['Python', 'AWS']);
    });

    it('maps skill confidence via skills[].confidence', () => {
      const result = resolveDotPath(sampleRecord, 'skills[].confidence') as number[];
      expect(result).toEqual([0.95, 0.80]);
    });
  });

  describe('link fields', () => {
    it('resolves nested link', () => {
      expect(resolveDotPath(sampleRecord, 'links.github')).toBe('https://github.com/janedoe');
    });

    it('returns undefined for missing link type', () => {
      expect(resolveDotPath(sampleRecord, 'links.portfolio')).toBeUndefined();
    });
  });
});
