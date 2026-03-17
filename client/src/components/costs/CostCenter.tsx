import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useApi } from '@/hooks/useApi';
import { formatCost, formatTokens } from '@/lib/utils';
import type { CostSummary, BudgetAlert, CostPeriod } from '@shared/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, Coins } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#eab308', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];

export function CostCenter() {
  const [period, setPeriod] = useState<CostPeriod>('month');
  const { data: summary } = useApi<CostSummary>(`/api/costs/summary?period=${period}`, [period]);
  const { data: alerts } = useApi<BudgetAlert[]>('/api/costs/alerts');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cost Center</h2>
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

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal text-xs">
              <DollarSign className="w-3 h-3" /> Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-nums">{formatCost(summary?.totalCost || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal text-xs">
              <TrendingUp className="w-3 h-3" /> Input Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-nums">{formatTokens(summary?.totalTokensIn || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal text-xs">
              <Coins className="w-3 h-3" /> Output Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-nums">{formatTokens(summary?.totalTokensOut || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal text-xs">
              <AlertTriangle className="w-3 h-3" /> Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-nums">
              <span className={alerts?.some(a => a.triggered) ? 'text-status-critical' : 'text-status-healthy'}>
                {alerts?.filter(a => a.triggered).length || 0}
              </span>
              <span className="text-muted-foreground text-sm">/{alerts?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Daily spend trend */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Daily Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={summary?.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 8%)',
                    border: '1px solid hsl(222, 47%, 16%)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Model breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Model Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={summary?.byModel || []}
                  dataKey="cost"
                  nameKey="model"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={2}
                >
                  {summary?.byModel?.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 8%)',
                    border: '1px solid hsl(222, 47%, 16%)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {summary?.byModel?.map((m, i) => (
                <div key={m.model} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-mono-nums truncate max-w-[120px]">{m.model}</span>
                  </div>
                  <span className="font-mono-nums">{formatCost(m.cost)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent costs + Budget alerts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary?.byAgent || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 16%)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="agentName" tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 8%)',
                    border: '1px solid hsl(222, 47%, 16%)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts?.map(alert => {
              const pct = Math.min(100, (alert.currentSpend / alert.threshold) * 100);
              return (
                <div key={alert.id} className="space-y-1.5">
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
                      pct > 90 ? 'bg-status-critical' :
                      pct > 70 ? 'bg-status-warning' : 'bg-status-healthy'
                    }
                  />
                  <p className="text-[10px] text-muted-foreground capitalize">{alert.period} budget</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
