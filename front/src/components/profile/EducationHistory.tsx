import { usePipelineStore } from '../../store/pipeline.store';
import type { CandidateEducation } from '@back/pipeline/types';

interface EducationCardProps {
  edu: CandidateEducation;
}

export function EducationCard({ edu }: EducationCardProps) {
  return (
    <div className="flex items-start gap-3 group animate-fade-in-up">
      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 16 16">
          <path d="M8 2L1 5.5l7 3.5 7-3.5L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M4 7.5v4c0 1 1.5 2 4 2s4-1 4-2v-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary leading-tight">{edu.institution}</p>
        <p className="text-xs text-text-secondary mt-0.5">
          {[edu.degree, edu.field].filter(Boolean).join(' in ')}
        </p>
        {edu.end_year && (
          <p className="text-xs text-text-muted mt-1 font-mono">{edu.end_year}</p>
        )}
      </div>
    </div>
  );
}

export function EducationHistory() {
  const canonical = usePipelineStore((s) => s.canonicalRecord);

  if (!canonical || canonical.education.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <svg className="w-8 h-8 text-text-muted opacity-30" fill="none" viewBox="0 0 24 24">
          <path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-xs text-text-muted italic">No education records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canonical.education.map((edu, i) => (
        <EducationCard key={i} edu={edu} />
      ))}
    </div>
  );
}
