export { runPipeline, DEFAULT_OUTPUT_CONFIG } from './pipeline/runner';
export type { PipelineResult, PipelineOptions, StageCallback } from './pipeline/runner';
export { ingestSources } from './pipeline/ingest';
export type { RawSourceInputs } from './pipeline/ingest';
export { mergePartialProfiles } from './pipeline/merger';
export { project, ProjectionError } from './pipeline/projector';
export { validateOutput, validateOutputConfig, validateOutputConfigString } from './pipeline/validator';
export type {
  CandidateRecord,
  CandidateExperience,
  CandidateEducation,
  CandidateSkill,
  CandidateLocation,
  OutputConfig,
  PipelineError,
  PipelineStage,
  PartialCandidateRecord,
  ProjectedOutput,
  ProvenanceRecord,
  SourceProfile,
  SourceType
} from './pipeline/types';
