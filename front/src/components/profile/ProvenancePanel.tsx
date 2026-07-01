import { useState } from 'react';
import { usePipelineStore } from '../../store/pipeline.store';
import { SourceBadge } from '../ui/Badge';
import type { SourceType } from '@back/pipeline/types';

const ALL_SOURCES: SourceType[] = ['csv', 'ats_json', 'github', 'linkedin', 'resume', 'notes'];

export function ProvenancePanel() {
  const canonical = usePipelineStore((s) => s.canonicalRecord);
  const [filterSources, setFilterSources] = useState<Set<SourceType>>(new Set(ALL_SOURCES));

  if (!canonical || canonical.provenance.length === 0) {
    return <div className="text-xs text-text-muted italic px-1">No provenance data</div>;
  }

  const toggleSource = (source: SourceType) => {
    const next = new Set(filterSources);
    if (next.has(source)) {
      if (next.size > 1) next.delete(source);
    } else {
      next.add(source);
    }
    setFilterSources(next);
  };

  const filtered = canonical.provenance.filter((p) => filterSources.has(p.source));

  return (
    <div className="space-y-3">
      {/* Source filter */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_SOURCES.map((s) => (
          <button
            key={s}
            onClick={() => toggleSource(s)}
            className={[
              'transition-opacity duration-150',
              filterSources.has(s) ? 'opacity-100' : 'opacity-30',
            ].join(' ')}
            aria-pressed={filterSources.has(s)}
          >
            <SourceBadge source={s} />
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-3 py-2 text-text-muted font-medium">Field</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Source</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Method</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium max-w-[120px]">Raw Value</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={i}
                className={[
                  'border-b border-border/50 hover:bg-surface-2 transition-colors',
                  p.conflicted ? 'bg-warning/5' : '',
                ].join(' ')}
              >
                <td className="px-3 py-1.5 font-mono text-text-secondary max-w-[120px] truncate">
                  {p.conflicted && (
                    <span className="text-warning mr-1 cursor-help" title={p.conflictReason || 'Conflict'}>
                      ⚠
                    </span>
                  )}
                  {p.field}
                </td>
                <td className="px-3 py-1.5">
                  <SourceBadge source={p.source} />
                </td>
                <td className="px-3 py-1.5">
                  <span className={[
                    'font-mono',
                    p.method === 'direct' ? 'text-success' : '',
                    p.method === 'inferred' ? 'text-warning' : '',
                    p.method === 'normalized' ? 'text-info' : '',
                    p.method === 'merged' ? 'text-primary' : '',
                  ].join(' ')}>
                    {p.method}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono text-text-muted max-w-[120px] truncate">
                  {typeof p.rawValue === 'string'
                    ? p.rawValue
                    : JSON.stringify(p.rawValue).slice(0, 60)}
                </td>
                <td className="px-3 py-1.5">
                  <span className="font-mono" style={{
                    color: p.confidence >= 0.8 ? '#10B981' : p.confidence >= 0.5 ? '#F59E0B' : '#EF4444'
                  }}>
                    {p.confidence.toFixed(3)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-xs text-text-muted text-center py-4">No provenance data for selected sources</p>
        )}
      </div>
    </div>
  );
}
