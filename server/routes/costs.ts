import { Router } from 'express';
import { db, schema } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/summary', (req, res) => {
  const period = (req.query.period as string) || 'month';
  let daysBack = 30;
  if (period === 'day') daysBack = 1;
  else if (period === 'week') daysBack = 7;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const usage = db.select().from(schema.tokenUsage).all()
    .filter(u => u.date >= cutoffStr);

  const totalCost = usage.reduce((s, u) => s + u.cost, 0);
  const totalTokensIn = usage.reduce((s, u) => s + u.tokensIn, 0);
  const totalTokensOut = usage.reduce((s, u) => s + u.tokensOut, 0);

  // By agent
  const byAgentMap = new Map<string, { agentId: string; agentName: string; cost: number; tokensIn: number; tokensOut: number }>();
  for (const u of usage) {
    const existing = byAgentMap.get(u.agentId) || { agentId: u.agentId, agentName: u.agentName, cost: 0, tokensIn: 0, tokensOut: 0 };
    existing.cost += u.cost;
    existing.tokensIn += u.tokensIn;
    existing.tokensOut += u.tokensOut;
    byAgentMap.set(u.agentId, existing);
  }

  // By model
  const byModelMap = new Map<string, { model: string; cost: number; tokensIn: number; tokensOut: number }>();
  for (const u of usage) {
    const existing = byModelMap.get(u.model) || { model: u.model, cost: 0, tokensIn: 0, tokensOut: 0 };
    existing.cost += u.cost;
    existing.tokensIn += u.tokensIn;
    existing.tokensOut += u.tokensOut;
    byModelMap.set(u.model, existing);
  }

  // Daily trend
  const dailyMap = new Map<string, number>();
  for (const u of usage) {
    dailyMap.set(u.date, (dailyMap.get(u.date) || 0) + u.cost);
  }
  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    success: true,
    data: {
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokensIn,
      totalTokensOut,
      byAgent: Array.from(byAgentMap.values()).map(a => ({ ...a, cost: Math.round(a.cost * 100) / 100 })),
      byModel: Array.from(byModelMap.values()).map(m => ({ ...m, cost: Math.round(m.cost * 100) / 100 })),
      dailyTrend,
    },
  });
});

router.get('/alerts', (_req, res) => {
  const alerts = db.select().from(schema.budgetAlerts).all();
  res.json({ success: true, data: alerts });
});

export default router;
