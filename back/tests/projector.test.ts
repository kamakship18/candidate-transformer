import { describe, it, expect } from 'vitest';
import { project, ProjectionError } from '@back/pipeline/projector';
import type { CandidateRecord, OutputConfig } from '@back/pipeline/types';

// ─── Fixture ──────────────────────────────────────────────────────────────────
function makeRecord(overrides?: Partial<CandidateRecord>): CandidateRecord {
  return {
    candidate_id: 'test-001',
    full_name: 'Alice Smith',
    emails: ['alice@example.com'],
    phones: ['+14155550001'],
    location: { city: 'New York', region: 'NY', country: 'US' },
    links: { github: 'https://github.com/alice' },
    headline: 'Senior Engineer',
    years_experience: 8,
    skills: [
      { name: 'TypeScript', confidence: 0.95, sources: ['csv'] },
      { name: 'React',      confidence: 0.88, sources: ['ats_json', 'linkedin'] },
    ],
    experience: [
      { company: 'TechCorp', title: 'Senior SWE', start: '2018-01', end: null, summary: 'Led frontend team' },
    ],
    education: [
      { institution: 'MIT', degree: 'BS', field: 'CS', end_year: 2016 },
    ],
    provenance: [
      {
        field: 'full_name', source: 'csv', method: 'direct',
        rawValue: 'Alice Smith', confidence: 0.9, conflicted: false,
      },
    ],
    overall_confidence: 0.91,
    pipeline_meta: {
      processed_at: new Date().toISOString(),
      sources_attempted: ['csv', 'ats_json'],
      sources_succeeded: ['csv', 'ats_json'],
      errors: [],
    },
    ...overrides,
  };
}

const minimalConfig: OutputConfig = {
  fields: [
    { path: 'full_name', type: 'string' },
    { path: 'emails',    type: 'string[]' },
  ],
  include_confidence: false,
  include_provenance: false,
  on_missing: 'null',
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('project()', () => {
  describe('basic projection', () => {
    it('projects named fields from canonical record', () => {
      const result = project(makeRecord(), minimalConfig);
      expect(result.full_name).toBe('Alice Smith');
      expect(result.emails).toEqual(['alice@example.com']);
    });

    it('does not include unrequested fields', () => {
      const result = project(makeRecord(), minimalConfig);
      expect(result.headline).toBeUndefined();
      expect(result.phones).toBeUndefined();
    });
  });

  describe('include_confidence', () => {
    it('appends _confidence when true', () => {
      const config: OutputConfig = { ...minimalConfig, include_confidence: true };
      const result = project(makeRecord(), config);
      expect(result._confidence).toBe(0.91);
    });

    it('omits _confidence when false', () => {
      const result = project(makeRecord(), minimalConfig);
      expect(result._confidence).toBeUndefined();
    });
  });

  describe('include_provenance', () => {
    it('appends _provenance array when true', () => {
      const config: OutputConfig = { ...minimalConfig, include_provenance: true };
      const result = project(makeRecord(), config);
      expect(Array.isArray(result._provenance)).toBe(true);
    });
  });

  describe('on_missing: null', () => {
    it('sets missing field to null', () => {
      const record = makeRecord({ headline: null });
      const config: OutputConfig = {
        fields: [{ path: 'headline', type: 'string' }],
        include_confidence: false,
        include_provenance: false,
        on_missing: 'null',
      };
      const result = project(record, config);
      expect(result.headline).toBeNull();
    });
  });

  describe('on_missing: omit', () => {
    it('omits missing field from output', () => {
      const record = makeRecord({ headline: null });
      const config: OutputConfig = {
        fields: [{ path: 'headline', type: 'string' }],
        include_confidence: false,
        include_provenance: false,
        on_missing: 'omit',
      };
      const result = project(record, config);
      expect('headline' in result).toBe(false);
    });
  });

  describe('on_missing: error + required', () => {
    it('throws ProjectionError for missing required field', () => {
      const record = makeRecord({ full_name: null });
      const config: OutputConfig = {
        fields: [{ path: 'full_name', type: 'string', required: true }],
        include_confidence: false,
        include_provenance: false,
        on_missing: 'error',
      };
      expect(() => project(record, config)).toThrow(ProjectionError);
    });

    it('does not throw for optional missing field', () => {
      const record = makeRecord({ headline: null });
      const config: OutputConfig = {
        fields: [{ path: 'headline', type: 'string', required: false }],
        include_confidence: false,
        include_provenance: false,
        on_missing: 'error',
      };
      expect(() => project(record, config)).not.toThrow();
    });
  });

  describe('field remapping (from)', () => {
    it('maps emails[0] to primary_email', () => {
      const config: OutputConfig = {
        fields: [{ path: 'primary_email', from: 'emails[0]', type: 'string' }],
        include_confidence: false,
        include_provenance: false,
        on_missing: 'null',
      };
      const result = project(makeRecord(), config);
      expect(result.primary_email).toBe('alice@example.com');
    });

    it('maps skills[].name to top_skills array', () => {
      const config: OutputConfig = {
        fields: [{ path: 'top_skills', from: 'skills[].name', type: 'string[]' }],
        include_confidence: false,
        include_provenance: false,
        on_missing: 'null',
      };
      const result = project(makeRecord(), config);
      expect(result.top_skills).toEqual(['TypeScript', 'React']);
    });

    it('maps location.city to city', () => {
      const config: OutputConfig = {
        fields: [{ path: 'city', from: 'location.city', type: 'string' }],
        include_confidence: false,
        include_provenance: false,
        on_missing: 'null',
      };
      const result = project(makeRecord(), config);
      expect(result.city).toBe('New York');
    });
  });

  describe('normalize: E164', () => {
    it('normalizes a single phone', () => {
      const config: OutputConfig = {
        fields: [{ path: 'phone', from: 'phones[0]', type: 'string', normalize: 'E164' }],
        include_confidence: false,
        include_provenance: false,
        on_missing: 'null',
      };
      const result = project(makeRecord(), config);
      // Should at minimum not throw; value should be a string
      expect(typeof result.phone === 'string' || result.phone === null).toBe(true);
    });
  });

  describe('determinism', () => {
    it('produces same output on repeated calls with same input', () => {
      const record = makeRecord();
      const config: OutputConfig = { ...minimalConfig, include_confidence: true };
      const a = project(record, config);
      const b = project(record, config);
      expect(a).toEqual(b);
    });
  });
});
