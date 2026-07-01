import { computeConfidence } from '../scorer';
import type { ProvenanceRecord, SourceType } from '../types';

export interface ScalarCandidate<T> {
  source: SourceType;
  value: T;
}

export interface ScalarResolution<T> {
  value: T | null;
  provenance: ProvenanceRecord[];
  conflicted: boolean;
}

function stableValueKey(value: unknown) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  return JSON.stringify(value);
}

function buildProvenance(
  field: string,
  source: SourceType,
  value: unknown,
  confidence: number,
  conflicted: boolean,
  conflictReason?: string
) {
  return {
    field,
    source,
    method: 'merged' as const,
    rawValue: value,
    confidence,
    conflicted: conflicted || undefined,
    conflictReason
  } satisfies ProvenanceRecord;
}

export function scoreField(source: SourceType, agreementCount = 1, conflicted = false) {
  return computeConfidence({ source, agreementCount, conflict: conflicted });
}

export function resolveConflict<T extends string | number | boolean>(
  field: string,
  candidates: ScalarCandidate<T>[]
): ScalarResolution<T> {
  const grouped = new Map<string, ScalarCandidate<T>[]>();

  for (const candidate of candidates) {
    const key = stableValueKey(candidate.value);
    const values = grouped.get(key) ?? [];
    values.push(candidate);
    grouped.set(key, values);
  }

  const groups = Array.from(grouped.entries()).map(([key, entries]) => {
    const highestWeight = Math.max(...entries.map((entry) => computeConfidence({ source: entry.source })));
    return { key, entries, highestWeight };
  });

  if (!groups.length) {
    return { value: null, provenance: [], conflicted: false };
  }

  if (groups.length === 1) {
    const entries = groups[0].entries;
    const agreementCount = entries.length;
    const provenance = entries.map((entry) =>
      buildProvenance(field, entry.source, entry.value, scoreField(entry.source, agreementCount, false), false)
    );

    return {
      value: entries[0].value,
      provenance,
      conflicted: false
    };
  }

  const orderedGroups = [...groups].sort((left, right) => {
    if (right.highestWeight !== left.highestWeight) {
      return right.highestWeight - left.highestWeight;
    }

    return left.key.localeCompare(right.key);
  });

  const topGroup = orderedGroups[0];
  const sameWeightGroups = orderedGroups.filter((group) => group.highestWeight === topGroup.highestWeight);
  const equalWeightConflict = sameWeightGroups.length > 1;
  const chosenGroup = equalWeightConflict ? [...sameWeightGroups].sort((left, right) => left.key.localeCompare(right.key))[0] : topGroup;

  const conflictReason = `Conflict: sources disagree. ` +
    orderedGroups.map((g) => {
      const sourcesStr = g.entries.map((e) => e.source).join('/');
      const val = g.entries[0].value;
      return `${sourcesStr} has "${val}"`;
    }).join(', ');

  const provenance = orderedGroups.flatMap((group) =>
    group.entries.map((entry) => {
      if (equalWeightConflict) {
        return buildProvenance(field, entry.source, entry.value, 0.5, true, conflictReason);
      }

      return buildProvenance(field, entry.source, entry.value, scoreField(entry.source, 1, true), true, conflictReason);
    })
  );

  return {
    value: chosenGroup.entries[0].value,
    provenance,
    conflicted: true
  };
}