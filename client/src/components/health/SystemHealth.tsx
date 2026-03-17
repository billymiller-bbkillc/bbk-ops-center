import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useApi } from '@/hooks/useApi';
import { formatUptime, formatBytes, getStatusBg } from '@/lib/utils';
import type { NodeHealth } from '@shared/types';
import { Server, Cpu, MemoryStick, HardDrive, Clock, Bot } from 'lucide-react';

function getBarColor(pct: number): string {
  if (pct > 90) return 'bg-status-critical';
  if (pct > 70) return 'bg-status-warning';
  return 'bg-status-healthy';
}

function MetricBar({ label, icon: Icon, value, max, unit, pct }: {
  label: string;
  icon: React.ElementType;
  value: string;
  max: string;
  unit: string;
  pct: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <span className="font-mono-nums">
          {value} / {max} {unit}
          <span className="text-muted-foreground ml-1">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <Progress value={pct} indicatorClassName={getBarColor(pct)} />
    </div>
  );
}

export function SystemHealth() {
  const { data: nodes } = useApi<NodeHealth[]>('/api/health');

  const overallStatus = nodes?.some(n => n.status === 'critical') ? 'critical' :
    nodes?.some(n => n.status === 'warning') ? 'warning' : 'healthy';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">System Health</h2>
          <p className="text-sm text-muted-foreground">Infrastructure monitoring across all nodes</p>
        </div>
        <Badge
          variant={overallStatus === 'healthy' ? 'success' : overallStatus === 'warning' ? 'warning' : 'error'}
        >
          {overallStatus === 'healthy' ? 'All Systems Operational' :
           overallStatus === 'warning' ? 'Degraded Performance' : 'Critical Alert'}
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {nodes?.map(node => (
          <Card key={node.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${getStatusBg(node.status)}`} />
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  {node.name}
                </CardTitle>
                <div className={`w-2 h-2 rounded-full ${getStatusBg(node.status)} ${node.status === 'critical' ? 'animate-pulse' : ''}`} />
              </div>
              <CardDescription className="font-mono-nums text-[10px]">{node.hostname}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold font-mono-nums">
                {node.cpuPercent.toFixed(0)}%
              </div>
              <p className="text-[10px] text-muted-foreground">CPU</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed node views */}
      <div className="grid grid-cols-2 gap-4">
        {nodes?.map(node => (
          <Card key={node.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    {node.name}
                  </CardTitle>
                  <CardDescription className="font-mono-nums">{node.hostname}</CardDescription>
                </div>
                <Badge
                  variant={node.status === 'healthy' ? 'success' : node.status === 'warning' ? 'warning' : 'error'}
                >
                  {node.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricBar
                label="CPU"
                icon={Cpu}
                value={`${node.cpuPercent.toFixed(1)}%`}
                max="100%"
                unit=""
                pct={node.cpuPercent}
              />
              <MetricBar
                label="Memory"
                icon={MemoryStick}
                value={formatBytes(node.memoryUsedMb)}
                max={formatBytes(node.memoryTotalMb)}
                unit=""
                pct={node.memoryPercent}
              />
              <MetricBar
                label="Disk"
                icon={HardDrive}
                value={`${node.diskUsedGb} GB`}
                max={`${node.diskTotalGb} GB`}
                unit=""
                pct={node.diskPercent}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono-nums">Up {formatUptime(node.uptime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  <span>{node.agentCount} agents</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
