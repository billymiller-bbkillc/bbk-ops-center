import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/useApi';
import { formatCost, formatTokens, formatUptime, getStatusColor, getStatusBg } from '@/lib/utils';
import type { Agent, NodeHealth, CostSummary, Task } from '@shared/types';
import {
  Bot, DollarSign, Activity, LayoutGrid, TrendingUp, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';

export function Overview() {
  const { data: agents } = useApi<Agent[]>('/api/agents');
  const { data: nodes } = useApi<NodeHealth[]>('/api/health');
  const { data: costSummary } = useApi<CostSummary>('/api/costs/summary?period=month');
  const { data: tasks } = useApi<Task[]>('/api/tasks');

  const onlineAgents = agents?.filter(a => a.status === 'online' || a.status === 'busy').length || 0;
  const totalAgents = agents?.length || 0;
  const busyAgents = agents?.filter(a => a.status === 'busy').length || 0;
  const errorAgents = agents?.filter(a => a.status === 'error').length || 0;

  const healthyNodes = nodes?.filter(n => n.status === 'healthy').length || 0;
  const totalNodes = nodes?.length || 0;
  const criticalNodes = nodes?.filter(n => n.status === 'critical').length || 0;

  const inProgressTasks = tasks?.filter(t => t.column === 'in_progress').length || 0;
  const totalTasks = tasks?.length || 0;
  const criticalTasks = tasks?.filter(t => t.priority === 'critical').length || 0;

  return (
    <div className="space-y-4">
      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal">
              <Bot className="w-4 h-4" />
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-nums">{onlineAgents}/{totalAgents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-status-warning">{busyAgents} busy</span>
              {errorAgents > 0 && <span className="text-status-critical ml-2">{errorAgents} error</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal">
              <DollarSign className="w-4 h-4" />
              Monthly Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-nums">{formatCost(costSummary?.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTokens((costSummary?.totalTokensIn || 0) + (costSummary?.totalTokensOut || 0))} total tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal">
              <Activity className="w-4 h-4" />
              Node Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-nums">{healthyNodes}/{totalNodes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalNodes > 0 ? (
                <span className="text-status-critical">{criticalNodes} critical</span>
              ) : (
                <span className="text-status-healthy">All systems go</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal">
              <LayoutGrid className="w-4 h-4" />
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-nums">{inProgressTasks}/{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalTasks > 0 && <span className="text-status-critical">{criticalTasks} critical</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent list + recent activity */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Active Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents?.filter(a => a.status !== 'offline').map(agent => (
              <div key={agent.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusBg(agent.status)} ${agent.status === 'busy' ? 'animate-pulse' : ''}`} />
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{agent.currentTask || 'Idle'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={agent.status === 'online' ? 'success' : agent.status === 'busy' ? 'warning' : 'error'} className="text-[10px]">
                    {agent.status}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono-nums">{formatUptime(agent.uptime)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Critical Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks?.filter(t => t.priority === 'critical' || t.priority === 'high').slice(0, 6).map(task => (
              <div key={task.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {task.column === 'done' ? (
                    <CheckCircle className="w-4 h-4 text-status-healthy" />
                  ) : task.priority === 'critical' ? (
                    <AlertTriangle className="w-4 h-4 text-status-critical" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-status-warning" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.assignee || 'Unassigned'} · {task.businessUnit}</p>
                  </div>
                </div>
                <Badge variant={task.priority === 'critical' ? 'error' : 'warning'} className="text-[10px]">
                  {task.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
