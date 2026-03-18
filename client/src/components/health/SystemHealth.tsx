import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ChartCard } from '@/components/ui/chart-card';
import { useApi } from '@/hooks/useApi';
import { formatUptime, formatBytes } from '@/lib/utils';
import type { NodeHealth } from '@shared/types';
import { Server, Cpu, MemoryStick, HardDrive, Clock, Bot } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

function getGaugeColor(pct: number): string {
  if (pct > 80) return '#ef4444';
  if (pct > 60) return '#eab308';
  return '#22c55e';
}

function GaugeChart({ value, label, detail }: { value: number; label: string; detail: string }) {
  const color = getGaugeColor(value);
  const data = [
    { name: 'bg', value: 100, fill: 'hsl(224, 30%, 12%)' },
    { name: label, value, fill: color },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="100%"
            barSize={8}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              background={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold font-mono-nums" style={{ color }}>
            {value.toFixed(0)}%
          </span>
        </div>
      </div>
      <p className="text-xs font-medium mt-2">{label}</p>
      <p className="text-[10px] text-muted-foreground font-mono-nums">{detail}</p>
    </div>
  );
}

export function SystemHealth() {
  const { data: nodes } = useApi<NodeHealth[]>('/api/health');

  const overallStatus = nodes?.some(n => n.status === 'critical') ? 'critical' :
    nodes?.some(n => n.status === 'warning') ? 'warning' : 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">System Health</h2>
          <p className="text-sm text-muted-foreground">Infrastructure monitoring across all nodes</p>
        </div>
        <StatusBadge
          status={overallStatus}
          label={
            overallStatus === 'healthy' ? 'All Systems Operational' :
            overallStatus === 'warning' ? 'Degraded Performance' : 'Critical Alert'
          }
          size="md"
        />
      </div>

      {/* Node cards with gauges */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {nodes?.map(node => (
          <Card key={node.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Server className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{node.name}</CardTitle>
                    <CardDescription className="font-mono-nums">{node.hostname}</CardDescription>
                  </div>
                </div>
                <StatusBadge status={node.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gauges */}
              <div className="grid grid-cols-3 gap-4">
                <GaugeChart
                  value={node.cpuPercent}
                  label="CPU"
                  detail={`${node.cpuPercent.toFixed(1)}%`}
                />
                <GaugeChart
                  value={node.memoryPercent}
                  label="Memory"
                  detail={`${formatBytes(node.memoryUsedMb)} / ${formatBytes(node.memoryTotalMb)}`}
                />
                <GaugeChart
                  value={node.diskPercent}
                  label="Disk"
                  detail={`${node.diskUsedGb} / ${node.diskTotalGb} GB`}
                />
              </div>

              {/* Footer stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Uptime:</span>
                    <span className="font-mono-nums font-medium text-foreground">{formatUptime(node.uptime)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    <span>{node.agentCount} agents</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground/50">
                  Updated {new Date(node.lastUpdated).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
