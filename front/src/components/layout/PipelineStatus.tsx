import { usePipelineStore } from '../../store/pipeline.store';
import type { PipelineStage } from '@back/pipeline/types';

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'ingest', label: 'Ingest' },
  { id: 'extract', label: 'Extract' },
  { id: 'normalize', label: 'Normalize' },
  { id: 'merge', label: 'Merge' },
  { id: 'score', label: 'Score' },
  { id: 'project', label: 'Project' },
  { id: 'validate', label: 'Validate' },
  { id: 'emit', label: 'Emit' },
];

type StageStatus = 'pending' | 'running' | 'done' | 'error';

function StageIcon({ status }: { status: StageStatus }) {
  if (status === 'done') {
    return (
      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'error') {
    return (
      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
        <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === 'running') {
    return <span className="w-1 h-1 rounded-full bg-current animate-pulse" />;
  }
  return null;
}

function stageClasses(status: StageStatus): string {
  if (status === 'done') return 'text-success';
  if (status === 'error') return 'text-danger';
  if (status === 'running') return 'text-primary';
  return 'text-text-muted/50';
}

interface PipelineStatusProps {
  compact?: boolean;
}

export function PipelineStatus({ compact = false }: PipelineStatusProps) {
  const stageStatuses = usePipelineStore((s) => s.stageStatuses);
  const pipelineStatus = usePipelineStore((s) => s.status);

  if (pipelineStatus === 'idle') {
    return null;
  }

  if (compact) {
    const doneCount = STAGES.filter((stage) => stageStatuses[stage.id] === 'done').length;
    const runningStage = STAGES.find((stage) => stageStatuses[stage.id] === 'running');

    return (
      <div className="pt-2 border-t border-border/30">
        <div className="hidden md:flex items-center gap-0.5">
          {STAGES.map((stage, index) => {
            const status = stageStatuses[stage.id] ?? 'pending';
            return (
              <div key={stage.id} className="flex items-center flex-1 min-w-0">
                <div className={`flex items-center gap-1.5 min-w-0 ${stageClasses(status)}`}>
                  <div
                    className={[
                      'w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0',
                      status === 'done' ? 'border-success/40 bg-success/10' : '',
                      status === 'error' ? 'border-danger/40 bg-danger/10' : '',
                      status === 'running' ? 'border-primary/50 bg-primary/10 animate-pulse-ring' : '',
                      status === 'pending' ? 'border-border/60 bg-surface-2/50' : '',
                    ].join(' ')}
                  >
                    <StageIcon status={status} />
                  </div>
                  <span className="text-[10px] font-medium truncate hidden lg:inline">{stage.label}</span>
                </div>
                {index < STAGES.length - 1 && (
                  <div
                    className={[
                      'flex-1 h-px mx-1 min-w-[4px]',
                      stageStatuses[stage.id] === 'done' ? 'bg-success/25' : 'bg-border/40',
                    ].join(' ')}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="md:hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-text-muted uppercase tracking-wide">Progress</span>
            <span className="text-xs text-text-secondary font-medium">
              {runningStage?.label ?? (doneCount === STAGES.length ? 'Complete' : 'Processing')}
            </span>
          </div>
          <div className="h-1 bg-surface-2/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-500 rounded-full"
              style={{ width: `${(doneCount / STAGES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-gradient rounded-xl px-4 py-3">
      <div className="hidden sm:flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const status = stageStatuses[stage.id] ?? 'pending';
          return (
            <div key={stage.id} className="flex items-center flex-1">
              <div className={`flex flex-col items-center gap-1 ${stageClasses(status)}`}>
                <div
                  className={[
                    'w-6 h-6 rounded-full border flex items-center justify-center',
                    status === 'done' ? 'border-success bg-success/10' : '',
                    status === 'error' ? 'border-danger bg-danger/10' : '',
                    status === 'running' ? 'border-primary bg-primary/10 animate-pulse-ring' : '',
                    status === 'pending' ? 'border-border bg-surface-2' : '',
                  ].join(' ')}
                >
                  <StageIcon status={status} />
                </div>
                <span className="text-xs font-medium whitespace-nowrap">{stage.label}</span>
              </div>
              {index < STAGES.length - 1 && (
                <div
                  className={[
                    'flex-1 h-px mx-1',
                    stageStatuses[stage.id] === 'done' ? 'bg-success/30' : 'bg-border',
                  ].join(' ')}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
