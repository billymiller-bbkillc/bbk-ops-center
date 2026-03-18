import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useApi } from '@/hooks/useApi';
import { formatUptime, getStatusBg, getStatusColor } from '@/lib/utils';
import type { Agent, AgentSession } from '@shared/types';
import { Bot, Clock, Cpu, ArrowLeft, Search, Filter } from 'lucide-react';

const STATUS_BORDER_COLORS: Record<string, string> = {
  online: 'border-t-emerald-500',
  busy: 'border-t-amber-500',
  error: 'border-t-red-500',
  offline: 'border-t-zinc-600',
};

const FILTER_TABS = ['all', 'online', 'busy', 'offline', 'error'] as const;
type FilterTab = typeof FILTER_TABS[number];

function AgentDetail({ agent, onBack }: { agent: Agent; onBack: () => void }) {
  const { data: sessions } = useApi<AgentSession[]>(`/api/agents/${agent.id}/sessions`);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Fleet
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="border-t-2 border-t-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-normal text-xs">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={agent.status} size="md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-normal text-xs">Model</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-mono-nums">{agent.model}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-normal text-xs">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold font-mono-nums">{formatUptime(agent.uptime)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-normal text-xs">Node</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm">{agent.nodeId}</span>
          </CardContent>
        </Card>
      </div>

      {agent.currentTask && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Current Task</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{agent.currentTask}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>{sessions?.length || 0} sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions?.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">{session.task}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="font-mono-nums">{session.model}</span>
                    <span className="text-border">·</span>
                    <span className="font-mono-nums">{session.tokensIn.toLocaleString()} in / {session.tokensOut.toLocaleString()} out</span>
                    <span className="text-border">·</span>
                    <span className="font-mono-nums">${session.cost.toFixed(2)}</span>
                  </div>
                </div>
                <StatusBadge
                  status={session.status === 'completed' ? 'online' : session.status === 'active' ? 'busy' : 'error'}
                  label={session.status}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FleetMonitor() {
  const { data: agents } = useApi<Agent[]>('/api/agents');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = agents || [];
    if (filter !== 'all') {
      list = list.filter(a => a.status === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.businessUnit.toLowerCase().includes(q)
      );
    }
    const statusOrder = { busy: 0, online: 1, error: 2, offline: 3 };
    return [...list].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
  }, [agents, filter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: agents?.length || 0 };
    agents?.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [agents]);

  if (selectedAgent) {
    return <AgentDetail agent={selectedAgent} onBack={() => setSelectedAgent(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Fleet Monitor</h2>
        <p className="text-sm text-muted-foreground">
          {agents?.filter(a => a.status !== 'offline').length || 0} of {agents?.length || 0} agents active
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all duration-200 ${
                filter === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              <span className="ml-1.5 text-[10px] text-muted-foreground font-mono-nums">
                {statusCounts[tab] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-xs bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(agent => (
          <div
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className={`relative rounded-xl border border-border bg-card cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 border-t-2 ${STATUS_BORDER_COLORS[agent.status] || 'border-t-zinc-600'}`}
          >
            <div className="p-6">
              {/* Top: Name + Status */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{agent.businessUnit}</p>
                </div>
                <StatusBadge status={agent.status} />
              </div>

              {/* Current task */}
              {agent.currentTask && (
                <p className="text-xs text-foreground/70 truncate mb-4 bg-muted/30 rounded-lg px-3 py-2">
                  {agent.currentTask}
                </p>
              )}

              {/* Details */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3" />
                  <span className="font-mono-nums truncate max-w-[140px]">{agent.model}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono-nums">{formatUptime(agent.uptime)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No agents match your filter</p>
        </div>
      )}
    </div>
  );
}
