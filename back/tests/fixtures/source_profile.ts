import type { PartialCandidateRecord, SourceProfile, SourceType } from '@back/pipeline/types';

export function makeSourceProfile(
  source: SourceType,
  profile: PartialCandidateRecord,
  label?: string
): SourceProfile {
  const sourceLabel = label ?? source;
  return {
    source,
    instanceId: `${source}:${sourceLabel}`,
    sourceLabel,
    profile,
  };
}
