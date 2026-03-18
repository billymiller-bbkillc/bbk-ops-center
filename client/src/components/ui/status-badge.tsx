import React from 'react';
import { cn } from '@/lib/utils';

type StatusType = 'online' | 'busy' | 'offline' | 'error' | 'healthy' | 'warning' | 'critical';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; pulse: boolean }> = {
  online: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', pulse: true },
  healthy: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', pulse: false },
  busy: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400', pulse: true },
  warning: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400', pulse: true },
  error: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400', pulse: true },
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400', pulse: true },
  offline: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', dot: 'bg-zinc-500', pulse: false },
};

export function StatusBadge({ status, label, size = 'sm', className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.offline;
  const displayLabel = label || status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium capitalize',
        config.bg,
        config.text,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', config.dot)} />
        )}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', config.dot)} />
      </span>
      {displayLabel}
    </span>
  );
}
