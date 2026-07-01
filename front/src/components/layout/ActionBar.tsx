import { useCallback } from 'react';
import { usePipelineStore } from '../../store/pipeline.store';
import { Button } from '../ui/Button';
import { PipelineStatus } from './PipelineStatus';

interface ActionBarProps {
  onOpenOutput: () => void;
}

function sourceSummary(sources: ReturnType<typeof usePipelineStore.getState>['sources']) {
  const items: string[] = [];
  if (sources.csv.length) items.push(`${sources.csv.length} CSV`);
  if (sources.ats_json.length) items.push(`${sources.ats_json.length} ATS`);
  if (sources.resume.length) items.push(`${sources.resume.length} resume`);
  if (sources.notes.length) items.push(`${sources.notes.length} notes`);
  if (sources.github_username.trim()) items.push('GitHub');
  return items;
}

export function ActionBar({ onOpenOutput }: ActionBarProps) {
  const status = usePipelineStore((s) => s.status);
  const runPipeline = usePipelineStore((s) => s.runPipeline);
  const loadSamples = usePipelineStore((s) => s.loadSamples);
  const sources = usePipelineStore((s) => s.sources);
  const candidates = usePipelineStore((s) => s.candidates);
  const isRunning = status === 'running';

  const hasAnySources =
    sources.csv.length > 0 ||
    sources.ats_json.length > 0 ||
    sources.notes.length > 0 ||
    sources.resume.length > 0 ||
    sources.github_username.trim() !== '';

  const summary = sourceSummary(sources);

  const handleLoadAndRun = useCallback(async () => {
    await loadSamples();
    setTimeout(() => runPipeline(), 80);
  }, [loadSamples, runPipeline]);

  return (
    <div className="sticky top-14 z-30 border-b border-border/50 bg-gradient-to-b from-surface/95 to-bg/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3">
        <div className="panel-gradient-elevated rounded-xl px-4 py-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-0.5">
                Pipeline
              </p>
              <p className="text-sm text-text-secondary truncate">
                {summary.length > 0 ? (
                  <>
                    <span className="text-text-primary font-medium">{summary.join(' · ')}</span>
                    {candidates.length > 0 && (
                      <span className="text-text-muted">
                        {' '}
                        → {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-text-muted">No sources loaded — upload files or load samples</span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
              {!hasAnySources && (
                <>
                  <Button variant="ghost" size="sm" onClick={loadSamples}>
                    Load samples
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLoadAndRun}>
                    Load & run
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={onOpenOutput}>
                Output
              </Button>
              <Button
                id="run-pipeline-button"
                variant="primary"
                size="md"
                loading={isRunning}
                disabled={!hasAnySources || isRunning}
                onClick={runPipeline}
                className="min-w-[8.5rem] shadow-lg shadow-primary/25"
              >
                {isRunning ? 'Running…' : 'Run pipeline'}
              </Button>
            </div>
          </div>

          {status !== 'idle' && <PipelineStatus compact />}
        </div>
      </div>
    </div>
  );
}
