import { usePipelineStore } from '../../store/pipeline.store';
import { ConfidenceMeter } from '../ui/ConfidenceMeter';
import { FieldCard } from './FieldCard';

// ─── ProfileView ──────────────────────────────────────────────────────────────
export function ProfileView() {
  const canonical = usePipelineStore((s) => s.canonicalRecord);
  const projected = usePipelineStore((s) => s.projectedOutput);
  const config = usePipelineStore((s) => s.outputConfig);
  const status = usePipelineStore((s) => s.status);

  if (!canonical || status === 'idle') return null;

  const { provenance } = canonical;
  const confColor =
    canonical.overall_confidence >= 0.8 ? '#10B981' :
    canonical.overall_confidence >= 0.5 ? '#F59E0B' : '#EF4444';

  const getProjectedValue = (baseField: string, defaultValue: any) => {
    if (!projected) return defaultValue;
    const configField = config?.fields?.find(
      (f) =>
        f.path === baseField ||
        (f.from &&
          (f.from === baseField ||
            f.from.startsWith(baseField + '[') ||
            f.from.startsWith(baseField + '.')))
    );
    if (configField && configField.include !== false && configField.path in projected) {
      const val = projected[configField.path];
      if (Array.isArray(val)) {
        return val[0] ?? null;
      }
      return val;
    }
    return null;
  };

  const isFieldIncluded = (baseField: string) => {
    if (!projected) return true;
    const configField = config?.fields?.find(
      (f) =>
        f.path === baseField ||
        (f.from &&
          (f.from === baseField ||
            f.from.startsWith(baseField + '[') ||
            f.from.startsWith(baseField + '.')))
    );
    if (configField) {
      return configField.include !== false && configField.path in projected;
    }
    return false;
  };

  const emailVal = getProjectedValue('emails', canonical.emails[0]);
  const yearsVal = getProjectedValue('years_experience', canonical.years_experience);
  const locationVal = getProjectedValue('location', canonical.location);

  const formattedLocation = locationVal && typeof locationVal === 'object'
    ? [locationVal.city, locationVal.region, locationVal.country].filter(Boolean).join(', ')
    : locationVal;

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Candidate card */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-text-primary leading-tight">
              {canonical.full_name ?? (
                <span className="text-text-muted italic text-base">Unknown Name</span>
              )}
            </h2>
            {canonical.headline && (
              <p className="text-sm text-text-secondary mt-0.5 leading-snug">{canonical.headline}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {isFieldIncluded('location') && formattedLocation && (
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <span>📍</span>
                  {formattedLocation}
                </span>
              )}
              {isFieldIncluded('years_experience') && yearsVal !== null && (
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <span>🗓</span>
                  {yearsVal}y experience
                </span>
              )}
              {isFieldIncluded('emails') && emailVal && (
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <span>✉</span>
                  {emailVal}
                </span>
              )}
            </div>
          </div>

          {/* Confidence badge */}
          <div className="flex-shrink-0 text-center min-w-[80px]">
            <div className="text-[11px] text-text-muted mb-1 uppercase tracking-wide">Confidence</div>
            <div className="text-2xl font-bold font-mono leading-none" style={{ color: confColor }}>
              {(canonical.overall_confidence * 100).toFixed(0)}%
            </div>
            <div className="mt-1.5 w-20">
              <ConfidenceMeter value={canonical.overall_confidence} height="xs" />
            </div>
          </div>
        </div>

        {/* Links */}
        {Object.keys(canonical.links).length > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            {canonical.links.github && (
              <a
                href={canonical.links.github}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-source-github hover:underline flex items-center gap-1 transition-opacity hover:opacity-80"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                GitHub
              </a>
            )}
            {canonical.links.linkedin && (
              <a
                href={canonical.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-source-linkedin hover:underline flex items-center gap-1 transition-opacity hover:opacity-80"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
                </svg>
                LinkedIn
              </a>
            )}
            {canonical.links.portfolio && (
              <a
                href={canonical.links.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-info hover:underline flex items-center gap-1"
              >
                🔗 Portfolio
              </a>
            )}
          </div>
        )}
      </div>

      {/* Key fields */}
      <div className="grid grid-cols-1 gap-2">
        {projected ? (
          Object.keys(projected)
            .filter(
              (key) =>
                ![
                  'skills',
                  'experience',
                  'education',
                  '_confidence',
                  '_provenance',
                  'candidate_id',
                ].includes(key)
            )
            .map((key) => {
              const configField = config?.fields?.find((f) => f.path === key);
              const canonicalPath = configField?.from ?? key;
              return (
                <FieldCard
                  key={key}
                  label={key}
                  value={projected[key]}
                  provenance={provenance}
                  canonicalPath={canonicalPath}
                />
              );
            })
        ) : (
          <>
            <FieldCard label="full_name"       value={canonical.full_name}          provenance={provenance} />
            <FieldCard label="emails"          value={canonical.emails}             provenance={provenance} />
            <FieldCard label="phones"          value={canonical.phones}             provenance={provenance} />
            <FieldCard label="headline"        value={canonical.headline}           provenance={provenance} />
            <FieldCard label="years_experience" value={canonical.years_experience}  provenance={provenance} />
            {canonical.location && (
              <FieldCard
                label="location"
                value={[canonical.location.city, canonical.location.region, canonical.location.country]
                  .filter(Boolean)
                  .join(', ')}
                provenance={provenance}
              />
            )}
          </>
        )}
      </div>


      {/* Pipeline meta */}
      <div className="rounded-lg border border-border/50 bg-surface/50 px-3 py-2">
        <div className="flex items-center gap-4 flex-wrap text-xs text-text-muted">
          <span>Processed: {new Date(canonical.pipeline_meta.processed_at).toLocaleTimeString()}</span>
          <span>
            Sources: {canonical.pipeline_meta.sources_succeeded.length}/
            {canonical.pipeline_meta.sources_attempted.length} succeeded
          </span>
          {canonical.pipeline_meta.errors.length > 0 && (
            <span className="text-warning">
              ⚠ {canonical.pipeline_meta.errors.length} issue
              {canonical.pipeline_meta.errors.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
