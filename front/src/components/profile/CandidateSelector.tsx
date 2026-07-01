import { usePipelineStore } from '../../store/pipeline.store';

export function CandidateSelector() {
  const candidates = usePipelineStore((s) => s.candidates);
  const selectedCandidateIndex = usePipelineStore((s) => s.selectedCandidateIndex);
  const selectCandidate = usePipelineStore((s) => s.selectCandidate);
  const status = usePipelineStore((s) => s.status);

  if (status === 'idle' || candidates.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-text-secondary">
          Matched candidates ({candidates.length})
        </p>
        <span className="text-[10px] text-text-muted">
          Merged by email, phone, name, or resume filename
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {candidates.map((candidate, index) => {
          const label =
            candidate.full_name ??
            candidate.emails[0] ??
            candidate.phones[0] ??
            `Candidate ${index + 1}`;
          const isSelected = index === selectedCandidateIndex;

          return (
            <button
              key={candidate.candidate_id}
              type="button"
              onClick={() => selectCandidate(index)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border',
                isSelected
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-surface-2 text-text-secondary border-border hover:border-border-hover',
              ].join(' ')}
            >
              {label}
              <span className="ml-2 text-[10px] text-text-muted tabular-nums">
                {(candidate.overall_confidence * 100).toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
