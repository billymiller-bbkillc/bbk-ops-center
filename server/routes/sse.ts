import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

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

// Simulate live updates - called from main server on interval
export function simulateUpdates() {
  const agents = db.select().from(schema.agents).all();

  for (const agent of agents) {
    if (agent.status === 'offline') continue;

    // Randomly fluctuate uptime
    const newUptime = agent.uptime + 5;
    db.update(schema.agents)
      .set({ uptime: newUptime, lastSeen: new Date().toISOString() })
      .where(eq(schema.agents.id, agent.id))
      .run();
  }

  // Fluctuate node health
  const nodes = db.select().from(schema.nodeHealth).all();
  for (const node of nodes) {
    if (node.status === 'offline') continue;

    const cpuDelta = (Math.random() - 0.5) * 8;
    const memDelta = (Math.random() - 0.5) * 3;
    const newCpu = Math.max(5, Math.min(99, node.cpuPercent + cpuDelta));
    const newMem = Math.max(10, Math.min(99, node.memoryPercent + memDelta));
    const newMemUsed = (newMem / 100) * node.memoryTotalMb;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (newCpu > 90 || newMem > 90) status = 'critical';
    else if (newCpu > 70 || newMem > 75) status = 'warning';

    db.update(schema.nodeHealth)
      .set({
        cpuPercent: Math.round(newCpu * 10) / 10,
        memoryPercent: Math.round(newMem * 10) / 10,
        memoryUsedMb: Math.round(newMemUsed),
        status,
        uptime: node.uptime + 5,
        lastUpdated: new Date().toISOString(),
      })
      .where(eq(schema.nodeHealth.id, node.id))
      .run();
  }

  // Broadcast updates
  const updatedAgents = db.select().from(schema.agents).all();
  const updatedNodes = db.select().from(schema.nodeHealth).all();

  broadcast('agent-update', updatedAgents);
  broadcast('health-update', updatedNodes);
  broadcast('heartbeat', { timestamp: new Date().toISOString() });
}

export default router;
