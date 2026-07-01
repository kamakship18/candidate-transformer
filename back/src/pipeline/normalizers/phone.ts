import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { DEFAULT_PHONE_COUNTRY } from '../constants';
import type { NormalizedValue } from '../types';

function createWarning(message: string) {
  return [{ field: 'phone', message }];
}

export function normalizePhone(
  input: unknown,
  defaultCountry: string = DEFAULT_PHONE_COUNTRY
): NormalizedValue<string> {
  if (typeof input !== 'string') {
    return { value: null, method: 'normalized', warnings: createWarning('Phone value is not a string') };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null, method: 'normalized', warnings: createWarning('Phone value is empty') };
  }

  const parseCountry = trimmed.startsWith('+') ? undefined : defaultCountry;
  const parsed = parsePhoneNumberFromString(trimmed, parseCountry as never);

  if (!parsed || !parsed.isValid()) {
    return {
      value: null,
      method: 'normalized',
      warnings: createWarning(`Unable to normalize phone number: ${trimmed}`)
    };
  }

  const warnings = trimmed.startsWith('+')
    ? []
    : createWarning(`Applied default country ${defaultCountry} while normalizing phone number`);

  return {
    value: parsed.number,
    method: 'normalized',
    warnings
  };
}