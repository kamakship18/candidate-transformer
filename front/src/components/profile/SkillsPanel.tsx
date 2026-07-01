import { usePipelineStore } from '../../store/pipeline.store';
import { ConfidenceMeter } from '../ui/ConfidenceMeter';
import { SourceBadge } from '../ui/Badge';
import type { SourceType } from '@back/pipeline/types';

const SOURCE_ORDER: SourceType[] = ['ats_json', 'csv', 'linkedin', 'github', 'resume', 'notes'];

function getSkillTier(confidence: number): 'primary' | 'secondary' | 'marginal' {
  if (confidence >= 0.8) return 'primary';
  if (confidence >= 0.5) return 'secondary';
  return 'marginal';
}

const TIER_LABELS = {
  primary: 'High confidence',
  secondary: 'Medium confidence',
  marginal: 'Low confidence',
};

export function SkillsPanel() {
  const canonical = usePipelineStore((s) => s.canonicalRecord);

  if (!canonical || canonical.skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <svg className="w-8 h-8 text-text-muted opacity-30" fill="none" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-xs text-text-muted italic">No skills found across sources</p>
      </div>
    );
  }

  // Group by tier
  const tiers = {
    primary:   canonical.skills.filter((s) => getSkillTier(s.confidence) === 'primary'),
    secondary: canonical.skills.filter((s) => getSkillTier(s.confidence) === 'secondary'),
    marginal:  canonical.skills.filter((s) => getSkillTier(s.confidence) === 'marginal'),
  };

  return (
    <div className="space-y-4">
      {/* Sort sources legend */}
      <div className="flex items-center gap-2 flex-wrap">
        {SOURCE_ORDER.filter((s) =>
          canonical.skills.some((sk) => sk.sources.includes(s))
        ).map((s) => <SourceBadge key={s} source={s} />)}
        <span className="text-xs text-text-muted ml-auto">{canonical.skills.length} total</span>
      </div>

      {/* Tiers */}
      {(['primary', 'secondary', 'marginal'] as const).map((tier) => {
        if (tiers[tier].length === 0) return null;
        return (
          <div key={tier}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className={[
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  tier === 'primary'   ? 'bg-success'  : '',
                  tier === 'secondary' ? 'bg-warning'  : '',
                  tier === 'marginal'  ? 'bg-danger'   : '',
                ].join(' ')}
              />
              <span className="text-xs text-text-muted font-medium">{TIER_LABELS[tier]}</span>
              <span className="text-xs text-text-muted opacity-60">({tiers[tier].length})</span>
            </div>
            <div className="space-y-1.5 pl-3.5">
              {tiers[tier].map((skill) => (
                <div key={skill.name} className="flex items-center gap-2 group animate-fade-in-up">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-text-primary truncate">{skill.name}</span>
                      <span className="text-xs font-mono text-text-muted ml-2 flex-shrink-0 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                        {skill.confidence.toFixed(2)}
                      </span>
                    </div>
                    <ConfidenceMeter value={skill.confidence} height="xs" />
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 min-w-[4rem] justify-end">
                    {skill.sources.slice(0, 2).map((s) => (
                      <SourceBadge key={s} source={s} />
                    ))}
                    {skill.sources.length > 2 && (
                      <span className="text-xs text-text-muted">+{skill.sources.length - 2}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
