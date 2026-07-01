import { extractFromATS } from './ats_json';
import { extractAllFromCSV, extractFromCSV } from './csv';
import { extractFromGitHub } from './github';
import { extractFromLinkedIn } from './linkedin';
import { extractFromNotes } from './notes';
import { extractFromResume } from './resume';
import type { PartialCandidateRecord, SourceBundle, SourceProfile, SourceType } from '../types';

export async function extractBySource(source: SourceType, rawData: unknown): Promise<PartialCandidateRecord> {
  switch (source) {
    case 'csv':
      return extractFromCSV(rawData);
    case 'ats_json':
      return extractFromATS(rawData);
    case 'github':
      return extractFromGitHub(rawData);
    case 'linkedin':
      return extractFromLinkedIn(rawData);
    case 'notes':
      return extractFromNotes(rawData);
    case 'resume':
      return extractFromResume(rawData);
    default:
      return {};
  }
}

export async function extractProfilesFromBundle(bundle: SourceBundle): Promise<SourceProfile[]> {
  const base = {
    source: bundle.type,
    instanceId: bundle.instanceId,
    sourceLabel: bundle.sourceLabel
  };

  if (bundle.rawData === null || bundle.rawData === undefined) {
    return [];
  }

  if (bundle.type === 'csv') {
    return extractAllFromCSV(bundle.rawData).map((profile, index) => ({
      ...base,
      instanceId: `${bundle.instanceId}:row:${index}`,
      profile
    }));
  }

  const profile = await extractBySource(bundle.type, bundle.rawData);
  return [{ ...base, profile }];
}
