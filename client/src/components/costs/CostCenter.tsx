import React, { useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useApi } from '@/hooks/useApi';
import { useSSE } from '@/hooks/useSSE';
import { formatCost, formatTokens } from '@/lib/utils';
import type { CostSummary, BudgetAlert, CostPeriod } from '@shared/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Coins, AlertTriangle } from 'lucide-react';

const MODEL_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#eab308', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(224, 47%, 7%)',
  border: '1px solid hsl(224, 30%, 14%)',
  borderRadius: '10px',
  fontSize: '11px',
  padding: '8px 12px',
};

export function CostCenter() {
  const [period, setPeriod] = useState<CostPeriod>('month');
  const { data: summary, setData: setSummary } = useApi<CostSummary>(`/api/costs/summary?period=${period}`, [period]);
  const { data: alerts } = useApi<BudgetAlert[]>('/api/costs/alerts');

  // Live SSE updates for cost data
  useSSE({
    'cost-update': (data) => setSummary(data as CostSummary),
  });

  const agentCount = summary?.byAgent?.length || 0;
  const avgCostPerAgent = agentCount > 0 ? (summary?.totalCost || 0) / agentCount : 0;

  // Sort agents by cost desc
  const byAgent = [...(summary?.byAgent || [])].sort((a, b) => b.cost - a.cost);

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Cost Center</h2>
          <p className="text-sm text-muted-foreground">Token usage and spend analytics</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as CostPeriod)}>
          <TabsList>
            <TabsTrigger value="day">24h</TabsTrigger>
            <TabsTrigger value="week">7d</TabsTrigger>
            <TabsTrigger value="month">30d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Spend"
          value={formatCost(summary?.totalCost || 0)}
          accentColor="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Tokens In"
          value={formatTokens(summary?.totalTokensIn || 0)}
          accentColor="green"
        />
        <StatCard
          icon={TrendingDown}
          label="Tokens Out"
          value={formatTokens(summary?.totalTokensOut || 0)}
          accentColor="amber"
        />
        <StatCard
          icon={Coins}
          label="Avg / Agent"
          value={formatCost(avgCostPerAgent)}
          subtitle={`${agentCount} agents tracked`}
          accentColor="blue"
        />
      </div>

      {/* Main cost trend chart */}
      <ChartCard title="Daily Cost Trend" subtitle={`Spending over the selected period`}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={summary?.dailyTrend || []}>
            <defs>
              <linearGradient id="costAreaGrad" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#costAreaGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#1d4ed8', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* By Agent + By Model */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cost by Agent — horizontal bar */}
        <ChartCard title="Cost by Agent" subtitle="Sorted by spend" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={Math.max(200, byAgent.length * 40)}>
            <BarChart data={byAgent} layout="vertical" barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 30%, 12%)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'hsl(215, 20%, 40%)' }}
                tickFormatter={(v) => `$${v}`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="agentName"
                tick={{ fontSize: 10, fill: 'hsl(215, 20%, 50%)' }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']}
              />
              <Bar dataKey="cost" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cost by Model — donut */}
        <ChartCard title="Model Breakdown" subtitle="Cost distribution by model">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={summary?.byModel || []}
                dataKey="cost"
                nameKey="model"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                strokeWidth={0}
              >
                {summary?.byModel?.map((_, i) => (
                  <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {summary?.byModel?.map((m, i) => (
              <div key={m.model} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }} />
                  <span className="font-mono-nums truncate max-w-[140px]">{m.model}</span>
                </div>
                <span className="font-mono-nums font-medium">{formatCost(m.cost)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Budget alerts */}
      {alerts && alerts.length > 0 && (
        <ChartCard title="Budget Alerts" subtitle={`${alerts.filter(a => a.triggered).length} of ${alerts.length} triggered`}>
          <div className="space-y-5">
            {alerts.map(alert => {
              const pct = Math.min(100, (alert.currentSpend / alert.threshold) * 100);
              return (
                <div key={alert.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{alert.name}</span>
                      {alert.triggered && (
                        <Badge variant="error" className="text-[10px]">TRIGGERED</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono-nums">
                      {formatCost(alert.currentSpend)} / {formatCost(alert.threshold)}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    indicatorClassName={
                      pct > 90 ? 'bg-red-500' :
                      pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground capitalize">{alert.period} budget · {pct.toFixed(0)}% used</p>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
