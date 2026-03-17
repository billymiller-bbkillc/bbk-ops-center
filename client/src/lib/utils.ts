import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
    case 'healthy':
    case 'completed':
      return 'text-status-healthy';
    case 'busy':
    case 'active':
    case 'warning':
      return 'text-status-warning';
    case 'error':
    case 'critical':
    case 'failed':
      return 'text-status-critical';
    case 'offline':
      return 'text-muted-foreground';
    default:
      return 'text-status-info';
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'online':
    case 'healthy':
      return 'bg-status-healthy';
    case 'busy':
    case 'warning':
      return 'bg-status-warning';
    case 'error':
    case 'critical':
      return 'bg-status-critical';
    case 'offline':
      return 'bg-muted-foreground';
    default:
      return 'bg-status-info';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'text-status-critical border-status-critical';
    case 'high': return 'text-orange-400 border-orange-400';
    case 'medium': return 'text-status-warning border-status-warning';
    case 'low': return 'text-status-info border-status-info';
    default: return 'text-muted-foreground border-muted';
  }
}
