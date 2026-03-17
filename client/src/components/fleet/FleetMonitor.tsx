import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { formatUptime, getStatusBg, getStatusColor } from '@/lib/utils';
import type { Agent, AgentSession } from '@shared/types';
import { Bot, Clock, Cpu, ArrowLeft, ExternalLink } from 'lucide-react';

function AgentDetail({ agent, onBack }: { agent: Agent; onBack: () => void }) {
  const { data: sessions } = useApi<AgentSession[]>(`/api/agents/${agent.id}/sessions`);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Fleet
      </Button>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-normal text-xs">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusBg(agent.status)}`} />
              <span className={`text-lg font-bold capitalize ${getStatusColor(agent.status)}`}>{agent.status}</span>
            </div>
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
            <span className="text-lg font-bold font-mono-nums">{formatUptime(agent.uptime)}</span>
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
              <div key={session.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 border border-border">
                <div className="flex-1">
                  <p className="text-sm font-medium">{session.task}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono-nums">{session.model}</span>
                    <span>·</span>
                    <span className="font-mono-nums">{session.tokensIn.toLocaleString()} in / {session.tokensOut.toLocaleString()} out</span>
                    <span>·</span>
                    <span className="font-mono-nums">${session.cost.toFixed(2)}</span>
                  </div>
                </div>
                <Badge
                  variant={session.status === 'completed' ? 'success' : session.status === 'active' ? 'warning' : 'error'}
                  className="text-[10px]"
                >
                  {session.status}
                </Badge>
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

  if (selectedAgent) {
    return <AgentDetail agent={selectedAgent} onBack={() => setSelectedAgent(null)} />;
  }

  const statusOrder = { busy: 0, online: 1, error: 2, offline: 3 };
  const sorted = [...(agents || [])].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fleet Monitor</h2>
          <p className="text-sm text-muted-foreground">
            {agents?.filter(a => a.status !== 'offline').length || 0} of {agents?.length || 0} agents active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map(agent => (
          <Card
            key={agent.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedAgent(agent)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusBg(agent.status)} ${agent.status === 'busy' ? 'animate-pulse' : ''}`} />
                  <Badge variant={
                    agent.status === 'online' ? 'success' :
                    agent.status === 'busy' ? 'warning' :
                    agent.status === 'error' ? 'error' : 'secondary'
                  } className="text-[10px]">
                    {agent.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  <span className="font-mono-nums">{agent.model}</span>
                </div>
              </div>

              {agent.currentTask && (
                <p className="text-xs text-foreground/80 truncate">{agent.currentTask}</p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono-nums">{formatUptime(agent.uptime)}</span>
                </div>
                <span>{agent.businessUnit}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
