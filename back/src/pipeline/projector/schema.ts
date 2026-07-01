import { z } from 'zod';

export const OutputConfigFieldSchema = z.object({
  path: z.string().min(1, 'Field path cannot be empty'),
  from: z.string().optional(),
  type: z.enum(['string', 'string[]', 'number', 'boolean', 'object']),
  required: z.boolean().optional(),
  normalize: z.enum(['E164', 'canonical', 'ISO3166']).optional(),
  include: z.boolean().optional(),
});

export const OutputConfigSchema = z.object({
  fields: z.array(OutputConfigFieldSchema).min(1, 'At least one field is required'),
  include_confidence: z.boolean().default(false),
  include_provenance: z.boolean().default(false),
  on_missing: z.enum(['null', 'omit', 'error']).default('null'),
  merge_policy: z.enum(['weighted', 'csv_resume_agreement']).default('csv_resume_agreement'),
  min_field_confidence: z.number().min(0).max(1).optional(),
});

export type OutputConfigFieldInput = z.input<typeof OutputConfigFieldSchema>;
export type OutputConfigInput = z.input<typeof OutputConfigSchema>;
