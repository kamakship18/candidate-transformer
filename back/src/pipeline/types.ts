export type SourceType = 'csv' | 'ats_json' | 'github' | 'linkedin' | 'notes' | 'resume';

export type ExtractionMethod = 'direct' | 'inferred' | 'normalized' | 'merged';

export type PipelineStage =
  | 'ingest'
  | 'extract'
  | 'normalize'
  | 'merge'
  | 'score'
  | 'project'
  | 'validate'
  | 'emit';

export interface PipelineError {
  stage: PipelineStage;
  source?: SourceType;
  code: string;
  message: string;
  details?: unknown;
}

export interface ProvenanceRecord {
  field: string;
  source: SourceType;
  method: ExtractionMethod;
  rawValue: unknown;
  confidence: number;
  conflicted?: boolean;
  conflictReason?: string;
}

export interface CandidateLocation {
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface CandidateLinkCollection {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  other?: string[];
}

export interface CandidateSkill {
  name: string;
  confidence: number;
  sources: SourceType[];
}

export interface CandidateExperience {
  company: string;
  title: string;
  start: string | null;
  end: string | null;
  summary: string | null;
}

export interface CandidateEducation {
  institution: string;
  degree: string | null;
  field: string | null;
  end_year: number | null;
}

export interface PipelineMeta {
  processed_at: string;
  sources_attempted: SourceType[];
  sources_succeeded: SourceType[];
  errors: PipelineError[];
  matched_instances?: string[];
  match_keys?: string[];
}

export interface CandidateRecord {
  candidate_id: string;
  full_name: string | null;
  emails: string[];
  phones: string[];
  location: CandidateLocation | null;
  links: CandidateLinkCollection;
  headline: string | null;
  years_experience: number | null;
  skills: CandidateSkill[];
  experience: CandidateExperience[];
  education: CandidateEducation[];
  provenance: ProvenanceRecord[];
  overall_confidence: number;
  pipeline_meta: PipelineMeta;
}

export interface PartialCandidateLocation {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface PartialCandidateRecord {
  candidate_id?: string | null;
  full_name?: string | null;
  emails?: string[];
  phones?: string[];
  location?: PartialCandidateLocation | null;
  links?: CandidateLinkCollection;
  headline?: string | null;
  years_experience?: number | null;
  skills?: CandidateSkill[];
  experience?: CandidateExperience[];
  education?: CandidateEducation[];
  provenance?: ProvenanceRecord[];
  resume_ref?: string | null;
}

export interface SourceBundle {
  type: SourceType;
  instanceId: string;
  sourceLabel: string;
  rawData: unknown;
  fetchedAt: string;
  errors: PipelineError[];
}

export interface SourceProfile {
  source: SourceType;
  instanceId: string;
  sourceLabel: string;
  profile: PartialCandidateRecord;
}

export interface NormalizationIssue {
  field: string;
  message: string;
}

export interface NormalizedValue<T> {
  value: T | null;
  method: ExtractionMethod;
  warnings: NormalizationIssue[];
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface OutputConfigField {
  path: string;
  from?: string;
  type: 'string' | 'string[]' | 'number' | 'boolean' | 'object';
  required?: boolean;
  normalize?: 'E164' | 'canonical' | 'ISO3166';
  include?: boolean;
}

export interface OutputConfig {
  fields: OutputConfigField[];
  include_confidence: boolean;
  include_provenance: boolean;
  on_missing: 'null' | 'omit' | 'error';
  merge_policy?: 'weighted' | 'csv_resume_agreement';
  min_field_confidence?: number;
}

export interface ProjectedOutput {
  [key: string]: unknown;
}