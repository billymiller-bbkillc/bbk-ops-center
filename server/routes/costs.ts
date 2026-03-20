import { Router } from 'express';
import { getAllAgentUsage } from '../lib/openclaw';
import { db, schema } from '../db';

const router = Router();

router.get('/summary', (req, res) => {
  try {
    const period = (req.query.period as string) || 'month';
    let daysBack = 30;
    if (period === 'day') daysBack = 1;
    else if (period === 'week') daysBack = 7;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffStr = cutoff.toISOString();

    const allUsage = getAllAgentUsage();

    let totalCost = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    const byAgentMap = new Map<string, { agentId: string; agentName: string; cost: number; tokensIn: number; tokensOut: number }>();
    const byModelMap = new Map<string, { model: string; cost: number; tokensIn: number; tokensOut: number }>();
    const dailyMap = new Map<string, number>();

    for (const agentData of allUsage) {
      for (const u of agentData.usages) {
        // Filter by period
        if (u.timestamp && u.timestamp < cutoffStr) continue;

        totalCost += u.cost;
        totalTokensIn += u.tokensIn;
        totalTokensOut += u.tokensOut;

        // By agent
        const agentEntry = byAgentMap.get(agentData.agentId) || {
          agentId: agentData.agentId,
          agentName: agentData.agentName,
          cost: 0, tokensIn: 0, tokensOut: 0,
        };
        agentEntry.cost += u.cost;
        agentEntry.tokensIn += u.tokensIn;
        agentEntry.tokensOut += u.tokensOut;
        byAgentMap.set(agentData.agentId, agentEntry);

        // By model
        const modelEntry = byModelMap.get(u.model) || { model: u.model, cost: 0, tokensIn: 0, tokensOut: 0 };
        modelEntry.cost += u.cost;
        modelEntry.tokensIn += u.tokensIn;
        modelEntry.tokensOut += u.tokensOut;
        byModelMap.set(u.model, modelEntry);

        // Daily trend
        const dateStr = u.timestamp ? u.timestamp.split('T')[0] : 'unknown';
        if (dateStr !== 'unknown') {
          dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + u.cost);
        }
      }
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
  } catch (err) {
    console.error('Error computing costs:', err);
    res.json({
      success: true,
      data: {
        totalCost: 0,
        totalTokensIn: 0,
        totalTokensOut: 0,
        byAgent: [],
        byModel: [],
        dailyTrend: [],
      },
    });
  }
});

router.get('/alerts', (_req, res) => {
  const alerts = db.select().from(schema.budgetAlerts).all();
  res.json({ success: true, data: alerts });
});

router.get('/projection', (req, res) => {
  try {
    const allUsage = getAllAgentUsage();

    // Calculate daily average over last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString();

    let recentCost = 0;
    let recentDays = new Set<string>();

    for (const agentData of allUsage) {
      for (const u of agentData.usages) {
        if (u.timestamp && u.timestamp >= cutoff) {
          recentCost += u.cost;
          if (u.timestamp) {
            recentDays.add(u.timestamp.split('T')[0]);
          }
        }
      }
    }

    const activeDays = Math.max(recentDays.size, 1);
    const dailyAvg = recentCost / activeDays;

    // Days until April 30, 2026 (launch)
    const launchDate = new Date('2026-04-30');
    const now = new Date();
    const daysUntilLaunch = Math.max(0, Math.ceil((launchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Projected spend
    const projectedByLaunch = dailyAvg * daysUntilLaunch;
    const projectedMonthly = dailyAvg * 30;

    res.json({
      success: true,
      data: {
        dailyAverage: Math.round(dailyAvg * 100) / 100,
        daysUntilLaunch,
        projectedByLaunch: Math.round(projectedByLaunch * 100) / 100,
        projectedMonthly: Math.round(projectedMonthly * 100) / 100,
        basedOnDays: activeDays,
        recentTotalCost: Math.round(recentCost * 100) / 100,
      },
    });
  } catch (err) {
    console.error('Error computing projections:', err);
    res.json({ success: true, data: { dailyAverage: 0, daysUntilLaunch: 0, projectedByLaunch: 0, projectedMonthly: 0, basedOnDays: 0, recentTotalCost: 0 } });
  }
});

export default router;
