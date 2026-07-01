import { describe, it, expect } from 'vitest';
import { validateOutputConfig, validateOutputConfigString } from '@back/pipeline/validator';
import type { OutputConfig } from '@back/pipeline/types';

describe('validateOutputConfig()', () => {
  it('accepts a valid minimal config', () => {
    const config: OutputConfig = {
      fields: [{ path: 'full_name', type: 'string' }],
      include_confidence: true,
      include_provenance: false,
      on_missing: 'null',
    };
    const result = validateOutputConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.config).not.toBeNull();
  });

  it('accepts all on_missing values', () => {
    for (const mode of ['null', 'omit', 'error'] as const) {
      const config: OutputConfig = {
        fields: [{ path: 'full_name', type: 'string' }],
        include_confidence: false,
        include_provenance: false,
        on_missing: mode,
      };
      expect(validateOutputConfig(config).valid).toBe(true);
    }
  });

  it('rejects unknown on_missing value', () => {
    const config = {
      fields: [],
      include_confidence: false,
      include_provenance: false,
      on_missing: 'skip', // invalid
    };
    const result = validateOutputConfig(config);
    expect(result.valid).toBe(false);
  });

  it('rejects fields without required type', () => {
    const config = {
      fields: [{ path: 'full_name' }], // missing type
      include_confidence: false,
      include_provenance: false,
      on_missing: 'null',
    };
    const result = validateOutputConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects non-object input', () => {
    const result = validateOutputConfig('not-an-object');
    expect(result.valid).toBe(false);
  });

  it('rejects null', () => {
    const result = validateOutputConfig(null);
    expect(result.valid).toBe(false);
  });

  it('accepts optional fields: from, required, normalize', () => {
    const config: OutputConfig = {
      fields: [
        {
          path: 'phone',
          from: 'phones[0]',
          type: 'string',
          required: true,
          normalize: 'E164',
        },
      ],
      include_confidence: true,
      include_provenance: true,
      on_missing: 'omit',
    };
    const result = validateOutputConfig(config);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid normalize value', () => {
    const config = {
      fields: [{ path: 'phone', type: 'string', normalize: 'INVALID' }],
      include_confidence: false,
      include_provenance: false,
      on_missing: 'null',
    };
    const result = validateOutputConfig(config);
    expect(result.valid).toBe(false);
  });
});

describe('validateOutputConfigString()', () => {
  it('rejects invalid JSON', () => {
    const result = validateOutputConfigString('{ invalid json }');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/JSON parse error/i);
  });

  it('rejects valid JSON but invalid schema', () => {
    const result = validateOutputConfigString(JSON.stringify({ fields: 'not-an-array' }));
    expect(result.valid).toBe(false);
  });

  it('accepts valid JSON config string', () => {
    const config: OutputConfig = {
      fields: [{ path: 'full_name', type: 'string' }],
      include_confidence: false,
      include_provenance: false,
      on_missing: 'null',
    };
    const result = validateOutputConfigString(JSON.stringify(config));
    expect(result.valid).toBe(true);
    expect(result.config).toEqual({
      ...config,
      merge_policy: 'csv_resume_agreement',
    });
  });

  it('returns config object on success', () => {
    const config: OutputConfig = {
      fields: [
        { path: 'full_name', type: 'string', required: true },
        { path: 'emails',    type: 'string[]' },
      ],
      include_confidence: true,
      include_provenance: false,
      on_missing: 'omit',
    };
    const result = validateOutputConfigString(JSON.stringify(config));
    expect(result.config?.fields.length).toBe(2);
    expect(result.config?.on_missing).toBe('omit');
  });
});
