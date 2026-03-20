import { Router } from 'express';
import { getCronJobs } from '../lib/cron';
import fs from 'fs';

const router = Router();

interface CalendarEvent {
  id: string;
  name: string;
  owner: string; // agent name or 'system'
  type: 'cron' | 'heartbeat';
  schedule: string; // human-readable schedule
  cronExpr?: string;
  timezone?: string;
  enabled: boolean;
  nextRun?: string | null;
  lastRun?: string | null;
  lastStatus?: string;
  lastDurationMs?: number;
  description?: string;
}

// Parse cron expression to human-readable
function cronToHuman(expr: string, tz?: string): string {
  const parts = expr.split(' ');
  if (parts.length < 5) return expr;
  const [min, hour, dom, mon, dow] = parts;

  let desc = '';
  if (dom === '*' && mon === '*' && dow === '*') {
    if (hour === '*') desc = `Every hour at :${min.padStart(2, '0')}`;
    else if (min === '0') desc = `Daily at ${hour}:00`;
    else desc = `Daily at ${hour}:${min.padStart(2, '0')}`;
  } else if (dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNames = dow.split(',').map(d => days[parseInt(d)] || d).join(', ');
    desc = `${dayNames} at ${hour}:${min.padStart(2, '0')}`;
  } else {
    desc = expr;
  }

  if (tz) desc += ` (${tz})`;
  return desc;
}

router.get('/', (_req, res) => {
  try {
    const events: CalendarEvent[] = [];

    // 1. Cron jobs
    const cronJobs = getCronJobs();
    for (const job of cronJobs) {
      const scheduleStr = job.schedule.expr
        ? cronToHuman(job.schedule.expr, job.schedule.tz)
        : job.schedule.at
          ? `One-shot: ${new Date(job.schedule.at).toLocaleString()}`
          : `Every ${job.schedule.every}ms`;

      events.push({
        id: job.id,
        name: job.name,
        owner: job.agentId || 'system',
        type: 'cron',
        schedule: scheduleStr,
        cronExpr: job.schedule.expr,
        timezone: job.schedule.tz,
        enabled: job.enabled,
        nextRun: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
        lastRun: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
        lastStatus: job.state?.lastRunStatus,
        lastDurationMs: job.state?.lastDurationMs,
        description: job.payload.message?.slice(0, 200),
      });
    }

    // 2. Agent heartbeats from openclaw.json
    try {
      const configPath = (process.env.OPENCLAW_BASE_DIR || '/data/.openclaw') + '/openclaw.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const defaults = config.agents?.defaults || {};
      const defaultHeartbeat = defaults.heartbeat?.every || '30m';

      for (const agent of config.agents?.list || []) {
        const hb = agent.heartbeat?.every || defaultHeartbeat;
        events.push({
          id: `heartbeat-${agent.id}`,
          name: `${agent.id} heartbeat`,
          owner: agent.id,
          type: 'heartbeat',
          schedule: `Every ${hb}`,
          enabled: true,
          nextRun: null,
          lastRun: null,
          description: `Heartbeat poll for ${agent.name || agent.id}`,
        });
      }
    } catch { /* config read failed */ }

    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Calendar error:', err);
    res.json({ success: true, data: [] });
  }
});

export default router;
