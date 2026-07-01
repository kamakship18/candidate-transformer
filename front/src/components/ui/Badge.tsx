import type { SourceType } from '@back/pipeline/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | SourceType;

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantMap: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  default:   { bg: 'bg-surface-2', text: 'text-text-secondary', dot: 'bg-text-muted' },
  success:   { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  warning:   { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  danger:    { bg: 'bg-danger/10', text: 'text-danger', dot: 'bg-danger' },
  info:      { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
  csv:       { bg: 'bg-source-csv/10', text: 'text-source-csv', dot: 'bg-source-csv' },
  ats_json:  { bg: 'bg-source-ats/10', text: 'text-source-ats', dot: 'bg-source-ats' },
  github:    { bg: 'bg-source-github/10', text: 'text-source-github', dot: 'bg-source-github' },
  linkedin:  { bg: 'bg-source-linkedin/10', text: 'text-source-linkedin', dot: 'bg-source-linkedin' },
  resume:    { bg: 'bg-source-resume/10', text: 'text-source-resume', dot: 'bg-source-resume' },
  notes:     { bg: 'bg-source-notes/10', text: 'text-source-notes', dot: 'bg-source-notes' },
};

export function Badge({ variant = 'default', children, size = 'sm', dot = false }: BadgeProps) {
  const styles = variantMap[variant] ?? variantMap.default;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        styles.bg,
        styles.text,
        sizeClasses,
      ].join(' ')}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />}
      {children}
    </span>
  );
}

export function SourceBadge({ source }: { source: SourceType }) {
  const labels: Record<SourceType, string> = {
    csv: 'CSV',
    ats_json: 'ATS JSON',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    resume: 'Resume',
    notes: 'Notes',
  };

  return (
    <Badge variant={source} dot size="sm">
      {labels[source]}
    </Badge>
  );
}
