import { create } from 'zustand';
import { runPipeline, DEFAULT_OUTPUT_CONFIG, type PipelineResult } from '@back/pipeline/runner';
import { project } from '@back/pipeline/projector';
import { validateOutputConfig } from '@back/pipeline/validator';
import type { OutputConfig, PipelineError, PipelineStage, CandidateRecord, ProjectedOutput } from '@back/pipeline/types';

type StageStatus = 'pending' | 'running' | 'done' | 'error';

const ALL_STAGES: PipelineStage[] = [
  'ingest', 'extract', 'normalize', 'merge', 'score', 'project', 'validate', 'emit'
];

function initialStageStatuses(): Record<PipelineStage, StageStatus> {
  return Object.fromEntries(ALL_STAGES.map((s) => [s, 'pending'])) as Record<PipelineStage, StageStatus>;
}

interface SourceState {
  csv: File[];
  ats_json: File[];
  github_username: string;
  notes: File[];
  resume: File[];
}

type FileSourceKey = 'csv' | 'ats_json' | 'notes' | 'resume';

interface PipelineStore {
  sources: SourceState;
  outputConfig: OutputConfig;
  status: 'idle' | 'running' | 'success' | 'error';
  currentStage: PipelineStage | null;
  stageStatuses: Record<PipelineStage, StageStatus>;
  candidates: CandidateRecord[];
  selectedCandidateIndex: number;
  canonicalRecord: CandidateRecord | null;
  projectedOutput: ProjectedOutput | null;
  pipelineErrors: PipelineError[];
  lastResult: PipelineResult | null;
  gitHubRateLimitWarning: string | null;
  setSourceFiles: (type: FileSourceKey, files: File[]) => void;
  setGithubUsername: (username: string) => void;
  setOutputConfig: (config: OutputConfig) => void;
  selectCandidate: (index: number) => void;
  runPipeline: () => Promise<void>;
  reset: () => void;
  loadSamples: () => void;
}

const defaultSources: SourceState = {
  csv: [],
  ats_json: [],
  github_username: '',
  notes: [],
  resume: [],
};

function projectCandidate(candidate: CandidateRecord, config: OutputConfig): ProjectedOutput {
  try {
    return project(candidate, config);
  } catch {
    return project(candidate, { ...config, on_missing: 'null' });
  }
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  sources: { ...defaultSources },
  outputConfig: DEFAULT_OUTPUT_CONFIG,
  status: 'idle',
  currentStage: null,
  stageStatuses: initialStageStatuses(),
  candidates: [],
  selectedCandidateIndex: 0,
  canonicalRecord: null,
  projectedOutput: null,
  pipelineErrors: [],
  lastResult: null,
  gitHubRateLimitWarning: null,

  setSourceFiles: (type, files) => {
    set((state) => ({
      sources: {
        ...state.sources,
        [type]: files,
      },
    }));
  },

  setGithubUsername: (username) => {
    set((state) => ({
      sources: {
        ...state.sources,
        github_username: username,
      },
    }));
  },

  setOutputConfig: (config) => {
    const { canonicalRecord } = get();
    set({
      outputConfig: config,
      projectedOutput: canonicalRecord ? projectCandidate(canonicalRecord, config) : null,
    });
  },

  selectCandidate: (index) => {
    const { candidates, outputConfig } = get();
    const candidate = candidates[index];
    if (!candidate) {
      return;
    }

    set({
      selectedCandidateIndex: index,
      canonicalRecord: candidate,
      projectedOutput: projectCandidate(candidate, outputConfig),
    });
  },

  runPipeline: async () => {
    const { sources, outputConfig } = get();

    set({
      status: 'running',
      currentStage: 'ingest',
      stageStatuses: initialStageStatuses(),
      candidates: [],
      selectedCandidateIndex: 0,
      canonicalRecord: null,
      projectedOutput: null,
      pipelineErrors: [],
      lastResult: null,
      gitHubRateLimitWarning: null,
    });

    try {
      const result = await runPipeline(
        {
          csv: sources.csv,
          ats_json: sources.ats_json,
          github_username: sources.github_username || null,
          notes: sources.notes,
          resume: sources.resume,
        },
        outputConfig,
        {
          onStage: (stage, status) => {
            set((state) => ({
              currentStage: status === 'running' ? stage : state.currentStage,
              stageStatuses: {
                ...state.stageStatuses,
                [stage]: status,
              },
            }));
          },
        }
      );

      const rateLimitError = result.errors.find((e) => e.code === 'RATE_LIMIT');
      const gitHubRateLimitWarning = rateLimitError
        ? 'GitHub API rate limit exceeded. GitHub source was skipped.'
        : null;

      const hasErrors = result.errors.some(
        (e) => e.code !== 'NORMALIZATION_WARNING' && e.code !== 'RATE_LIMIT'
      );

      const selected = result.candidates[0] ?? result.canonical;

      set({
        status: hasErrors ? 'error' : 'success',
        candidates: result.candidates,
        selectedCandidateIndex: 0,
        canonicalRecord: selected,
        projectedOutput: projectCandidate(selected, outputConfig),
        pipelineErrors: result.errors,
        lastResult: result,
        gitHubRateLimitWarning,
      });
    } catch (e) {
      set({
        status: 'error',
        pipelineErrors: [
          {
            stage: 'ingest',
            code: 'PIPELINE_FATAL',
            message: e instanceof Error ? e.message : 'Unexpected pipeline error',
            details: e,
          },
        ],
      });
    }
  },

  reset: () => {
    set({
      sources: { ...defaultSources },
      outputConfig: DEFAULT_OUTPUT_CONFIG,
      status: 'idle',
      currentStage: null,
      stageStatuses: initialStageStatuses(),
      candidates: [],
      selectedCandidateIndex: 0,
      canonicalRecord: null,
      projectedOutput: null,
      pipelineErrors: [],
      lastResult: null,
      gitHubRateLimitWarning: null,
    });
  },

  loadSamples: async () => {
    try {
      const configResponse = await fetch('/output_config.json');
      const configJson = await configResponse.json();
      const validated = validateOutputConfig(configJson);
      if (validated.valid && validated.config) {
        set({ outputConfig: validated.config });
      }

      const csvResponse = await fetch('/sample_inputs/recruiter_export.csv');
      const csvText = await csvResponse.text();
      const csvFile = new File([csvText], 'recruiter_export.csv', { type: 'text/csv' });

      const atsResponse = await fetch('/sample_inputs/ats_blob.json');
      const atsText = await atsResponse.text();
      const atsFile = new File([atsText], 'ats_blob.json', { type: 'application/json' });

      const notesResponse = await fetch('/sample_inputs/recruiter_notes.txt');
      const notesText = await notesResponse.text();
      const notesFile = new File([notesText], 'recruiter_notes.txt', { type: 'text/plain' });

      const resumeResponse = await fetch('/sample_inputs/resume_sample.txt');
      const resumeText = await resumeResponse.text();
      const resumeFile = new File([resumeText], 'resume_sample.txt', { type: 'text/plain' });

      set({
        sources: {
          csv: [csvFile],
          ats_json: [atsFile],
          github_username: 'arjunsharma',
          notes: [notesFile],
          resume: [resumeFile],
        },
      });
    } catch (e) {
      console.error('Failed to load sample inputs:', e);
    }
  },
}));
