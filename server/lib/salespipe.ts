import type { CrmHealth, CrmStats, CrmPipeline } from '../../shared/types';

const SALESPIPE_URL = process.env.SALESPIPE_URL || 'https://www.salespipecrm.com';
const SALESPIPE_API_KEY = process.env.SALESPIPE_API_KEY || '';
const SALESPIPE_ORG_ID = process.env.SALESPIPE_ORG_ID || 'default-org-id';

// Cache
let cachedHealth: CrmHealth | null = null;
let cachedStats: CrmStats | null = null;
let cachedPipelines: CrmPipeline[] | null = null;
let healthInterval: ReturnType<typeof setInterval> | null = null;

const headers: Record<string, string> = {
  'x-api-key': SALESPIPE_API_KEY,
  'x-organization-id': SALESPIPE_ORG_ID,
  'Content-Type': 'application/json',
};

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${SALESPIPE_URL}${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`CRM API ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function refreshHealth(): Promise<void> {
  try {
    const raw = await fetchJson<{
      status: string;
      timestamp: string;
      uptime: number;
      memory: { used: number; total: number; external: number; rss: number };
      performance: { totalRequests: number; averageResponseTime: number; slowQueriesCount: number; errorCount: number };
    }>('/health');

    cachedHealth = {
      status: raw.status,
      uptime: raw.uptime,
      memory: { used: raw.memory.used, total: raw.memory.total, rss: raw.memory.rss },
      performance: {
        totalRequests: raw.performance.totalRequests,
        averageResponseTime: raw.performance.averageResponseTime,
        errorCount: raw.performance.errorCount,
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    console.error('CRM health fetch failed:', err);
    if (cachedHealth) {
      cachedHealth.status = 'unreachable';
      cachedHealth.lastChecked = new Date().toISOString();
    } else {
      cachedHealth = {
        status: 'unreachable',
        uptime: 0,
        memory: { used: 0, total: 0, rss: 0 },
        performance: { totalRequests: 0, averageResponseTime: 0, errorCount: 0 },
        lastChecked: new Date().toISOString(),
      };
    }
  }
}

async function refreshStats(): Promise<void> {
  try {
    const [leads, deals, clients, companies] = await Promise.all([
      fetchJson<{ success: boolean; data: { total: number } }>('/api/v1/leads?limit=1'),
      fetchJson<{ success: boolean; data: { total: number } }>('/api/v1/deals?limit=1'),
      fetchJson<{ success: boolean; data: { total: number } }>('/api/v1/clients?limit=1'),
      fetchJson<{ success: boolean; data: { total: number } }>('/api/v1/companies?limit=1'),
    ]);

    cachedStats = {
      leads: leads.data.total,
      deals: deals.data.total,
      clients: clients.data.total,
      companies: companies.data.total,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    console.error('CRM stats fetch failed:', err);
  }
}

async function refreshPipelines(): Promise<void> {
  try {
    const pipelinesRes = await fetchJson<{ success: boolean; data: { id: string; name: string; isDefault: boolean; isActive: boolean }[] }>('/api/v1/pipelines');

    const pipelines: CrmPipeline[] = [];
    for (const p of pipelinesRes.data) {
      try {
        const stagesRes = await fetchJson<{ success: boolean; data: { id: string; name: string; orderIndex: number; dealCount?: number }[] }>(
          `/api/v1/pipelines/${p.id}/stages`
        );
        pipelines.push({
          id: p.id,
          name: p.name,
          isDefault: p.isDefault,
          stages: (stagesRes.data || []).map(s => ({
            id: s.id,
            name: s.name,
            orderIndex: s.orderIndex,
            dealCount: s.dealCount,
          })),
        });
      } catch {
        pipelines.push({ id: p.id, name: p.name, isDefault: p.isDefault, stages: [] });
      }
    }

    cachedPipelines = pipelines;
  } catch (err) {
    console.error('CRM pipelines fetch failed:', err);
  }
}

// Start the 30-second polling loop
export function startCrmPolling(): void {
  if (healthInterval) return;
  // Initial fetch
  refreshHealth();
  refreshStats();
  refreshPipelines();
  // Poll every 30 seconds
  healthInterval = setInterval(() => {
    refreshHealth();
    refreshStats();
    refreshPipelines();
  }, 30_000);
}

export function getCrmHealth(): CrmHealth | null {
  return cachedHealth;
}

export function getCrmStats(): CrmStats | null {
  return cachedStats;
}

export function getPipelineData(): CrmPipeline[] | null {
  return cachedPipelines;
}
