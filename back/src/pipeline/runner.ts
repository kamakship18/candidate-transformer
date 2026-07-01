import { ingestSources, type RawSourceInputs } from './ingest';
import { extractProfilesFromBundle } from './extractors';
import { clusterSourceProfiles, summarizeCluster } from './identity/match';
import { normalizePartialProfile } from './normalizers';
import { mergePartialProfiles } from './merger';
import { computeOverallConfidence } from './scorer';
import { project, ProjectionError } from './projector';
import { validateOutput } from './validator';
import type {
  CandidateRecord,
  OutputConfig,
  PipelineError,
  PipelineStage,
  ProjectedOutput,
  SourceProfile,
  SourceType,
} from './types';

export interface PipelineResult {
  profile: ProjectedOutput;
  canonical: CandidateRecord;
  candidates: CandidateRecord[];
  errors: PipelineError[];
}

export type StageCallback = (stage: PipelineStage, status: 'running' | 'done' | 'error') => void;

export interface PipelineOptions {
  onStage?: StageCallback;
}

/**
 * Default output config — returns all canonical fields with provenance.
 */
export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  merge_policy: 'csv_resume_agreement',
  min_field_confidence: 0.75,
  fields: [
    { path: 'candidate_id', type: 'string', include: true },
    { path: 'full_name', type: 'string', include: true },
    { path: 'emails', type: 'string[]', include: true },
    { path: 'phones', type: 'string[]', include: true },
    { path: 'location', type: 'object', include: true },
    { path: 'headline', type: 'string', include: true },
    { path: 'years_experience', type: 'number', include: true },
    { path: 'skills', type: 'object', include: true },
    { path: 'experience', type: 'object', include: true },
    { path: 'education', type: 'object', include: true }
  ],
  include_confidence: true,
  include_provenance: true,
  on_missing: 'omit',
};

/**
 * Runs the full pipeline:
 * Ingest → Extract → Normalize → Match → Merge → Score → Project → Validate → Emit
 *
 * Never throws — all errors are collected and returned.
 */
export async function runPipeline(
  inputs: RawSourceInputs,
  config: OutputConfig = DEFAULT_OUTPUT_CONFIG,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onStage } = options;
  const allErrors: PipelineError[] = [];
  let bundles: Awaited<ReturnType<typeof ingestSources>> = [];

  // ─── STAGE 1: INGEST ────────────────────────────────────────────────────────
  onStage?.('ingest', 'running');
  try {
    bundles = await ingestSources(inputs);
    for (const bundle of bundles) {
      allErrors.push(...bundle.errors);
    }
    onStage?.('ingest', 'done');
  } catch (e) {
    onStage?.('ingest', 'error');
    allErrors.push({
      stage: 'ingest',
      code: 'INGEST_FATAL',
      message: e instanceof Error ? e.message : 'Unknown ingest error',
      details: e,
    });
    bundles = [];
  }

  // ─── STAGE 2: EXTRACT ───────────────────────────────────────────────────────
  onStage?.('extract', 'running');
  const sourceProfiles: SourceProfile[] = [];

  for (const bundle of bundles) {
    if (bundle.rawData === null || bundle.rawData === undefined) {
      continue;
    }

    try {
      const profiles = await extractProfilesFromBundle(bundle);
      sourceProfiles.push(...profiles.filter((profile) => Object.keys(profile.profile).length > 0));
    } catch (e) {
      allErrors.push({
        stage: 'extract',
        source: bundle.type as SourceType,
        code: 'EXTRACTION_ERROR',
        message: e instanceof Error ? e.message : 'Extraction failed',
        details: e,
      });
    }
  }

  onStage?.('extract', sourceProfiles.length > 0 ? 'done' : 'error');

  // ─── STAGE 3: NORMALIZE ─────────────────────────────────────────────────────
  onStage?.('normalize', 'running');
  const normalizedProfiles: SourceProfile[] = [];

  for (const sp of sourceProfiles) {
    try {
      const normalized = normalizePartialProfile(sp.profile);
      normalizedProfiles.push({ ...sp, profile: normalized });
    } catch (e) {
      normalizedProfiles.push(sp);
      allErrors.push({
        stage: 'normalize',
        source: sp.source,
        code: 'NORMALIZE_ERROR',
        message: e instanceof Error ? e.message : 'Normalization failed',
        details: e,
      });
    }
  }

  onStage?.('normalize', 'done');

  // ─── STAGE 4: MERGE (identity-aware clustering) ─────────────────────────────
  onStage?.('merge', 'running');
  const attemptedTypes = Array.from(new Set(bundles.map((b) => b.type as SourceType))).sort() as SourceType[];
  let candidates: CandidateRecord[] = [];

  try {
    const clusters = clusterSourceProfiles(normalizedProfiles);

    if (clusters.length === 0) {
      candidates = [createEmptyRecord(attemptedTypes, allErrors)];
    } else {
      candidates = clusters.map((cluster) => {
        const merged = mergePartialProfiles(cluster, {
          policy: config.merge_policy ?? 'csv_resume_agreement'
        });
        const summary = summarizeCluster(cluster);
        merged.pipeline_meta.matched_instances = summary.instanceIds;
        merged.pipeline_meta.match_keys = summary.matchKeys;
        merged.pipeline_meta.errors = [...allErrors];
        merged.pipeline_meta.sources_attempted = attemptedTypes;
        return merged;
      });
    }

    onStage?.('merge', 'done');
  } catch (e) {
    onStage?.('merge', 'error');
    allErrors.push({
      stage: 'merge',
      code: 'MERGE_ERROR',
      message: e instanceof Error ? e.message : 'Merge failed',
      details: e,
    });
    candidates = [createEmptyRecord(attemptedTypes, allErrors)];
  }

  const canonical = candidates[0] ?? createEmptyRecord(attemptedTypes, allErrors);

  // ─── STAGE 5: SCORE ─────────────────────────────────────────────────────────
  onStage?.('score', 'running');
  try {
    for (const candidate of candidates) {
      candidate.overall_confidence = computeOverallConfidence(candidate);
    }
    canonical.overall_confidence = candidates[0]?.overall_confidence ?? 0;
    onStage?.('score', 'done');
  } catch (e) {
    onStage?.('score', 'error');
    for (const candidate of candidates) {
      candidate.overall_confidence = 0;
    }
    allErrors.push({
      stage: 'score',
      code: 'SCORE_ERROR',
      message: e instanceof Error ? e.message : 'Scoring failed',
      details: e,
    });
  }

  // ─── STAGE 6: PROJECT ───────────────────────────────────────────────────────
  onStage?.('project', 'running');
  let projected: ProjectedOutput = {};

  try {
    projected = project(canonical, config);
    onStage?.('project', 'done');
  } catch (e) {
    onStage?.('project', 'error');
    const isProjectionError = e instanceof ProjectionError;
    allErrors.push({
      stage: 'project',
      code: isProjectionError ? 'REQUIRED_FIELD_MISSING' : 'PROJECTION_ERROR',
      message: e instanceof Error ? e.message : 'Projection failed',
      details: e,
    });

    try {
      projected = project(canonical, { ...config, on_missing: 'null' });
    } catch {
      projected = {};
    }
  }

  // ─── STAGE 7: VALIDATE ──────────────────────────────────────────────────────
  onStage?.('validate', 'running');
  try {
    const validationResult = validateOutput(projected, config);
    if (!validationResult.valid) {
      for (const error of validationResult.errors) {
        allErrors.push({
          stage: 'validate',
          code: 'VALIDATION_ERROR',
          message: error,
        });
      }
    }
    onStage?.('validate', 'done');
  } catch (e) {
    onStage?.('validate', 'error');
    allErrors.push({
      stage: 'validate',
      code: 'VALIDATE_ERROR',
      message: e instanceof Error ? e.message : 'Validation failed',
      details: e,
    });
  }

  // ─── STAGE 8: EMIT ──────────────────────────────────────────────────────────
  onStage?.('emit', 'running');
  for (const candidate of candidates) {
    candidate.pipeline_meta.errors = allErrors;
  }
  onStage?.('emit', 'done');

  return {
    profile: projected,
    canonical,
    candidates,
    errors: allErrors,
  };
}

function createEmptyRecord(sourcesAttempted: SourceType[], errors: PipelineError[]): CandidateRecord {
  return {
    candidate_id: 'candidate-empty',
    full_name: null,
    emails: [],
    phones: [],
    location: null,
    links: {},
    headline: null,
    years_experience: null,
    skills: [],
    experience: [],
    education: [],
    provenance: [],
    overall_confidence: 0,
    pipeline_meta: {
      processed_at: new Date().toISOString(),
      sources_attempted: sourcesAttempted,
      sources_succeeded: [],
      errors,
    },
  };
}
