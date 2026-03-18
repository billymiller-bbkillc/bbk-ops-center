import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  accentColor?: 'green' | 'blue' | 'amber' | 'red';
  className?: string;
}

const accentMap = {
  green: 'border-l-emerald-500',
  blue: 'border-l-blue-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
};

const accentGlowMap = {
  green: 'shadow-emerald-500/5',
  blue: 'shadow-blue-500/5',
  amber: 'shadow-amber-500/5',
  red: 'shadow-red-500/5',
};

const iconBgMap = {
  green: 'bg-emerald-500/10 text-emerald-400',
  blue: 'bg-blue-500/10 text-blue-400',
  amber: 'bg-amber-500/10 text-amber-400',
  red: 'bg-red-500/10 text-red-400',
};

export function StatCard({
  icon: Icon,
  value,
  label,
  subtitle,
  trend,
  trendValue,
  accentColor = 'blue',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:shadow-md',
        'border-l-[3px]',
        accentMap[accentColor],
        accentGlowMap[accentColor],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight font-mono-nums">{value}</span>
            {trend && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  trend === 'up' && 'text-emerald-400',
                  trend === 'down' && 'text-red-400',
                  trend === 'flat' && 'text-muted-foreground'
                )}
              >
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {trend === 'flat' && <Minus className="w-3 h-3" />}
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5', iconBgMap[accentColor])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
