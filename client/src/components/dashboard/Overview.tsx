import React from 'react';
import { useApi } from '@/hooks/useApi';
import { useSSE } from '@/hooks/useSSE';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCost, formatTokens, formatUptime, cn } from '@/lib/utils';
import type { Agent, NodeHealth, CostSummary, Task, ActivityEntry } from '@shared/types';
import {
  Bot, DollarSign, Activity, LayoutGrid, Clock, Rocket,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  online: '#22c55e',
  busy: '#eab308',
  idle: '#71717a',
  offline: '#71717a',
  error: '#ef4444',
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(224, 47%, 7%)',
  border: '1px solid hsl(224, 30%, 14%)',
  borderRadius: '10px',
  fontSize: '11px',
  padding: '8px 12px',
};

export function Overview() {
  const { data: agents, setData: setAgents } = useApi<Agent[]>('/api/agents');
  const { data: nodes, setData: setNodes } = useApi<NodeHealth[]>('/api/health');
  const { data: costSummary } = useApi<CostSummary>('/api/costs/summary?period=month');
  const { data: tasks } = useApi<Task[]>('/api/tasks');
  const { data: recentActivity } = useApi<ActivityEntry[]>('/api/activity/recent?count=10');

  const launchDate = new Date('2026-04-30');
  const daysUntilLaunch = Math.max(0, Math.ceil((launchDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // Live SSE updates
  useSSE({
    'agent-update': (data) => setAgents(data as Agent[]),
    'health-update': (data) => setNodes(data as NodeHealth[]),
  });

  const onlineBots = agents?.filter(a => a.status === 'active' || (a.status as any) === 'online' || a.status === 'busy').length || 0;
  const totalBots = agents?.length || 0;
  const errorBots = agents?.filter(a => a.status === 'error').length || 0;

  const healthyNodes = nodes?.filter(n => n.status === 'healthy').length || 0;
  const totalNodes = nodes?.length || 0;
  const criticalNodes = nodes?.filter(n => n.status === 'critical').length || 0;

  const inProgressTasks = tasks?.filter(t => t.column === 'in_progress').length || 0;
  const totalTasks = tasks?.length || 0;

  // Bot status breakdown for pie chart
  const statusCounts = {
    active: agents?.filter(a => a.status === 'active' || (a.status as any) === 'online').length || 0,
    busy: agents?.filter(a => a.status === 'busy').length || 0,
    idle: agents?.filter(a => a.status === 'idle' || (a.status as any) === 'offline').length || 0,
    error: agents?.filter(a => a.status === 'error').length || 0,
  };
  const pieData = Object.entries(statusCounts)
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  // Task summary for stacked bar
  const taskColumns = ['backlog', 'todo', 'in_progress', 'review', 'done'];
  const taskSummary = taskColumns.map(col => ({
    name: col.replace('_', ' '),
    count: tasks?.filter(t => t.column === col).length || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Top metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
        <StatCard
          icon={Bot}
          label="Bot Status"
          value={`${onlineBots}/${totalBots}`}
          subtitle={errorBots > 0 ? `${errorBots} bot${errorBots > 1 ? 's' : ''} in error state` : 'All bots operational'}
          accentColor={errorBots > 0 ? 'red' : 'green'}
        />
        <StatCard
          icon={DollarSign}
          label="Monthly Spend"
          value={formatCost(costSummary?.totalCost || 0)}
          subtitle={`${formatTokens((costSummary?.totalTokensIn || 0) + (costSummary?.totalTokensOut || 0))} total tokens`}
          accentColor="blue"
        />
        <StatCard
          icon={Activity}
          label="System Health"
          value={`${healthyNodes}/${totalNodes}`}
          subtitle={criticalNodes > 0 ? `${criticalNodes} critical node${criticalNodes > 1 ? 's' : ''}` : 'All systems nominal'}
          accentColor={criticalNodes > 0 ? 'red' : 'green'}
        />
        <StatCard
          icon={LayoutGrid}
          label="Active Tasks"
          value={`${inProgressTasks}`}
          subtitle={`${totalTasks} total across all boards`}
          accentColor="amber"
        />
        <StatCard
          icon={Rocket}
          label="Launch Day"
          value={`${daysUntilLaunch}d`}
          subtitle="Until April 30, 2026"
          accentColor="blue"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cost trend area chart */}
        <ChartCard title="Cost Trend" subtitle="Daily spend over 30 days" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={costSummary?.dailyTrend || []}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 30%, 12%)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(215, 20%, 40%)' }}
                tickFormatter={(v) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(215, 20%, 40%)' }}
                tickFormatter={(v) => `$${v}`}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']}
                labelFormatter={(l) => `Date: ${l}`}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#costGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: '#1d4ed8', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bot status donut */}
        <ChartCard title="Bot Status" subtitle="Current fleet breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                strokeWidth={0}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#71717a'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v: number, name: string) => [v, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] }} />
                <span className="text-xs text-muted-foreground capitalize">{entry.name}</span>
                <span className="text-xs font-semibold font-mono-nums">{entry.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent bot activity */}
        <ChartCard title="Recent Bot Activity" subtitle="Latest fleet updates">
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {agents
              ?.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
              .slice(0, 10)
              .map((agent) => (
                <div key={agent.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={agent.status} />
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {agent.currentTask || 'Idle'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono-nums">{formatUptime(agent.uptime)}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </ChartCard>

        {/* Task summary bar */}
        <ChartCard title="Task Distribution" subtitle="Tasks by column">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={taskSummary} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 30%, 12%)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'hsl(215, 20%, 40%)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(215, 20%, 40%)' }}
                axisLine={false}
                tickLine={false}
                width={80}
                className="capitalize"
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v: number) => [v, 'Tasks']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-2">
            <span className="text-xs text-muted-foreground">{totalTasks} total tasks</span>
            <span className="text-xs font-medium text-primary">{inProgressTasks} in progress</span>
          </div>
        </ChartCard>
      </div>

      {/* Activity ticker */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivity && recentActivity.length > 0 ? recentActivity.map(a => (
            <div key={a.id} className="flex items-center gap-3 text-xs">
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                a.severity === 'critical' ? 'bg-red-500' :
                a.severity === 'error' ? 'bg-red-400' :
                a.severity === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
              )} />
              <span className="text-muted-foreground shrink-0">
                {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="font-medium truncate">{a.title}</span>
              <span className="text-muted-foreground truncate ml-auto">{a.source}</span>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
