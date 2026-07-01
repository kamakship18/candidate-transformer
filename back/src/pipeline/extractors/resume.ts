import { extractFromNotes } from './notes';
import { canonicalizeSkill } from '../normalizers/skills';
import {
  calculateYearsExperienceFromMonths,
  parseDateRangeLine
} from '../utils/experience_months';
import type {
  CandidateEducation,
  CandidateExperience,
  CandidateLocation,
  CandidateSkill,
  PartialCandidateRecord
} from '../types';
import { extractTextFromPdf } from '../utils/pdf';

const RESUME_SECTION_HEADERS = new Set([
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'contact'
]);

const RESUME_NAME_STOP_WORDS = new Set([
  'senior',
  'junior',
  'lead',
  'principal',
  'manager',
  'engineer',
  'developer',
  'architect',
  'staff',
  'software',
  'backend',
  'frontend',
  'fullstack',
  'full-stack'
]);

const DEGREE_PATTERN =
  /\b(B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E\.?|M\.?\s*E\.?|MBA|B\.?\s*Sc\.?|M\.?\s*Sc\.?|Bachelor(?:'s)?|Master(?:'s)?|Ph\.?\s*D\.?|Doctorate|Associate)\b/i;

function isArrayBufferLike(value: unknown): value is ArrayBuffer | Uint8Array {
  return value instanceof ArrayBuffer || value instanceof Uint8Array;
}

function cleanLocationSegment(segment: string): string {
  const sectionPattern = /\b(Summary|Skills|Experience|Education|Projects|Certifications|Contact)\b/i;
  const match = segment.match(sectionPattern);
  if (match?.index !== undefined && match.index > 0) {
    return segment.slice(0, match.index).trim();
  }

  return segment.trim();
}

function parseCommaSeparatedLocation(locationText: string): CandidateLocation | null {
  const cleaned = cleanLocationSegment(locationText);
  const parts = cleaned
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return null;
  }

  if (parts.length === 1) {
    return { city: parts[0], region: null, country: null };
  }

  if (parts.length === 2) {
    return { city: parts[0], region: null, country: parts[1] };
  }

  return {
    city: parts[0],
    region: parts[1],
    country: parts.slice(2).join(', ')
  };
}

function looksLikeLocationSegment(segment: string) {
  const trimmed = segment.trim();
  return (
    Boolean(trimmed) &&
    !trimmed.includes('@') &&
    !/(?:\+?\d[\d\s().-]{7,}\d)/.test(trimmed) &&
    /[A-Za-z]/.test(trimmed)
  );
}

function extractLocationFromText(text: string): CandidateLocation | null {
  const labeledLocation = text.match(/(?:^|\n)\s*Location\s*:\s*(.+)/i);
  if (labeledLocation?.[1]) {
    return parseCommaSeparatedLocation(labeledLocation[1].trim());
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    if (!line.includes('|')) {
      continue;
    }

    const segments = line.split('|').map((segment) => segment.trim()).filter(Boolean);
    const locationSegment = [...segments].reverse().find((segment) => looksLikeLocationSegment(segment));
    if (locationSegment?.includes(',')) {
      const parsed = parseCommaSeparatedLocation(locationSegment);
      if (parsed) {
        return parsed;
      }
    }
  }

  const inlineContact = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}[^|\n]*\|\s*[^|\n]+\|\s*([A-Za-z][^|\n]+)/
  );
  if (inlineContact?.[1]?.includes(',')) {
    return parseCommaSeparatedLocation(inlineContact[1]);
  }

  const sectionIndex = lines.findIndex((line) =>
    /^(?:Profile|Summary|Skills|Experience|Education|Projects|Certifications|Contact)\b/i.test(line)
  );
  const contactBlock = sectionIndex >= 0 ? lines.slice(0, sectionIndex) : lines.slice(0, 8);

  for (const line of contactBlock) {
    if (line.includes('@') || /^(?:\+?\d[\d\s().-]{7,}\d)$/.test(line)) {
      continue;
    }

    if (line.includes(',') && /[A-Za-z]/.test(line) && !line.includes('|')) {
      const parsed = parseCommaSeparatedLocation(line);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

function extractSkillsFromSection(text: string): CandidateSkill[] {
  const sectionMatch = text.match(
    /\bSkills\b\s*\n([\s\S]*?)(?=\n\s*(?:Summary|Experience|Education|Projects|Certifications|Contact|Profile)\b|$)/i
  );
  if (!sectionMatch?.[1]) {
    return [];
  }

  const lines = sectionMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const skills: CandidateSkill[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    for (const part of line.split(',').map((segment) => segment.trim()).filter(Boolean)) {
      const canonical = canonicalizeSkill(part).value ?? part;
      const key = canonical.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      skills.push({
        name: canonical,
        confidence: 0.75,
        sources: ['resume']
      });
    }
  }

  return skills;
}

function parsePipeSeparatedEducation(line: string): CandidateEducation | null {
  const parts = line
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const institution = parts[0];
  if (!institution) {
    return null;
  }

  const yearPart = parts.find((part) => /^\d{4}$/.test(part));
  const endYear = yearPart ? Number(yearPart) : null;
  const degreePart = parts.find((part) => DEGREE_PATTERN.test(part));
  const degree = degreePart?.match(DEGREE_PATTERN)?.[0]?.replace(/\s+/g, ' ').trim() ?? null;
  const field =
    parts.find((part) => part !== institution && part !== degreePart && part !== yearPart && part.length > 1) ?? null;

  return {
    institution,
    degree,
    field,
    end_year: endYear
  };
}

function parseUniversityDashLine(line: string): CandidateEducation | null {
  const dashMatch = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (!dashMatch) {
    return null;
  }

  const institution = dashMatch[1].trim();
  const rest = dashMatch[2].trim();
  if (!institution) {
    return null;
  }

  const degreeMatch = rest.match(DEGREE_PATTERN);
  const degree = degreeMatch?.[0]?.replace(/\s+/g, ' ').trim() ?? null;
  const field = degree ? rest.replace(DEGREE_PATTERN, '').trim() || null : rest || null;

  return {
    institution,
    degree,
    field,
    end_year: null
  };
}

function extractYearsExperienceFromText(text: string): number | null {
  const patterns = [
    /\b(\d{1,2})\+?\s*years?\s+of\s+(?:total\s+)?(?:professional\s+)?experience\b/i,
    /\bwith\s+(\d{1,2})\+?\s*years?\s+(?:of\s+)?(?:total\s+)?(?:professional\s+)?experience\b/i,
    /\b(\d{1,2})\+?\s*years?\s+experience\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return null;
}

function parseEducationLine(line: string): CandidateEducation | null {
  if (line.includes('|')) {
    return parsePipeSeparatedEducation(line);
  }

  const universityLine = parseUniversityDashLine(line);
  if (universityLine) {
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      universityLine.end_year = Number(yearMatch[0]);
    }
    return universityLine;
  }

  const yearMatch = line.match(/\b(19|20)\d{2}\b/);
  const endYear = yearMatch ? Number(yearMatch[0]) : null;
  const degreeMatch = line.match(DEGREE_PATTERN);
  const degree = degreeMatch ? degreeMatch[0].replace(/\s+/g, ' ').trim() : null;

  const fieldMatch = line.match(
    /\b(?:in|of)\s+([A-Za-z][A-Za-z\s&.-]+?)(?:\s*[|,–—-]|\s+\b(19|20)\d{2}\b|$)/i
  );
  const commaFieldMatch = degree
    ? line.match(new RegExp(`${degree.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,\\s*([A-Za-z][A-Za-z\\s&.-]+)`, 'i'))
    : null;
  const field = (fieldMatch?.[1] ?? commaFieldMatch?.[1])?.trim() ?? null;

  let institution = line
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(DEGREE_PATTERN, '')
    .replace(/\b(?:in|of)\s+[A-Za-z][A-Za-z\s&.-]+/gi, '')
    .replace(/[|–—-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!institution) {
    return null;
  }

  return {
    institution,
    degree,
    field,
    end_year: endYear
  };
}

function looksLikeDateRangeLine(line: string) {
  if (/\bPresent\b/i.test(line) && /\b(19|20)\d{2}\b/.test(line)) {
    return true;
  }

  return /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}\s*[-–—]/i.test(
    line
  );
}

function isExperienceTitleLine(line: string) {
  if (looksLikeDateRangeLine(line)) {
    return false;
  }

  const dashMatch = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (!dashMatch) {
    return false;
  }

  return !/^present$/i.test(dashMatch[2].trim());
}

function extractExperienceFromText(text: string): CandidateExperience[] {
  const sectionMatch = text.match(
    /\bExperience\b\s*\n([\s\S]*?)(?=\n\s*(?:Summary|Skills|Education|Projects|Certifications|Contact|Profile)\b|$)/i
  );
  if (!sectionMatch?.[1]) {
    return [];
  }

  const lines = sectionMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const experiences: CandidateExperience[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]!;
    if (!isExperienceTitleLine(line)) {
      index += 1;
      continue;
    }

    const dashMatch = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (!dashMatch) {
      index += 1;
      continue;
    }

    const entry: CandidateExperience = {
      company: dashMatch[1].trim(),
      title: dashMatch[2].trim(),
      start: null,
      end: null,
      summary: null
    };
    index += 1;

    if (index < lines.length && looksLikeDateRangeLine(lines[index]!)) {
      const range = parseDateRangeLine(lines[index]!);
      if (range) {
        entry.start = range.start;
        entry.end = range.end;
      }
      index += 1;
    }

    const summaryParts: string[] = [];
    while (index < lines.length && !isExperienceTitleLine(lines[index]!)) {
      if (!looksLikeDateRangeLine(lines[index]!)) {
        summaryParts.push(lines[index]!);
      }
      index += 1;
    }

    if (summaryParts.length) {
      entry.summary = summaryParts.join(' ');
    }

    experiences.push(entry);
  }

  return experiences;
}

function extractEducationFromText(text: string): CandidateEducation[] {
  const sectionMatch = text.match(
    /\bEducation\b\s*\n([\s\S]*?)(?=\n\s*(?:Summary|Skills|Experience|Projects|Certifications|Contact|Profile)\b|$)/i
  );
  if (!sectionMatch?.[1]) {
    return [];
  }

  const lines = sectionMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const education: CandidateEducation[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    if (/^(19|20)\d{2}$/.test(line)) {
      const lastEntry = education[education.length - 1];
      if (lastEntry) {
        lastEntry.end_year = Number(line);
      }
      continue;
    }

    const entry = parseEducationLine(line);
    if (entry) {
      education.push(entry);
    }
  }

  return education;
}

function extractResumeFromText(text: string): PartialCandidateRecord {
  const record = extractFromNotes(text);
  const tokens = text
    .replace(/\r?\n/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^[|,;:]+|[|,;:.]+$/g, ''))
    .filter(Boolean);

  const nameTokens: string[] = [];
  let tokenIndex = 0;

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    const lowerToken = token.toLowerCase();

    if (
      nameTokens.length > 0 &&
      (RESUME_SECTION_HEADERS.has(lowerToken) ||
        RESUME_NAME_STOP_WORDS.has(lowerToken) ||
        token.includes('@') ||
        /\d/.test(token) ||
        token.startsWith('+'))
    ) {
      break;
    }

    if (/^[A-Z][A-Za-z.'-]*$/.test(token)) {
      nameTokens.push(token);
      tokenIndex += 1;
      if (nameTokens.length >= 4) {
        break;
      }
      continue;
    }

    break;
  }

  const headlineTokens: string[] = [];
  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    const lowerToken = token.toLowerCase();

    if (
      RESUME_SECTION_HEADERS.has(lowerToken) ||
      token.includes('@') ||
      /\d/.test(token) ||
      token.startsWith('+') ||
      token === '|'
    ) {
      break;
    }

    if (/^[A-Z][A-Za-z.'&-]*$/.test(token) || RESUME_NAME_STOP_WORDS.has(lowerToken)) {
      headlineTokens.push(token);
      tokenIndex += 1;
      continue;
    }

    if (headlineTokens.length > 0) {
      break;
    }

    tokenIndex += 1;
  }

  const sectionSkills = extractSkillsFromSection(text);
  const mergedSkills = new Map<string, CandidateSkill>();

  for (const skill of [...(record.skills ?? []), ...sectionSkills]) {
    const canonical = canonicalizeSkill(skill.name).value ?? skill.name;
    const key = canonical.toLowerCase();
    const existing = mergedSkills.get(key);
    if (existing) {
      existing.confidence = Math.max(existing.confidence, skill.confidence);
      continue;
    }

    mergedSkills.set(key, {
      name: canonical,
      confidence: Math.max(skill.confidence, 0.7),
      sources: ['resume']
    });
  }

  if (mergedSkills.size) {
    record.skills = Array.from(mergedSkills.values());
  }

  if (nameTokens.length) {
    record.full_name = nameTokens.join(' ');
  }

  if (headlineTokens.length) {
    record.headline = headlineTokens.join(' ');
  }

  const location = extractLocationFromText(text);
  if (location) {
    record.location = location;
  }

  const education = extractEducationFromText(text);
  if (education.length) {
    record.education = education;
  }

  const experience = extractExperienceFromText(text);
  if (experience.length) {
    record.experience = experience;
  }

  const calculatedYears = calculateYearsExperienceFromMonths(experience);
  const statedYears = extractYearsExperienceFromText(text);
  if (calculatedYears !== null) {
    record.years_experience = calculatedYears;
  } else if (statedYears !== null) {
    record.years_experience = statedYears;
  }

  return record;
}

export async function extractFromResume(rawData: unknown): Promise<PartialCandidateRecord> {
  if (typeof rawData === 'string') {
    return extractResumeFromText(rawData);
  }

  if (!isArrayBufferLike(rawData)) {
    return {};
  }

  const extractedText = await extractTextFromPdf(rawData);
  return extractResumeFromText(extractedText);
}
