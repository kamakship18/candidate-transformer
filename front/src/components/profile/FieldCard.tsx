import { useState, useRef } from 'react';
import { ConfidenceMeter } from '../ui/ConfidenceMeter';
import { SourceBadge } from '../ui/Badge';
import type { ProvenanceRecord } from '@back/pipeline/types';

interface FieldCardProps {
  label: string;
  value: unknown;
  provenance?: ProvenanceRecord[];
  className?: string;
  canonicalPath?: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('city' in obj || 'region' in obj || 'country' in obj) {
      return [obj.city, obj.region, obj.country].filter(Boolean).join(', ') || '—';
    }
  }
  return JSON.stringify(value);
}

export function FieldCard({ label, value, provenance, className = '', canonicalPath }: FieldCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const filterPath = canonicalPath || label;
  const fieldProvenance = provenance?.filter((p) =>
    p.field === filterPath || p.field.startsWith(`${filterPath}[`) || p.field.startsWith(`${filterPath}.`)
  ) ?? [];

  const confidence =
    fieldProvenance.length > 0
      ? fieldProvenance.reduce((sum, p) => sum + p.confidence, 0) / fieldProvenance.length
      : null;

  const isConflicted = fieldProvenance.some((p) => p.conflicted);
  const conflictReasons = Array.from(
    new Set(
      fieldProvenance
        .map((p) => p.conflictReason)
        .filter((reason): reason is string => Boolean(reason))
    )
  );
  const isEmpty = value === null || value === undefined || value === '';
  const sources = Array.from(new Set(fieldProvenance.map((p) => p.source)));
  const isExpandable = fieldProvenance.length > 0 && (!isEmpty || isConflicted);

  return (
    <div
      ref={cardRef}
      className={[
        'rounded-lg border transition-all duration-150',
        isConflicted
          ? 'border-l-[3px] border-l-warning border-border bg-warning/[0.03]'
          : 'border-border bg-surface',
        isExpandable ? 'cursor-pointer hover:border-border-hover' : '',
        expanded ? 'bg-surface-2' : '',
        className,
      ].join(' ')}
      onClick={() => isExpandable && setExpanded((v) => !v)}
      role={isExpandable ? 'button' : undefined}
      tabIndex={isExpandable ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && isExpandable && setExpanded((v) => !v)}
      aria-expanded={isExpandable ? expanded : undefined}
    >
      <div className="px-3 py-2.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-xs font-mono text-text-muted leading-none pt-0.5">{label}</span>
          <div className="flex items-center gap-1 flex-wrap justify-end flex-shrink-0">
            {isConflicted && (
              <span
                className="text-[10px] text-warning font-medium cursor-help"
                title={conflictReasons.join('\n') || 'Sources disagree'}
              >
                ⚠ conflict
              </span>
            )}
            {sources.slice(0, 3).map((s) => (
              <SourceBadge key={s} source={s} />
            ))}
            {sources.length > 3 && (
              <span className="text-xs text-text-muted">+{sources.length - 3}</span>
            )}
          </div>
        </div>

        {/* Value */}
        <p
          className={[
            'text-sm font-medium leading-snug',
            isEmpty ? 'text-text-muted italic' : 'text-text-primary',
          ].join(' ')}
        >
          {formatValue(value)}
        </p>

        {/* Confidence bar */}
        {confidence !== null && (
          <div className="mt-2">
            <ConfidenceMeter value={confidence} showLabel height="xs" />
          </div>
        )}

        {/* Expand hint */}
        {isExpandable && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-text-muted">
              {fieldProvenance.length} provenance record{fieldProvenance.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-text-muted">
              {expanded ? '▲ collapse' : '▼ expand'}
            </span>
          </div>
        )}
      </div>

      {/* Expanded provenance rows */}
      {expanded && fieldProvenance.length > 0 && (
        <div className="border-t border-border animate-fade-in-up">
          {fieldProvenance.map((p, i) => (
            <div
              key={i}
              className="px-3 py-2 flex items-start gap-2 text-xs border-b border-border/40 last:border-0 hover:bg-surface-3 transition-colors"
            >
              <SourceBadge source={p.source} />
              <span
                className={[
                  'font-mono flex-shrink-0 w-20',
                  p.method === 'direct'     ? 'text-success'  : '',
                  p.method === 'inferred'   ? 'text-warning'  : '',
                  p.method === 'normalized' ? 'text-info'     : '',
                  p.method === 'merged'     ? 'text-primary'  : '',
                ].join(' ')}
              >
                {p.method}
              </span>
              <span className="text-text-muted font-mono flex-1 truncate text-[11px]">
                {typeof p.rawValue === 'string'
                  ? p.rawValue
                  : JSON.stringify(p.rawValue).slice(0, 80)}
              </span>
              <span
                className="font-mono flex-shrink-0 text-[11px]"
                style={{
                  color:
                    p.confidence >= 0.8 ? '#10B981' :
                    p.confidence >= 0.5 ? '#F59E0B' : '#EF4444',
                }}
              >
                {p.confidence.toFixed(3)}
              </span>
            </div>
          ))}
          {isConflicted && (
            <div className="px-3 py-1.5 text-[11px] text-warning bg-warning/5 space-y-1">
              <div className="font-semibold">⚠ Conflict details:</div>
              {conflictReasons.length > 0 ? (
                <ul className="list-disc pl-4 space-y-0.5">
                  {conflictReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              ) : (
                <div>Sources disagree — highest-weight source value wins</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
