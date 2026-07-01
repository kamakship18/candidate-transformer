import type React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  noPad?: boolean;
}

export function Card({ children, className = '', elevated = false, noPad = false }: CardProps) {
  return (
    <div
      className={[
        elevated ? 'panel-gradient-elevated' : 'panel-gradient',
        noPad ? '' : 'p-4',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div>
        <div className="text-sm font-semibold text-text-primary">{title}</div>
        {subtitle && <div className="text-xs text-text-muted mt-0.5">{subtitle}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
