import { usePipelineStore } from '../../store/pipeline.store';
import { Button } from '../ui/Button';
import { downloadJSON } from '../../utils/download';

interface RawJsonViewProps {
  showProjected?: boolean;
}

export function RawJsonView({ showProjected = true }: RawJsonViewProps) {
  const canonical = usePipelineStore((s) => s.canonicalRecord);
  const projected = usePipelineStore((s) => s.projectedOutput);

  const data = showProjected ? projected : canonical;
  const label = showProjected ? 'projected output' : 'canonical record';
  const filename = showProjected ? 'projected-output.json' : 'canonical-record.json';

  if (!data) {
    return (
      <div className="text-xs text-text-muted italic px-1">No data yet — run the pipeline first</div>
    );
  }

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted capitalize">{label}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadJSON(data, filename)}
          leftIcon={
            <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
              <path d="M6 2v6M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 10h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          }
        >
          Download JSON
        </Button>
      </div>
      <pre className="text-xs font-mono text-text-secondary bg-surface-3 border border-border rounded-lg p-3 overflow-auto max-h-[500px] scrollbar-thin leading-relaxed whitespace-pre-wrap">
        {jsonString}
      </pre>
    </div>
  );
}
