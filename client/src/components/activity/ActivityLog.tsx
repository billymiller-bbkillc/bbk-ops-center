import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { useSSE } from '@/hooks/useSSE';
import { cn } from '@/lib/utils';
import type { ActivityEntry } from '@shared/types';
import {
  ScrollText, Filter, ArrowUpDown,
  GitBranch, Bot, Zap, AlertTriangle, CheckCircle, XCircle, Settings, Info,
} from 'lucide-react';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  info: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Info' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Warning' },
  error: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Error' },
  critical: { color: 'text-red-500', bg: 'bg-red-500/20', label: 'Critical' },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  task_move: ArrowUpDown,
  task_create: GitBranch,
  task_delete: XCircle,
  agent_status: Bot,
  agent_kill: XCircle,
  build: Zap,
  error: AlertTriangle,
  approval: CheckCircle,
  system: Settings,
};

type FilterType = 'all' | 'task_move' | 'task_create' | 'agent_status' | 'agent_kill' | 'error' | 'system';

const FILTER_TABS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'task_move', label: 'Tasks' },
  { id: 'agent_status', label: 'Agents' },
  { id: 'error', label: 'Errors' },
  { id: 'system', label: 'System' },
];

export function ActivityLog() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [limit, setLimit] = useState(50);

  const queryParams = new URLSearchParams();
  if (filter !== 'all') queryParams.set('type', filter);
  queryParams.set('limit', String(limit));

  const { data: activity, setData: setActivity, refetch } = useApi<ActivityEntry[]>(
    `/api/activity?${queryParams.toString()}`,
    [filter, limit]
  );

  // Live SSE updates
  useSSE({
    'activity-update': (data) => setActivity(data as ActivityEntry[]),
  });

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Activity Log</h2>
          <p className="text-sm text-muted-foreground">Unified feed of all operations across BBK Holdings</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <Filter className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {FILTER_TABS.map(tab => (
          <Button
            key={tab.id}
            variant={filter === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter(tab.id)}
            className="text-xs h-7 px-3"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Activity list */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {activity && activity.length > 0 ? (
              activity.map(entry => {
                const sev = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.info;
                const Icon = TYPE_ICONS[entry.type] || Info;
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-3 hover:bg-accent/30 transition-colors">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', sev.bg)}>
                      <Icon className={cn('w-4 h-4', sev.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{entry.title}</span>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', sev.color)}>
                          {sev.label}
                        </Badge>
                      </div>
                      {entry.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.detail}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{entry.source}</span>
                        {entry.businessUnit && (
                          <>
                            <span>•</span>
                            <span>{entry.businessUnit}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <ScrollText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                <p className="text-xs text-muted-foreground mt-1">Activity will appear here as agents work on tasks</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Load more */}
      {activity && activity.length >= limit && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setLimit(l => l + 50)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
