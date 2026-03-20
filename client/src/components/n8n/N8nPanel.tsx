import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/useApi';
import { useSSE } from '@/hooks/useSSE';
import type { N8nWorkflow, N8nExecution, N8nSummary } from '@shared/types';
import {
  Workflow,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Zap,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

function formatDuration(ms: number | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusBadge(status: string): { variant: 'success' | 'error' | 'warning' | 'secondary'; label: string } {
  switch (status) {
    case 'success':
      return { variant: 'success', label: 'Success' };
    case 'error':
    case 'failed':
    case 'crashed':
      return { variant: 'error', label: 'Failed' };
    case 'running':
    case 'waiting':
      return { variant: 'warning', label: 'Running' };
    default:
      return { variant: 'secondary', label: status };
  }
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function N8nPanel() {
  const { data: summary, setData: setSummary } = useApi<N8nSummary>('/api/n8n/summary');
  const { data: workflows, setData: setWorkflows } = useApi<N8nWorkflow[]>('/api/n8n/workflows');
  const { data: executions, setData: setExecutions } = useApi<N8nExecution[]>('/api/n8n/executions');

  // Live SSE updates
  useSSE({
    'n8n-update': (data: any) => {
      if (data?.summary) setSummary(data.summary);
      if (data?.workflows) setWorkflows(data.workflows);
      if (data?.executions) setExecutions(data.executions);
    },
  });

  const successRate =
    summary && summary.totalExecutions > 0
      ? Math.round((summary.successfulExecutions / summary.totalExecutions) * 100)
      : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            N8N Workflows
          </h2>
          <p className="text-sm text-muted-foreground">Automation workflow monitoring</p>
        </div>
        {summary && (
          <div className="text-xs text-muted-foreground">
            Last checked: {formatTimeAgo(summary.lastChecked)}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {summary && summary.failedExecutions > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">{summary.failedExecutions} Failed Execution{summary.failedExecutions > 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground">Check execution history below for details</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          icon={Workflow}
          label="Total Workflows"
          value={summary?.totalWorkflows ?? '—'}
          color="bg-blue-500"
        />
        <SummaryCard
          icon={Play}
          label="Active"
          value={summary?.activeWorkflows ?? '—'}
          color="bg-green-500"
        />
        <SummaryCard
          icon={Pause}
          label="Inactive"
          value={summary?.inactiveWorkflows ?? '—'}
          color="bg-gray-500"
        />
        <SummaryCard
          icon={Activity}
          label={successRate !== null ? `Success Rate` : 'Executions'}
          value={successRate !== null ? `${successRate}%` : (summary?.totalExecutions ?? '—')}
          color={successRate !== null && successRate < 80 ? 'bg-orange-500' : 'bg-purple-500'}
        />
      </div>

      {/* Execution Stats + Workflow List */}
      <div className="grid grid-cols-3 gap-4">
        {/* Execution Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Execution Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold font-mono-nums">
                {summary?.totalExecutions ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">Total Executions</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-bold font-mono-nums text-green-400">
                  {summary?.successfulExecutions ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Successful</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono-nums text-status-critical">
                  {summary?.failedExecutions ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Failed</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last Execution
              </span>
              <span className="font-mono-nums">
                {summary?.lastExecutionAt ? formatTimeAgo(summary.lastExecutionAt) : 'Never'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Workflow List */}
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              Workflows
            </CardTitle>
            <CardDescription className="text-[10px]">
              {workflows?.length ?? 0} workflows configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workflows && workflows.length > 0 ? (
              <div className="space-y-2">
                {workflows.map((wf) => (
                  <div
                    key={wf.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-accent/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                          wf.active ? 'bg-green-500/20' : 'bg-gray-500/20'
                        }`}
                      >
                        {wf.active ? (
                          <Play className="w-4 h-4 text-green-400" />
                        ) : (
                          <Pause className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{wf.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {wf.nodeCount} nodes · Updated {formatTimeAgo(wf.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={wf.active ? 'success' : 'secondary'} className="flex-shrink-0">
                      {wf.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Workflow className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No workflows found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Executions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Executions
          </CardTitle>
          <CardDescription className="text-[10px]">
            Latest workflow execution history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executions && executions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Workflow</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                    <th className="text-left pb-2 font-medium">Mode</th>
                    <th className="text-right pb-2 font-medium">Duration</th>
                    <th className="text-right pb-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {executions.slice(0, 20).map((exec) => {
                    const badge = getStatusBadge(exec.status);
                    return (
                      <tr key={exec.id} className="text-xs">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            {exec.status === 'success' ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : exec.status === 'error' || exec.status === 'failed' ? (
                              <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                            )}
                            <span className="truncate max-w-[250px]">
                              {exec.workflowName || exec.workflowId}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={badge.variant} className="text-[10px]">
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{exec.mode}</td>
                        <td className="py-2 pr-4 text-right font-mono-nums">
                          {formatDuration(exec.duration)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatTime(exec.startedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No recent executions</p>
              <p className="text-xs mt-1">
                Workflow executions will appear here once workflows start running
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error state if no data at all */}
      {!summary && !workflows && (
        <Card className="border-status-critical/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-status-critical" />
            <div>
              <p className="text-sm font-medium">N8N Unreachable</p>
              <p className="text-xs text-muted-foreground">
                Cannot connect to N8N. Check the API configuration and network connectivity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
