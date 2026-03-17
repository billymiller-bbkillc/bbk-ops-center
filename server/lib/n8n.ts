import type { N8nWorkflow, N8nExecution, N8nSummary } from '../../shared/types';

const N8N_URL = process.env.N8N_URL || 'https://n8n.salespipecrm.com';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

// Cache
let cachedWorkflows: N8nWorkflow[] = [];
let cachedExecutions: N8nExecution[] = [];
let lastChecked: string = new Date().toISOString();
let pollingInterval: ReturnType<typeof setInterval> | null = null;

const headers: Record<string, string> = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Accept': 'application/json',
};

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${N8N_URL}${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`N8N API ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function refreshWorkflows(): Promise<void> {
  try {
    const res = await fetchJson<{
      data: {
        id: string;
        name: string;
        active: boolean;
        isArchived?: boolean;
        createdAt: string;
        updatedAt: string;
        nodes?: unknown[];
      }[];
    }>('/api/v1/workflows');

    cachedWorkflows = res.data.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      isArchived: w.isArchived ?? false,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      nodeCount: w.nodes?.length ?? 0,
    }));
    lastChecked = new Date().toISOString();
  } catch (err) {
    console.error('N8N workflows fetch failed:', err);
  }
}

async function refreshExecutions(): Promise<void> {
  try {
    const res = await fetchJson<{
      data: {
        id: string;
        finished: boolean;
        mode: string;
        startedAt: string;
        stoppedAt: string | null;
        workflowId: string;
        status: string;
      }[];
    }>('/api/v1/executions?limit=50');

    cachedExecutions = res.data.map((e) => {
      const workflow = cachedWorkflows.find((w) => w.id === e.workflowId);
      const duration =
        e.startedAt && e.stoppedAt
          ? new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime()
          : undefined;

      return {
        id: e.id,
        workflowId: e.workflowId,
        workflowName: workflow?.name,
        status: e.status,
        finished: e.finished,
        mode: e.mode,
        startedAt: e.startedAt,
        stoppedAt: e.stoppedAt,
        duration,
      };
    });
    lastChecked = new Date().toISOString();
  } catch (err) {
    console.error('N8N executions fetch failed:', err);
  }
}

export function getWorkflows(): N8nWorkflow[] {
  return cachedWorkflows;
}

export function getExecutions(): N8nExecution[] {
  return cachedExecutions;
}

export function getN8nSummary(): N8nSummary {
  const successful = cachedExecutions.filter((e) => e.status === 'success').length;
  const failed = cachedExecutions.filter(
    (e) => e.status === 'error' || e.status === 'failed' || e.status === 'crashed'
  ).length;

  const lastExecution = cachedExecutions.length > 0 ? cachedExecutions[0].startedAt : null;

  return {
    totalWorkflows: cachedWorkflows.length,
    activeWorkflows: cachedWorkflows.filter((w) => w.active).length,
    inactiveWorkflows: cachedWorkflows.filter((w) => !w.active).length,
    totalExecutions: cachedExecutions.length,
    successfulExecutions: successful,
    failedExecutions: failed,
    lastExecutionAt: lastExecution,
    lastChecked,
  };
}

export function startN8nPolling(): void {
  if (pollingInterval) return;
  // Initial fetch
  refreshWorkflows().then(() => refreshExecutions());
  // Poll every 30 seconds
  pollingInterval = setInterval(async () => {
    await refreshWorkflows();
    await refreshExecutions();
  }, 30_000);
}
