import { DATE_MONTHS } from '../constants';
import type { NormalizedValue } from '../types';

function padMonth(month: number) {
  return month.toString().padStart(2, '0');
}

function createWarning(message: string) {
  return [{ field: 'date', message }];
}

function formatYearMonth(year: number, month: number) {
  return `${year}-${padMonth(month)}`;
}

function parseDateObject(input: Record<string, unknown>): NormalizedValue<string> | null {
  const year = typeof input.year === 'number' ? input.year : Number(input.year);
  if (!Number.isInteger(year)) {
    return null;
  }

  const monthValue = input.month;
  if (monthValue === undefined || monthValue === null || monthValue === '') {
    return {
      value: `${year}-01`,
      method: 'inferred',
      warnings: createWarning('Month missing; defaulted to January')
    };
  }

  const month = typeof monthValue === 'number' ? monthValue : Number(monthValue);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    value: formatYearMonth(year, month),
    method: 'normalized',
    warnings: []
  };
}

function parseStringDate(input: string): NormalizedValue<string> | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const yearOnly = /^\d{4}$/.exec(trimmed);
  if (yearOnly) {
    return {
      value: `${trimmed}-01`,
      method: 'inferred',
      warnings: createWarning('Only year supplied; defaulted month to January')
    };
  }

  const isoMonth = /^(\d{4})-(\d{1,2})/.exec(trimmed);
  if (isoMonth) {
    const year = Number(isoMonth[1]);
    const month = Number(isoMonth[2]);
    if (month >= 1 && month <= 12) {
      return {
        value: formatYearMonth(year, month),
        method: 'normalized',
        warnings: []
      };
    }
  }

  const monthYear = /^(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (monthYear) {
    const month = Number(monthYear[1]);
    const year = Number(monthYear[2]);
    if (month >= 1 && month <= 12) {
      return { value: formatYearMonth(year, month), method: 'normalized', warnings: [] };
    }
  }

  const monthName = /^([a-zA-Z]+)\s+(\d{4})$/.exec(trimmed);
  if (monthName) {
    const monthIndex = DATE_MONTHS[monthName[1].toLowerCase()];
    if (monthIndex) {
      return {
        value: formatYearMonth(Number(monthName[2]), monthIndex),
        method: 'normalized',
        warnings: []
      };
    }
  }

  return null;
}

export function normalizeDate(input: unknown): NormalizedValue<string> {
  if (input === null || input === undefined) {
    return { value: null, method: 'normalized', warnings: createWarning('Date value is missing') };
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    const parsed = parseDateObject(input as Record<string, unknown>);
    if (parsed) {
      return parsed;
    }
  }

  if (typeof input === 'string') {
    const parsed = parseStringDate(input);
    if (parsed) {
      return parsed;
    }
  }

  return {
    value: null,
    method: 'normalized',
    warnings: createWarning('Unable to normalize date')
  };
}