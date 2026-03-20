import { Router, Request, Response } from 'express';
import { getAgents } from '../lib/openclaw';
import { getNodeHealth } from '../lib/system';
import { getQuickStats } from '../lib/crm-db';
import { getN8nSummary, getWorkflows, getExecutions } from '../lib/n8n';
import { getIssues } from '../lib/github';

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
  // SSE supports auth via query param since EventSource can't send headers
  const token = req.query.token as string;
  if (token) {
    const { verifyToken } = require('../lib/auth');
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid SSE token' });
    }
  }
  // If no token, allow unauthenticated SSE for now (will be locked down later)

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

// Poll interval in ms — single source of truth
export const SSE_POLL_INTERVAL = 5000;

// Real updates — called from main server on interval
export async function pollAndBroadcast() {
  try {
    const agents = await getAgents();
    const health = getNodeHealth(agents.length);

    broadcast('agent-update', agents);
    broadcast('health-update', [health]);

    // Broadcast CRM quick stats from DB
    try {
      const quickStats = await getQuickStats();
      broadcast('crm-update', quickStats);
    } catch {
      // DB may be unavailable, don't break SSE loop
    }

    broadcast('n8n-update', {
      summary: getN8nSummary(),
      workflows: getWorkflows(),
      executions: getExecutions(),
    });

    // Broadcast GitHub issues (mapped to tasks)
    try {
      const tasks = await getIssues();
      broadcast('github-task-update', tasks);
    } catch {
      // GitHub API may be rate-limited; don't break SSE loop
    }

    // Broadcast recent activity
    try {
      const { getRecentActivity } = require('../lib/activity');
      const recent = getRecentActivity(10);
      broadcast('activity-update', recent);
    } catch { /* ignore */ }

    broadcast('heartbeat', { timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('SSE poll error:', err);
    broadcast('heartbeat', { timestamp: new Date().toISOString() });
  }
}

export default router;
