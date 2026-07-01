import { Tooltip } from './Tooltip';

interface ConfidenceMeterProps {
  value: number; // 0.0 to 1.0
  showLabel?: boolean;
  height?: 'xs' | 'sm' | 'md';
}

function getColor(value: number): string {
  if (value >= 0.8) return '#10B981'; // success
  if (value >= 0.5) return '#F59E0B'; // warning
  return '#EF4444'; // danger
}

function getLabel(value: number): string {
  if (value >= 0.8) return 'High';
  if (value >= 0.5) return 'Medium';
  return 'Low';
}

const heightMap = { xs: 'h-0.5', sm: 'h-1', md: 'h-1.5' };

export function ConfidenceMeter({ value, showLabel = false, height = 'sm' }: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const color = getColor(clamped);
  const label = getLabel(clamped);
  const percentage = `${(clamped * 100).toFixed(0)}%`;

  const bar = (
    <div className={`w-full ${heightMap[height]} bg-surface-3 rounded-full overflow-hidden`}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${clamped * 100}%`, backgroundColor: color }}
      />
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <Tooltip content={`${percentage} confidence — ${label}`}>
        <div className="flex-1">{bar}</div>
      </Tooltip>
      {showLabel && (
        <span className="text-xs font-mono flex-shrink-0" style={{ color }}>
          {clamped.toFixed(2)}
        </span>
      )}
    </div>
  );
}
