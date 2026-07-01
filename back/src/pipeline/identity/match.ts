import { normalizePhone } from '../normalizers/phone';
import type { PartialCandidateRecord, SourceProfile } from '../types';

export interface IdentityKeys {
  emails: string[];
  phones: string[];
  names: string[];
  resumeRefs: string[];
}

export interface MatchClusterMeta {
  clusterId: string;
  matchKeys: string[];
  instanceIds: string[];
  sourceLabels: string[];
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeResumeRef(value: string) {
  const trimmed = value.trim().toLowerCase();
  const parts = trimmed.split(/[/\\]/);
  return parts[parts.length - 1] ?? trimmed;
}

function normalizePhoneKey(phone: string) {
  const normalized = normalizePhone(phone).value;
  if (normalized) {
    return normalized;
  }

  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits : phone.trim();
}

export function extractIdentityKeys(
  profile: PartialCandidateRecord,
  sourceLabel?: string
): IdentityKeys {
  const emails = Array.from(
    new Set((profile.emails ?? []).map(normalizeEmail).filter(Boolean))
  );
  const phones = Array.from(
    new Set((profile.phones ?? []).map(normalizePhoneKey).filter(Boolean))
  );
  const names = profile.full_name ? [normalizeName(profile.full_name)] : [];
  const resumeRefs = new Set<string>();

  if (profile.resume_ref) {
    resumeRefs.add(normalizeResumeRef(profile.resume_ref));
  }

  if (sourceLabel && /\.(pdf|txt)$/i.test(sourceLabel)) {
    resumeRefs.add(normalizeResumeRef(sourceLabel));
  }

  return {
    emails,
    phones,
    names,
    resumeRefs: Array.from(resumeRefs)
  };
}

function toMatchKeys(identity: IdentityKeys): Set<string> {
  const keys = new Set<string>();
  for (const email of identity.emails) {
    keys.add(`email:${email}`);
  }
  for (const phone of identity.phones) {
    keys.add(`phone:${phone}`);
  }
  for (const name of identity.names) {
    keys.add(`name:${name}`);
  }
  for (const resumeRef of identity.resumeRefs) {
    keys.add(`resume:${resumeRef}`);
  }
  return keys;
}

export function profilesShareIdentity(left: SourceProfile, right: SourceProfile): boolean {
  const leftKeys = toMatchKeys(extractIdentityKeys(left.profile, left.sourceLabel));
  const rightKeys = toMatchKeys(extractIdentityKeys(right.profile, right.sourceLabel));

  for (const key of leftKeys) {
    if (rightKeys.has(key)) {
      return true;
    }
  }

  return false;
}

class UnionFind {
  private readonly parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

  find(index: number): number {
    if (this.parent[index] === index) {
      return index;
    }

    this.parent[index] = this.find(this.parent[index]!);
    return this.parent[index]!;
  }

  union(left: number, right: number) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) {
      this.parent[rightRoot] = leftRoot;
    }
  }
}

export function clusterSourceProfiles(profiles: SourceProfile[]): SourceProfile[][] {
  if (!profiles.length) {
    return [];
  }

  const unionFind = new UnionFind(profiles.length);

  for (let left = 0; left < profiles.length; left += 1) {
    for (let right = left + 1; right < profiles.length; right += 1) {
      if (profilesShareIdentity(profiles[left]!, profiles[right]!)) {
        unionFind.union(left, right);
      }
    }
  }

  const grouped = new Map<number, SourceProfile[]>();
  for (let index = 0; index < profiles.length; index += 1) {
    const root = unionFind.find(index);
    const bucket = grouped.get(root) ?? [];
    bucket.push(profiles[index]!);
    grouped.set(root, bucket);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const leftLabel = left[0]?.sourceLabel ?? left[0]?.instanceId ?? '';
    const rightLabel = right[0]?.sourceLabel ?? right[0]?.instanceId ?? '';
    return leftLabel.localeCompare(rightLabel);
  });
}

export function summarizeCluster(cluster: SourceProfile[]): MatchClusterMeta {
  const matchKeys = new Set<string>();
  const instanceIds: string[] = [];
  const sourceLabels: string[] = [];

  for (const profile of cluster) {
    instanceIds.push(profile.instanceId);
    if (profile.sourceLabel) {
      sourceLabels.push(profile.sourceLabel);
    }

    for (const key of toMatchKeys(extractIdentityKeys(profile.profile, profile.sourceLabel))) {
      matchKeys.add(key);
    }
  }

  const seed = cluster[0]?.profile.emails?.[0] ?? cluster[0]?.profile.full_name ?? cluster[0]?.instanceId ?? 'unknown';

  return {
    clusterId: `cluster-${seed}`.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase(),
    matchKeys: Array.from(matchKeys).sort(),
    instanceIds,
    sourceLabels: Array.from(new Set(sourceLabels)).sort()
  };
}
