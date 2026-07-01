import { SOURCE_WEIGHTS } from '../constants';
import type { CandidateRecord, SourceType } from '../types';

export interface ConfidenceInput {
  source: SourceType;
  agreementCount?: number;
  conflict?: boolean;
  normalized?: boolean;
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

export function computeConfidence(input: ConfidenceInput): number {
  const base = SOURCE_WEIGHTS[input.source];
  const agreementCount = input.agreementCount ?? 1;
  const hasConflict = input.conflict ?? false;
  const isNormalized = input.normalized ?? false;

  let score = base;
  if (agreementCount >= 2) {
    score *= 1.15;
  }
  if (hasConflict) {
    score *= 0.6;
  }
  if (isNormalized) {
    score *= 0.9;
  }

  return clampConfidence(score);
}

export function computeOverallConfidence(record: CandidateRecord): number {
  const provenanceGroups = new Map<string, number[]>();

  for (const provenance of record.provenance) {
    const fieldKey = provenance.field.split(/[.[\]]/)[0] || provenance.field;
    const values = provenanceGroups.get(fieldKey) ?? [];
    values.push(provenance.confidence);
    provenanceGroups.set(fieldKey, values);
  }

  if (!provenanceGroups.size) {
    return 0;
  }

  const fieldAverages = Array.from(provenanceGroups.values()).map((scores) => {
    const total = scores.reduce((sum, value) => sum + value, 0);
    return total / scores.length;
  });

  const overall = fieldAverages.reduce((sum, value) => sum + value, 0) / fieldAverages.length;
  return clampConfidence(overall);
}