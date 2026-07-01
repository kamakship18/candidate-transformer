import { z } from 'zod';
import { OutputConfigSchema } from '../projector/schema';
import type { OutputConfig, ProjectedOutput } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the projected output against the OutputConfig.
 * Checks required fields are present and non-null.
 */
export function validateOutput(output: ProjectedOutput, config: OutputConfig): ValidationResult {
  const errors: string[] = [];

  for (const field of config.fields) {
    if (field.required === true) {
      const value = output[field.path];
      if (value === null || value === undefined) {
        errors.push(`Required field "${field.path}" is null or missing in projected output`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an OutputConfig object against the zod schema.
 * Returns structured errors suitable for display in the config editor.
 */
export function validateOutputConfig(raw: unknown): { valid: boolean; config: OutputConfig | null; errors: string[] } {
  const result = OutputConfigSchema.safeParse(raw);

  if (result.success) {
    return { valid: true, config: result.data as OutputConfig, errors: [] };
  }

  const errors = result.error.errors.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
    return `${path}${e.message}`;
  });

  return { valid: false, config: null, errors };
}

/**
 * Validates a JSON string as an OutputConfig.
 * Returns parse errors if JSON is invalid, then zod errors if schema fails.
 */
export function validateOutputConfigString(jsonString: string): {
  valid: boolean;
  config: OutputConfig | null;
  errors: string[];
} {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return { valid: false, config: null, errors: [`JSON parse error: ${message}`] };
  }

  return validateOutputConfig(parsed);
}

// Re-export the zod schema for use in config editor
export { OutputConfigSchema };
export type { z };
