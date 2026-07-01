import { SKILL_ALIAS_MAP } from '../constants';
import type { CandidateSkill, PartialCandidateRecord } from '../types';

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function extractEmails(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return Array.from(new Set(matches.map((email) => email.trim())));
}

function extractPhones(text: string) {
  const matches = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? [];
  return Array.from(
    new Set(
      matches
        .map((phone) => phone.trim())
        .filter((phone) => phone.replace(/\D/g, '').length >= 8)
    )
  );
}

function extractSkills(text: string) {
  const normalizedText = normalizeSearchText(text);
  const canonicalSkills = new Map<string, CandidateSkill>();
  const aliasEntries = Object.entries(SKILL_ALIAS_MAP).sort((left, right) => right[0].length - left[0].length);

  for (const [alias, canonical] of aliasEntries) {
    const normalizedAlias = normalizeSearchText(alias).trim();
    if (!normalizedAlias) {
      continue;
    }

    const pattern = new RegExp(`(^|\\s)${normalizedAlias.replace(/\s+/g, '\\s+')}(\\s|$)`);
    if (pattern.test(normalizedText) && !canonicalSkills.has(canonical)) {
      canonicalSkills.set(canonical, { name: canonical, confidence: 0.5, sources: ['notes'] });
    }
  }

  return Array.from(canonicalSkills.values());
}

function extractHeadline(text: string) {
  const firstLine = text.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
  if (!firstLine) {
    return null;
  }

  const firstSentence = firstLine.split('.').map((segment) => segment.trim()).find(Boolean) ?? firstLine;
  return firstSentence.length <= 160 ? firstSentence : firstSentence.slice(0, 160);
}

export function extractFromNotes(rawData: unknown): PartialCandidateRecord {
  if (typeof rawData !== 'string' || !rawData.trim()) {
    return {};
  }

  const text = rawData.trim();
  const emails = extractEmails(text);
  const phones = extractPhones(text);
  const skills = extractSkills(text);
  const headline = extractHeadline(text);

  const record: PartialCandidateRecord = {};

  if (emails.length) {
    record.emails = emails;
  }

  if (phones.length) {
    record.phones = phones;
  }

  if (skills.length) {
    record.skills = skills;
  }

  if (headline) {
    record.headline = headline;
  }

  return record;
}