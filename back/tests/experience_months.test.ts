import { describe, expect, it } from 'vitest';
import {
  calculateYearsExperienceFromMonths,
  monthsBetweenYearMonths,
  parseDateRangeLine,
  totalExperienceMonths
} from '@back/pipeline/utils/experience_months';
import type { CandidateExperience } from '@back/pipeline/types';

const REFERENCE_DATE = new Date('2026-06-30');

describe('experience month calculations', () => {
  it('parses month-year date ranges', () => {
    expect(parseDateRangeLine('January 2022 - Present')).toEqual({
      start: '2022-01',
      end: null
    });
    expect(parseDateRangeLine('June 2023 - December 2023')).toEqual({
      start: '2023-06',
      end: '2023-12'
    });
  });

  it('calculates months between year-month values', () => {
    expect(monthsBetweenYearMonths('2022-01', null, REFERENCE_DATE)).toBe(53);
    expect(monthsBetweenYearMonths('2023-06', '2023-12', REFERENCE_DATE)).toBe(6);
  });

  it('totals experience months across roles', () => {
    const experiences: CandidateExperience[] = [
      {
        company: 'Justdial',
        title: 'Senior Analyst',
        start: '2024-01',
        end: null,
        summary: null
      },
      {
        company: 'Genpact',
        title: 'Business Analyst',
        start: '2023-06',
        end: '2023-12',
        summary: null
      }
    ];

    expect(totalExperienceMonths(experiences, REFERENCE_DATE)).toBe(35);
    expect(calculateYearsExperienceFromMonths(experiences, REFERENCE_DATE)).toBe(2);
  });
});
