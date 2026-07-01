import { usePipelineStore } from '../../store/pipeline.store';
import type { CandidateExperience } from '@back/pipeline/types';

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  const s = start ?? '?';
  const e = end ?? 'Present';
  return `${s} → ${e}`;
}

function getDuration(start: string | null, end: string | null): string {
  if (!start) return '';
  const startDate = new Date(`${start}-01`);
  const endDate = end ? new Date(`${end}-01`) : new Date();
  if (isNaN(startDate.getTime())) return '';
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  if (months < 1) return '';
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const rem   = months % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
}

interface ExperienceEntryProps {
  exp: CandidateExperience;
  isLast: boolean;
}

function ExperienceEntry({ exp, isLast }: ExperienceEntryProps) {
  const duration = getDuration(exp.start, exp.end);
  const dateRange = formatDateRange(exp.start, exp.end);

  return (
    <div className="relative flex gap-3 group animate-fade-in-up">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-bg mt-1.5 group-hover:scale-110 transition-transform" />
        {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[1.5rem]" />}
      </div>

      {/* Content */}
      <div className={['flex-1 min-w-0', !isLast ? 'pb-4' : ''].join(' ')}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary leading-tight">{exp.title}</p>
            <p className="text-xs text-text-secondary mt-0.5">{exp.company}</p>
          </div>
          {dateRange && (
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-text-muted font-mono">{dateRange}</p>
              {duration && (
                <p className="text-[11px] text-text-muted opacity-70 mt-0.5">{duration}</p>
              )}
            </div>
          )}
        </div>
        {exp.summary && (
          <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{exp.summary}</p>
        )}
      </div>
    </div>
  );
}

export function ExperienceTimeline() {
  const canonical = usePipelineStore((s) => s.canonicalRecord);

  if (!canonical) return null;

  if (canonical.experience.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <svg className="w-8 h-8 text-text-muted opacity-30" fill="none" viewBox="0 0 24 24">
          <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-xs text-text-muted italic">No work experience found</p>
      </div>
    );
  }

  return (
    <div>
      {canonical.experience.map((exp, i) => (
        <ExperienceEntry
          key={i}
          exp={exp}
          isLast={i === canonical.experience.length - 1}
        />
      ))}
    </div>
  );
}
