import { usePipelineStore } from '../../store/pipeline.store';
import { Button } from '../ui/Button';

export function Header() {
  const status = usePipelineStore((s) => s.status);
  const reset = usePipelineStore((s) => s.reset);

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-bg/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/30 ring-1 ring-white/10">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7L5 4L8 7L12 3"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 11L5 8L8 11L12 7"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary leading-tight tracking-tight">
              Candidate Transformer
            </h1>
            <p className="text-[11px] text-text-muted leading-tight">
              Multi-source profile merge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'success' && (
            <span className="hidden sm:inline-flex text-xs text-success items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Done
            </span>
          )}
          {status === 'error' && (
            <span className="hidden sm:inline-flex text-xs text-warning items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 border border-warning/20">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              Warnings
            </span>
          )}
          {status !== 'idle' && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
