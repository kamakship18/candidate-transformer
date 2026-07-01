import { COUNTRY_ALIAS_MAP } from '../constants';
import type { NormalizedValue } from '../types';

function createWarning(message: string) {
  return [{ field: 'country', message }];
}

function normalizeCountryKey(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z]/g, '');
}

export function normalizeCountry(input: unknown): NormalizedValue<string> {
  if (typeof input !== 'string') {
    return { value: null, method: 'normalized', warnings: createWarning('Country value is not a string') };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null, method: 'normalized', warnings: createWarning('Country value is empty') };
  }

  const exactMatch = COUNTRY_ALIAS_MAP[trimmed.toLowerCase()];
  if (exactMatch) {
    return { value: exactMatch, method: 'normalized', warnings: [] };
  }

  const collapsedMatch = COUNTRY_ALIAS_MAP[normalizeCountryKey(trimmed)];
  if (collapsedMatch) {
    return { value: collapsedMatch, method: 'normalized', warnings: [] };
  }

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) {
    return { value: upper, method: 'normalized', warnings: [] };
  }

  return {
    value: null,
    method: 'normalized',
    warnings: createWarning(`Unrecognized country value: ${trimmed}`)
  };
}