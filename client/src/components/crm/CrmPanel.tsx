import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useApi } from '@/hooks/useApi';
import { formatUptime } from '@/lib/utils';
import type {
  CrmHealth,
  CrmGlobalStats,
  CrmOrganization,
  CrmActivity,
  CrmStatusBreakdown,
} from '@shared/types';
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
  Globe,
  UserCheck,
  TrendingUp,
  BarChart3,
  CreditCard,
} from 'lucide-react';

// ===== Helpers =====

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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'lead': return <Target className="w-3 h-3 text-blue-400" />;
    case 'deal': return <Handshake className="w-3 h-3 text-green-400" />;
    case 'client': return <Users className="w-3 h-3 text-purple-400" />;
    default: return <Activity className="w-3 h-3" />;
  }
}

function getStatusColor(status: string): string {
  const s = status?.toLowerCase();
  if (s === 'active' || s === 'paid' || s === 'won' || s === 'converted' || s === 'qualified') return 'text-green-400';
  if (s === 'inactive' || s === 'lost' || s === 'cold') return 'text-red-400';
  if (s === 'pending' || s === 'warm' || s === 'contacted' || s === 'negotiation' || s === 'proposal') return 'text-yellow-400';
  if (s === 'new') return 'text-blue-400';
  return 'text-muted-foreground';
}

function getPaymentBadge(status: string): 'success' | 'warning' | 'error' | 'secondary' {
  const s = status?.toLowerCase();
  if (s === 'paid' || s === 'active') return 'success';
  if (s === 'pending' || s === 'trialing') return 'warning';
  if (s === 'failed' || s === 'overdue') return 'error';
  return 'secondary';
}

// ===== Stat Card =====

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

// ===== Breakdown Card =====

function BreakdownCard({ title, icon: Icon, data, colorFn }: {
  title: string;
  icon: React.ElementType;
  data: CrmStatusBreakdown[] | null;
  colorFn: (s: string) => string;
}) {
  const total = data?.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="space-y-2">
            {data.map(item => {
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`capitalize font-medium ${colorFn(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="font-mono-nums text-muted-foreground">
                      {item.count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data available</p>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Main Panel =====

export function CrmPanel() {
  const { data: health } = useApi<CrmHealth>('/api/crm/health');
  const { data: stats } = useApi<CrmGlobalStats>('/api/crm/stats');
  const { data: orgs } = useApi<CrmOrganization[]>('/api/crm/organizations');
  const { data: activity } = useApi<CrmActivity[]>('/api/crm/activity');
  const { data: leadBreakdown } = useApi<CrmStatusBreakdown[]>('/api/crm/leads/by-status');
  const { data: dealBreakdown } = useApi<CrmStatusBreakdown[]>('/api/crm/deals/by-stage');

  const memPct = health && health.memory.total > 0
    ? (health.memory.used / health.memory.total) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">SalesPipe CRM — Super Admin</h2>
          <p className="text-sm text-muted-foreground">Cross-tenant overview • Direct database connection</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <Badge variant="secondary" className="text-[10px]">
              Updated {new Date(stats.lastChecked).toLocaleTimeString()}
            </Badge>
          )}
          {health && (
            <Badge variant={getHealthVariant(health.status)}>
              {getHealthLabel(health.status)}
            </Badge>
          )}
        </div>
      </div>

      {/* Row 1 — Global Stats Cards */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard icon={Globe} label="Organizations" value={stats?.totalOrganizations ?? '—'} color="bg-indigo-500" />
        <StatCard icon={UserCheck} label="Users" value={stats?.totalUsers ?? '—'} color="bg-cyan-500" />
        <StatCard icon={Target} label="Leads" value={stats?.totalLeads ?? '—'} color="bg-blue-500" />
        <StatCard icon={Handshake} label="Deals" value={stats?.totalDeals ?? '—'} color="bg-green-500" />
        <StatCard icon={Users} label="Clients" value={stats?.totalClients ?? '—'} color="bg-purple-500" />
        <StatCard icon={Building2} label="Companies" value={stats?.totalCompanies ?? '—'} color="bg-orange-500" />
      </div>

      {/* Row 2 — Health + Performance */}
      <div className="grid grid-cols-2 gap-4">
        {/* Health Card */}
        <Card className="relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${
            health?.status === 'ok' || health?.status === 'healthy' ? 'bg-status-healthy' :
            health?.status === 'unreachable' ? 'bg-status-critical' : 'bg-status-warning'
          }`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              CRM Application Health
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
      </div>

      {/* Row 3 — Tenant Directory Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Tenant Directory
          </CardTitle>
          <CardDescription className="text-[10px]">
            All organizations sorted by activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orgs && orgs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Organization</th>
                    <th className="text-left py-2 pr-4 font-medium">Plan</th>
                    <th className="text-left py-2 pr-4 font-medium">Status</th>
                    <th className="text-left py-2 pr-4 font-medium">Payment</th>
                    <th className="text-right py-2 pr-4 font-medium">Users</th>
                    <th className="text-right py-2 pr-4 font-medium">Leads</th>
                    <th className="text-right py-2 pr-4 font-medium">Deals</th>
                    <th className="text-right py-2 font-medium">Clients</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map(org => (
                    <tr key={org.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{org.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {org.seats} seat{org.seats !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {org.subscriptionTier}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`capitalize ${getStatusColor(org.status)}`}>
                          {org.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={getPaymentBadge(org.paymentStatus)} className="text-[10px] capitalize">
                          {org.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono-nums">{org.userCount}</td>
                      <td className="py-2 pr-4 text-right font-mono-nums">{org.leadCount}</td>
                      <td className="py-2 pr-4 text-right font-mono-nums">{org.dealCount}</td>
                      <td className="py-2 text-right font-mono-nums">{org.clientCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Loading organizations...</p>
          )}
        </CardContent>
      </Card>

      {/* Row 4 — Activity Feed + Breakdowns */}
      <div className="grid grid-cols-3 gap-4">
        {/* Activity Feed */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-[10px]">
              Cross-tenant feed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity && activity.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {activity.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1 border-b border-border/30 last:border-0">
                    <div className="mt-0.5">{getActivityIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.orgName} • {timeAgo(item.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[9px] capitalize flex-shrink-0">
                      {item.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Leads by Status */}
        <BreakdownCard
          title="Leads by Status"
          icon={BarChart3}
          data={leadBreakdown}
          colorFn={getStatusColor}
        />

        {/* Deals by Stage */}
        <BreakdownCard
          title="Deals by Stage"
          icon={CreditCard}
          data={dealBreakdown}
          colorFn={getStatusColor}
        />
      </div>

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
