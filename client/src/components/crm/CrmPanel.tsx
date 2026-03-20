import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { useSSE } from '@/hooks/useSSE';
import { cn } from '@/lib/utils';
import type {
  CrmQuickStats,
  CrmTenant,
  CrmUser,
  CrmLoginEvent,
  CrmFunnelData,
  InactiveTenant,
} from '@shared/types';
import {
  Building2,
  Users,
  Activity,
  ChevronUp,
  ChevronDown,
  Shield,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  X,
} from 'lucide-react';

// ===== FunnelStep Component =====
function FunnelStep({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 bg-accent rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ===== Helpers =====

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return 'Never';
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getPlanBadgeColor(plan: string): 'success' | 'warning' | 'error' | 'secondary' {
  const p = plan?.toLowerCase();
  if (p === 'enterprise' || p === 'pro') return 'success';
  if (p === 'starter' || p === 'basic') return 'warning';
  return 'secondary';
}

function getStatusColor(status: string): string {
  const s = status?.toLowerCase();
  if (s === 'active') return 'text-emerald-400';
  if (s === 'inactive' || s === 'suspended') return 'text-red-400';
  if (s === 'pending' || s === 'trial') return 'text-amber-400';
  return 'text-muted-foreground';
}

function getRoleBadge(role: string): 'success' | 'warning' | 'secondary' {
  const r = role?.toLowerCase();
  if (r === 'admin' || r === 'owner') return 'success';
  if (r === 'manager') return 'warning';
  return 'secondary';
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'login':
      return <LogIn className="w-3.5 h-3.5 text-emerald-400" />;
    case 'logout':
      return <LogOut className="w-3.5 h-3.5 text-blue-400" />;
    case 'login_failed':
      return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function getEventBadgeVariant(eventType: string): 'success' | 'warning' | 'error' | 'secondary' {
  switch (eventType) {
    case 'login': return 'success';
    case 'logout': return 'secondary';
    case 'login_failed': return 'error';
    default: return 'secondary';
  }
}

// ===== Sorting =====

type SortDir = 'asc' | 'desc';

function SortHeader({ label, active, dir, onClick }: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th
      className="py-2.5 pr-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors text-left"
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  );
}

function useSortable<T>(data: T[] | null, defaultKey: keyof T, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggle = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
}

// ===== Main Panel =====

export function CrmPanel() {
  const { data: stats, setData: setStats } = useApi<CrmQuickStats>('/api/crm/stats');
  const { data: tenants } = useApi<CrmTenant[]>('/api/crm/tenants');
  const { data: allUsers } = useApi<CrmUser[]>('/api/crm/users');
  const { data: loginEvents } = useApi<CrmLoginEvent[]>('/api/crm/logins');
  const { data: funnel } = useApi<CrmFunnelData>('/api/crm/funnel');
  const { data: inactiveTenants } = useApi<InactiveTenant[]>('/api/crm/inactive');

  // Live SSE updates for CRM quick stats
  useSSE({
    'crm-update': (data) => setStats(data as CrmQuickStats),
  });

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const selectedTenant = tenants?.find(t => t.id === selectedTenantId);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return null;
    if (!selectedTenantId) return allUsers;
    return allUsers.filter(u => u.organizationId === selectedTenantId);
  }, [allUsers, selectedTenantId]);

  const tenantSort = useSortable(tenants, 'userCount' as keyof CrmTenant, 'desc');
  const userSort = useSortable(filteredUsers, 'lastLoginAt' as keyof CrmUser, 'desc');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">SalesPipe CRM — Super Admin</h2>
          <p className="text-sm text-muted-foreground">Tenant directory • User tracking • Login activity</p>
        </div>
        {stats && (
          <Badge variant="secondary" className="text-[10px]">
            Updated {new Date(stats.lastChecked).toLocaleTimeString()}
          </Badge>
        )}
      </div>

      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-3 gap-6">
        <StatCard
          icon={Building2}
          value={stats?.totalTenants ?? '—'}
          label="Total Tenants"
          subtitle="All organizations"
          accentColor="blue"
        />
        <StatCard
          icon={Users}
          value={stats?.totalUsers ?? '—'}
          label="Total Users"
          subtitle="Across all tenants"
          accentColor="green"
        />
        <StatCard
          icon={Shield}
          value={stats?.activeTenants ?? 'N/A'}
          label="Active Tenants"
          subtitle="Logged in last 30 days"
          accentColor="amber"
        />
      </div>

      {/* Conversion Funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ChevronDown className="w-4 h-4" /> Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel ? (
              <>
                <FunnelStep label="Total Signups" value={funnel.totalSignups} max={funnel.totalSignups} color="bg-blue-500" />
                <FunnelStep label="Activated (logged in)" value={funnel.activatedTenants} max={funnel.totalSignups} color="bg-amber-500" />
                <FunnelStep label="Active (7d)" value={funnel.activeRecent} max={funnel.totalSignups} color="bg-emerald-500" />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Loading funnel data...</p>
            )}
          </CardContent>
        </Card>

        {inactiveTenants && inactiveTenants.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Inactive Tenants ({inactiveTenants.length})
              </CardTitle>
              <CardDescription>No login activity for 14+ days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inactiveTenants.slice(0, 10).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground">
                      {t.daysSinceLogin ? `${t.daysSinceLogin}d ago` : 'Never logged in'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Inactive Tenants
              </CardTitle>
              <CardDescription>No login activity for 14+ days</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">No inactive tenants found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 2 — Tenant Directory */}
      <ChartCard
        title="Tenant Directory"
        subtitle={`${tenants?.length ?? 0} organizations${selectedTenantId ? ' • Click ✕ to clear filter' : ''}`}
        action={selectedTenantId && (
          <button
            onClick={() => setSelectedTenantId(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
          >
            <X className="w-3 h-3" />
            Clear filter: {selectedTenant?.name}
          </button>
        )}
      >
        {tenants && tenants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <SortHeader label="Tenant Name" active={tenantSort.sortKey === 'name'} dir={tenantSort.sortDir} onClick={() => tenantSort.toggle('name')} />
                  <SortHeader label="Plan" active={tenantSort.sortKey === 'planType'} dir={tenantSort.sortDir} onClick={() => tenantSort.toggle('planType')} />
                  <SortHeader label="Status" active={tenantSort.sortKey === 'status'} dir={tenantSort.sortDir} onClick={() => tenantSort.toggle('status')} />
                  <SortHeader label="Users" active={tenantSort.sortKey === 'userCount'} dir={tenantSort.sortDir} onClick={() => tenantSort.toggle('userCount')} />
                  <SortHeader label="Created" active={tenantSort.sortKey === 'createdAt'} dir={tenantSort.sortDir} onClick={() => tenantSort.toggle('createdAt')} />
                </tr>
              </thead>
              <tbody>
                {tenantSort.sorted.map((tenant, idx) => (
                  <tr
                    key={tenant.id}
                    onClick={() => setSelectedTenantId(tenant.id === selectedTenantId ? null : tenant.id)}
                    className={`border-b border-border/30 cursor-pointer transition-colors ${
                      tenant.id === selectedTenantId
                        ? 'bg-blue-500/10 hover:bg-blue-500/15'
                        : idx % 2 === 0
                          ? 'hover:bg-accent/30'
                          : 'bg-accent/5 hover:bg-accent/30'
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium">{tenant.name}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={getPlanBadgeColor(tenant.subscriptionTier)} className="text-[10px] capitalize">
                        {tenant.subscriptionTier}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`capitalize font-medium ${getStatusColor(tenant.status)}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono-nums">{tenant.userCount}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{formatDate(tenant.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading tenants...</p>
        )}
      </ChartCard>

      {/* Row 3 — Users + Login Activity side by side */}
      <div className="grid grid-cols-5 gap-6">
        {/* Users Table — 3/5 */}
        <div className="col-span-3">
          <ChartCard
            title={selectedTenant ? `Users — ${selectedTenant.name}` : 'All Users'}
            subtitle={`${filteredUsers?.length ?? 0} users`}
          >
            {filteredUsers && filteredUsers.length > 0 ? (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border text-muted-foreground">
                      <SortHeader label="Name" active={userSort.sortKey === 'lastName'} dir={userSort.sortDir} onClick={() => userSort.toggle('lastName')} />
                      <SortHeader label="Email" active={userSort.sortKey === 'email'} dir={userSort.sortDir} onClick={() => userSort.toggle('email')} />
                      <SortHeader label="Role" active={userSort.sortKey === 'role'} dir={userSort.sortDir} onClick={() => userSort.toggle('role')} />
                      {!selectedTenantId && (
                        <SortHeader label="Tenant" active={userSort.sortKey === 'orgName'} dir={userSort.sortDir} onClick={() => userSort.toggle('orgName')} />
                      )}
                      <SortHeader label="Last Login" active={userSort.sortKey === 'lastLoginAt'} dir={userSort.sortDir} onClick={() => userSort.toggle('lastLoginAt')} />
                      <SortHeader label="Logins" active={userSort.sortKey === 'loginCount'} dir={userSort.sortDir} onClick={() => userSort.toggle('loginCount')} />
                    </tr>
                  </thead>
                  <tbody>
                    {userSort.sorted.map((user, idx) => (
                      <tr
                        key={user.id}
                        className={`border-b border-border/30 transition-colors ${
                          idx % 2 === 0 ? 'hover:bg-accent/30' : 'bg-accent/5 hover:bg-accent/30'
                        }`}
                      >
                        <td className="py-2 pr-4 font-medium whitespace-nowrap">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground truncate max-w-[180px]">{user.email}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={getRoleBadge(user.role)} className="text-[10px] capitalize">
                            {user.role}
                          </Badge>
                        </td>
                        {!selectedTenantId && (
                          <td className="py-2 pr-4 text-muted-foreground truncate max-w-[140px]">{user.orgName}</td>
                        )}
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(user.lastLoginAt)}
                          </span>
                        </td>
                        <td className="py-2 pr-4 font-mono-nums text-center">{user.loginCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filteredUsers && filteredUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No users found</p>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">Loading users...</p>
            )}
          </ChartCard>
        </div>

        {/* Login Activity — 2/5 */}
        <div className="col-span-2">
          <ChartCard
            title="Login Activity"
            subtitle="Recent login events"
          >
            {loginEvents && loginEvents.length > 0 ? (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {loginEvents.map(event => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-accent/30 transition-colors border-b border-border/20 last:border-0"
                  >
                    <div className="mt-0.5">{getEventIcon(event.eventType)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{event.email}</span>
                        <Badge variant={getEventBadgeVariant(event.eventType)} className="text-[9px] capitalize flex-shrink-0">
                          {event.eventType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground truncate">{event.orgName}</span>
                        {event.ipAddress && (
                          <span className="text-[10px] text-muted-foreground font-mono-nums">
                            {event.ipAddress}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(event.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No login events yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
                  Login tracking is active. Events will appear here as users log in.
                </p>
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
