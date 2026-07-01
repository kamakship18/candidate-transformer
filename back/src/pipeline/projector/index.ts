import { normalizePhone } from '../normalizers/phone';
import { canonicalizeSkill } from '../normalizers/skills';
import { normalizeCountry } from '../normalizers/country';
import { resolveDotPath } from './resolver';
import type { CandidateRecord, OutputConfig, ProjectedOutput } from '../types';

export class ProjectionError extends Error {
  constructor(
    public readonly fieldPath: string,
    message: string
  ) {
    super(message);
    this.name = 'ProjectionError';
  }
}

function applyNormalization(value: unknown, normalize: 'E164' | 'canonical' | 'ISO3166'): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (normalize === 'E164') {
    if (typeof value === 'string') {
      const result = normalizePhone(value);
      return result.value ?? value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => {
        if (typeof v === 'string') {
          const result = normalizePhone(v);
          return result.value ?? v;
        }
        return v;
      });
    }
    return value;
  }

  if (normalize === 'canonical') {
    if (typeof value === 'string') {
      const result = canonicalizeSkill(value);
      return result.value ?? value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => {
        if (typeof v === 'string') {
          const result = canonicalizeSkill(v);
          return result.value ?? v;
        }
        return v;
      });
    }
    return value;
  }

  if (normalize === 'ISO3166') {
    if (typeof value === 'string') {
      const result = normalizeCountry(value);
      return result.value ?? value;
    }
    return value;
  }

  return value;
}

/**
 * Projects a CandidateRecord into a shaped output according to the OutputConfig.
 * This is a pure function — no side effects.
 */
export function project(record: CandidateRecord, config: OutputConfig): ProjectedOutput {
  const result: ProjectedOutput = {};
  const recordAsObj = record as unknown as Record<string, unknown>;

  for (const field of config.fields) {
    if (field.include === false) {
      continue;
    }

    const sourcePath = field.from ?? field.path;

    let value = resolveDotPath(recordAsObj, sourcePath);

    if (value === null || value === undefined) {
      if (field.required === true && config.on_missing === 'error') {
        throw new ProjectionError(
          field.path,
          `Required field "${field.path}" (mapped from "${sourcePath}") is missing in canonical record`
        );
      }

      if (config.on_missing === 'omit') {
        // Skip: do not add to result
        continue;
      }

      // on_missing === 'null' (default)
      result[field.path] = null;
      continue;
    }

    // Apply normalization if specified
    if (field.normalize) {
      value = applyNormalization(value, field.normalize);
    }

    result[field.path] = value;
  }

  if (config.include_confidence) {
    const minConfidence = config.min_field_confidence ?? 0;
    if (record.overall_confidence >= minConfidence) {
      result['_confidence'] = record.overall_confidence;
    }
  }

  if (config.include_provenance) {
    result['_provenance'] = record.provenance;
  }

  return result;
}
