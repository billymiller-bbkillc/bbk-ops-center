import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useApi } from '@/hooks/useApi';
import { formatUptime } from '@/lib/utils';
import type { CrmHealth, CrmStats, CrmPipeline } from '@shared/types';
import {
  Activity,
  Users,
  Handshake,
  Building2,
  Target,
  Clock,
  Zap,
  AlertTriangle,
  MemoryStick,
  GitBranch,
  ArrowRight,
} from 'lucide-react';

function getHealthVariant(status: string): 'success' | 'warning' | 'error' {
  if (status === 'ok' || status === 'healthy') return 'success';
  if (status === 'degraded' || status === 'warning') return 'warning';
  return 'error';
}

function getHealthLabel(status: string): string {
  if (status === 'ok' || status === 'healthy') return 'Healthy';
  if (status === 'unreachable') return 'Unreachable';
  return status;
}

function formatMemoryMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function StatCard({ icon: Icon, label, value, color }: {
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

export function CrmPanel() {
  const { data: health } = useApi<CrmHealth>('/api/crm/health');
  const { data: stats } = useApi<CrmStats>('/api/crm/stats');
  const { data: pipelines } = useApi<CrmPipeline[]>('/api/crm/pipelines');

  const memPct = health && health.memory.total > 0
    ? (health.memory.used / health.memory.total) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">SalesPipe CRM</h2>
          <p className="text-sm text-muted-foreground">Live monitoring of your CRM platform</p>
        </div>
        {health && (
          <Badge variant={getHealthVariant(health.status)}>
            {getHealthLabel(health.status)}
          </Badge>
        )}
      </div>

      {/* CRM Status + Performance */}
      <div className="grid grid-cols-3 gap-4">
        {/* Health Card */}
        <Card className="relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${
            health?.status === 'ok' || health?.status === 'healthy' ? 'bg-status-healthy' :
            health?.status === 'unreachable' ? 'bg-status-critical' : 'bg-status-warning'
          }`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              CRM Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Uptime
              </span>
              <span className="font-mono-nums">{health ? formatUptime(health.uptime) : '—'}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MemoryStick className="w-3 h-3" /> Memory
                </span>
                <span className="font-mono-nums">
                  {health ? `${formatMemoryMb(health.memory.used)} / ${formatMemoryMb(health.memory.total)}` : '—'}
                </span>
              </div>
              <Progress value={memPct} indicatorClassName={
                memPct > 90 ? 'bg-status-critical' : memPct > 70 ? 'bg-status-warning' : 'bg-status-healthy'
              } />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">RSS</span>
              <span className="font-mono-nums">{health ? formatMemoryMb(health.memory.rss) : '—'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold font-mono-nums">
                {health ? formatMs(health.performance.averageResponseTime) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">Avg Response Time</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-bold font-mono-nums">
                  {health ? health.performance.totalRequests.toLocaleString() : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">Total Requests</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono-nums text-status-critical">
                  {health ? health.performance.errorCount : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Quick Stats
            </CardTitle>
            {stats && (
              <CardDescription className="text-[10px]">
                Updated {new Date(stats.lastChecked).toLocaleTimeString()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono-nums">{stats?.leads ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground">Leads</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                  <Handshake className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono-nums">{stats?.deals ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground">Deals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono-nums">{stats?.clients ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground">Clients</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono-nums">{stats?.companies ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground">Companies</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entity Count Cards (larger) */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Target} label="Leads" value={stats?.leads ?? '—'} color="bg-blue-500" />
        <StatCard icon={Handshake} label="Deals" value={stats?.deals ?? '—'} color="bg-green-500" />
        <StatCard icon={Users} label="Clients" value={stats?.clients ?? '—'} color="bg-purple-500" />
        <StatCard icon={Building2} label="Companies" value={stats?.companies ?? '—'} color="bg-orange-500" />
      </div>

      {/* Pipeline View */}
      {pipelines && pipelines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Pipelines
          </h3>
          {pipelines.map(pipeline => (
            <Card key={pipeline.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{pipeline.name}</CardTitle>
                  {pipeline.isDefault && (
                    <Badge variant="secondary" className="text-[10px]">Default</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pipeline.stages.length > 0 ? (
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {pipeline.stages
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((stage, idx) => (
                        <React.Fragment key={stage.id}>
                          <div className="flex-shrink-0 bg-accent rounded-lg px-3 py-2 text-center min-w-[100px]">
                            <p className="text-xs font-medium truncate">{stage.name}</p>
                            {stage.dealCount !== undefined && (
                              <p className="text-lg font-bold font-mono-nums">{stage.dealCount}</p>
                            )}
                          </div>
                          {idx < pipeline.stages.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No stages configured</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {health?.status === 'unreachable' && (
        <Card className="border-status-critical/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-status-critical" />
            <div>
              <p className="text-sm font-medium">CRM Unreachable</p>
              <p className="text-xs text-muted-foreground">
                Cannot connect to SalesPipe CRM. Check the API configuration and network connectivity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
