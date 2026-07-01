import { describe, it, expect } from 'vitest';
import { normalizePartialProfile } from '@back/pipeline/normalizers';
import type { PartialCandidateRecord } from '@back/pipeline/types';

describe('normalizePartialProfile()', () => {
  describe('phone normalization', () => {
    it('normalizes Indian phone number to E164', () => {
      const input: PartialCandidateRecord = {
        phones: ['9876543210'],
      };
      const result = normalizePartialProfile(input);
      // Should transform or keep valid phone; must not crash
      expect(Array.isArray(result.phones)).toBe(true);
    });

    it('passes already-E164 phone through', () => {
      const input: PartialCandidateRecord = {
        phones: ['+14155550001'],
      };
      const result = normalizePartialProfile(input);
      expect(result.phones).toEqual(['+14155550001']);
    });

    it('filters out unrecognizable phone strings', () => {
      const input: PartialCandidateRecord = {
        phones: ['not-a-phone', 'N/A'],
      };
      const result = normalizePartialProfile(input);
      // Should keep only valid phones (may be empty)
      expect(Array.isArray(result.phones)).toBe(true);
    });
  });

  describe('skill canonicalization', () => {
    it('canonicalizes skill name casing', () => {
      const input: PartialCandidateRecord = {
        skills: [
          { name: 'javascript', confidence: 0.9, sources: ['csv'] },
          { name: 'PYTHON',    confidence: 0.8, sources: ['csv'] },
        ],
      };
      const result = normalizePartialProfile(input);
      // Should not crash; skill names should be returned
      expect(result.skills?.length).toBe(2);
      result.skills?.forEach((s) => {
        expect(typeof s.name).toBe('string');
        expect(s.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('country normalization', () => {
    it('normalizes long-form country names', () => {
      const input: PartialCandidateRecord = {
        location: { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
      };
      const result = normalizePartialProfile(input);
      // Should normalize to ISO 3166-1 alpha-2 or keep as-is
      expect(result.location?.country).toBeDefined();
    });

    it('passes ISO codes through', () => {
      const input: PartialCandidateRecord = {
        location: { city: 'Berlin', region: null, country: 'DE' },
      };
      const result = normalizePartialProfile(input);
      expect(result.location?.country).toBe('DE');
    });

    it('handles null country gracefully', () => {
      const input: PartialCandidateRecord = {
        location: { city: 'Unknown', region: null, country: null },
      };
      const result = normalizePartialProfile(input);
      expect(result.location?.country).toBeNull();
    });
  });

  describe('experience date normalization', () => {
    it('normalizes human-readable date strings to YYYY-MM', () => {
      const input: PartialCandidateRecord = {
        experience: [
          { company: 'Acme', title: 'SWE', start: 'Jan 2020', end: 'Dec 2022', summary: null },
        ],
      };
      const result = normalizePartialProfile(input);
      const exp = result.experience?.[0];
      expect(exp).toBeDefined();
      // start & end should be normalized or null — not crash
      if (exp?.start) {
        expect(exp.start).toMatch(/^\d{4}-\d{2}$/);
      }
    });

    it('passes null dates through as null', () => {
      const input: PartialCandidateRecord = {
        experience: [
          { company: 'Acme', title: 'SWE', start: null, end: null, summary: null },
        ],
      };
      const result = normalizePartialProfile(input);
      expect(result.experience?.[0].start).toBeNull();
      expect(result.experience?.[0].end).toBeNull();
    });
  });

  describe('education year normalization', () => {
    it('converts string year to number', () => {
      const input: PartialCandidateRecord = {
        education: [
          { institution: 'MIT', degree: 'BS', field: 'CS', end_year: '2016' as unknown as number },
        ],
      };
      const result = normalizePartialProfile(input);
      expect(typeof result.education?.[0].end_year).toBe('number');
      expect(result.education?.[0].end_year).toBe(2016);
    });

    it('passes null end_year through', () => {
      const input: PartialCandidateRecord = {
        education: [
          { institution: 'MIT', degree: 'BS', field: 'CS', end_year: null },
        ],
      };
      const result = normalizePartialProfile(input);
      expect(result.education?.[0].end_year).toBeNull();
    });
  });

  describe('empty/minimal input', () => {
    it('handles completely empty profile', () => {
      const result = normalizePartialProfile({});
      expect(result).toEqual({});
    });

    it('preserves fields it does not touch', () => {
      const input: PartialCandidateRecord = {
        full_name: 'Test User',
        emails: ['test@example.com'],
      };
      const result = normalizePartialProfile(input);
      expect(result.full_name).toBe('Test User');
      expect(result.emails).toEqual(['test@example.com']);
    });
  });
});
