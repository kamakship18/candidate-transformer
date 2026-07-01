import { describe, expect, it } from 'vitest';
import { normalizePhone } from '@back/pipeline/normalizers/phone';
import { normalizeDate } from '@back/pipeline/normalizers/date';
import { canonicalizeSkill } from '@back/pipeline/normalizers/skills';
import { normalizeCountry } from '@back/pipeline/normalizers/country';

describe('normalizers', () => {
  it('normalizes phone numbers with and without country code', () => {
    expect(normalizePhone('+919876543210')).toEqual({ value: '+919876543210', method: 'normalized', warnings: [] });
    expect(normalizePhone('9876543210')).toEqual({
      value: '+919876543210',
      method: 'normalized',
      warnings: [{ field: 'phone', message: 'Applied default country IN while normalizing phone number' }]
    });
  });

  it('returns null for invalid phone numbers', () => {
    expect(normalizePhone('garbage')).toEqual({
      value: null,
      method: 'normalized',
      warnings: [{ field: 'phone', message: 'Unable to normalize phone number: garbage' }]
    });
  });

  it('normalizes dates from objects and strings', () => {
    expect(normalizeDate({ year: 2021, month: 6 })).toEqual({ value: '2021-06', method: 'normalized', warnings: [] });
    expect(normalizeDate('March 2022')).toEqual({ value: '2022-03', method: 'normalized', warnings: [] });
    expect(normalizeDate('2022')).toEqual({
      value: '2022-01',
      method: 'inferred',
      warnings: [{ field: 'date', message: 'Only year supplied; defaulted month to January' }]
    });
  });

  it('canonicalizes skills and passes through unknown skills', () => {
    expect(canonicalizeSkill('JS')).toEqual({ value: 'JavaScript', method: 'normalized', warnings: [] });
    expect(canonicalizeSkill('react.js')).toEqual({ value: 'React', method: 'normalized', warnings: [] });
    expect(canonicalizeSkill('UnknownLib')).toEqual({ value: 'UnknownLib', method: 'normalized', warnings: [] });
  });

  it('normalizes countries to ISO codes', () => {
    expect(normalizeCountry('India')).toEqual({ value: 'IN', method: 'normalized', warnings: [] });
    expect(normalizeCountry('UK')).toEqual({ value: 'GB', method: 'normalized', warnings: [] });
  });
});