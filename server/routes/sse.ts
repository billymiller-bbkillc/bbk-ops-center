import { Router, Request, Response } from 'express';
import { getAgents } from '../lib/openclaw';
import { getNodeHealth } from '../lib/system';
import { getCrmHealth } from '../lib/salespipe';
import { getGlobalStats } from '../lib/crm-db';
import { getN8nSummary, getWorkflows, getExecutions } from '../lib/n8n';

const router = Router();

// Store connected SSE clients
const clients: Set<Response> = new Set();

export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

router.get('/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

// Real updates — called from main server on interval
export async function pollAndBroadcast() {
  try {
    const agents = await getAgents();
    const health = getNodeHealth(agents.length);

    broadcast('agent-update', agents);
    broadcast('health-update', [health]);
    const crmHealth = getCrmHealth();
    if (crmHealth) {
      broadcast('crm-update', crmHealth);
    }

    // Broadcast global CRM stats from DB
    try {
      const globalStats = await getGlobalStats();
      broadcast('crm-stats-update', globalStats);
    } catch {
      // DB may be unavailable, don't break SSE loop
    }

    broadcast('n8n-update', {
      summary: getN8nSummary(),
      workflows: getWorkflows(),
      executions: getExecutions(),
    });

    broadcast('heartbeat', { timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('SSE poll error:', err);
    broadcast('heartbeat', { timestamp: new Date().toISOString() });
  }
}

export default router;
