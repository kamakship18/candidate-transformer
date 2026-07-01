import { SKILL_ALIAS_MAP } from '../constants';
import type { NormalizedValue } from '../types';

function createWarning(message: string) {
  return [{ field: 'skill', message }];
}

function normalizeSkillKey(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9.+#\s]/g, '');
}

function collapseSkillKey(input: string) {
  return normalizeSkillKey(input).replace(/\s+/g, '');
}

export function canonicalizeSkill(input: unknown): NormalizedValue<string> {
  if (typeof input !== 'string') {
    return { value: null, method: 'normalized', warnings: createWarning('Skill value is not a string') };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null, method: 'normalized', warnings: createWarning('Skill value is empty') };
  }

  const exactMatch = SKILL_ALIAS_MAP[normalizeSkillKey(trimmed)];
  if (exactMatch) {
    return { value: exactMatch, method: 'normalized', warnings: [] };
  }

  const collapsedMatch = SKILL_ALIAS_MAP[collapseSkillKey(trimmed)];
  if (collapsedMatch) {
    return { value: collapsedMatch, method: 'normalized', warnings: [] };
  }

  return { value: trimmed, method: 'normalized', warnings: [] };
}