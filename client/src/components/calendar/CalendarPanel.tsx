import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@shared/types';
import { Calendar, Clock, Bot, Zap, Filter, ChevronDown } from 'lucide-react';

function formatTimeUntil(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'overdue';
  if (ms < 60000) return 'in <1m';
  if (ms < 3600000) return `in ${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `in ${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  return `in ${Math.floor(ms / 86400000)}d`;
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function CalendarPanel() {
  const { data: events, loading } = useApi<CalendarEvent[]>('/api/calendar');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const owners = useMemo(() => {
    if (!events) return [];
    return [...new Set(events.map(e => e.owner))].sort();
  }, [events]);

  const filtered = useMemo(() => {
    if (!events) return [];
    return events.filter(e => {
      if (filterOwner !== 'all' && e.owner !== filterOwner) return false;
      if (filterType !== 'all' && e.type !== filterType) return false;
      return true;
    });
  }, [events, filterOwner, filterType]);

  // Group by owner
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const list = map.get(e.owner) || [];
      list.push(e);
      map.set(e.owner, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Schedule Calendar</h2>
          <p className="text-sm text-muted-foreground">{events?.length || 0} scheduled tasks and heartbeats</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none text-zinc-300">
          <option value="all">All Owners</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 text-xs rounded-lg px-3 py-1.5 focus:outline-none text-zinc-300">
          <option value="all">All Types</option>
          <option value="cron">Cron Jobs</option>
          <option value="heartbeat">Heartbeats</option>
        </select>
      </div>

      {/* Grouped schedule */}
      {grouped.map(([owner, ownerEvents]) => (
        <Card key={owner}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="capitalize">{owner}</span>
              <Badge variant="outline" className="text-[10px]">{ownerEvents.length} jobs</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ownerEvents.map(event => (
              <div key={event.id} className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-colors',
                event.enabled ? 'border-zinc-700/50 bg-zinc-900/40' : 'border-zinc-800/50 bg-zinc-900/20 opacity-50'
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    event.type === 'cron' ? 'bg-blue-500/15' : 'bg-purple-500/15'
                  )}>
                    {event.type === 'cron' ? <Clock className="w-4 h-4 text-blue-400" /> : <Zap className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{event.name}</span>
                      <Badge variant="outline" className={cn('text-[10px] shrink-0',
                        event.type === 'cron' ? 'text-blue-400 border-blue-500/30' : 'text-purple-400 border-purple-500/30'
                      )}>{event.type}</Badge>
                      {!event.enabled && <Badge variant="outline" className="text-[10px] text-zinc-500">Disabled</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{event.schedule}</p>
                    {event.description && <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-md">{event.description}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                  {event.nextRun && (
                    <span className="text-[10px] text-muted-foreground">Next: <span className="text-foreground font-medium">{formatTimeUntil(event.nextRun)}</span></span>
                  )}
                  {event.lastRun && (
                    <span className="text-[10px] text-muted-foreground">
                      Last: <span className={event.lastStatus === 'ok' ? 'text-emerald-400' : 'text-red-400'}>{event.lastStatus}</span>
                      {event.lastDurationMs !== undefined && <span className="ml-1">({formatDuration(event.lastDurationMs)})</span>}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {filtered.length === 0 && !loading && (
        <Card><CardContent className="py-8 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No scheduled tasks found</p>
        </CardContent></Card>
      )}
    </div>
  );
}
