import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CRON_JOBS_FILE = process.env.OPENCLAW_CRON_FILE || '/data/.openclaw/cron/jobs.json';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'E1QiKQwbhRJ0kVuLRM7mjK2tLdcy7vOP';

export interface CronJob {
  id: string;
  agentId?: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: {
    kind: 'cron' | 'at' | 'every';
    expr?: string;
    at?: string;
    every?: number;
    tz?: string;
  };
  sessionTarget: 'main' | 'isolated';
  wakeMode?: string;
  payload: {
    kind: 'agentTurn' | 'systemEvent';
    message?: string;
    model?: string;
  };
  delivery?: {
    mode: 'announce' | 'webhook' | 'none';
    channel?: string;
    to?: string;
  };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastRunStatus?: string;
    lastDurationMs?: number;
    consecutiveErrors?: number;
  };
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface CronJobsFile {
  version: number;
  jobs: CronJob[];
}

// Read cron jobs from file
export function getCronJobs(): CronJob[] {
  try {
    const content = fs.readFileSync(CRON_JOBS_FILE, 'utf-8');
    const data: CronJobsFile = JSON.parse(content);
    return data.jobs || [];
  } catch (err) {
    console.error('Failed to read cron jobs:', err);
    return [];
  }
}

// Get a single cron job by ID
export function getCronJob(id: string): CronJob | null {
  const jobs = getCronJobs();
  return jobs.find(j => j.id === id) || null;
}

// Add a cron job via CLI (safest approach - lets gateway handle validation)
export function addCronJob(params: {
  name: string;
  cron?: string;
  at?: string;
  every?: string;
  tz?: string;
  session?: 'main' | 'isolated';
  message?: string;
  agentId?: string;
  model?: string;
  announce?: boolean;
  channel?: string;
  to?: string;
}): { success: boolean; error?: string } {
  try {
    const args: string[] = ['openclaw', 'cron', 'add'];
    args.push('--name', `"${params.name}"`);

    if (params.cron) args.push('--cron', `"${params.cron}"`);
    if (params.at) args.push('--at', `"${params.at}"`);
    if (params.every) args.push('--every', params.every);
    if (params.tz) args.push('--tz', params.tz);
    if (params.session) args.push('--session', params.session);
    if (params.message) args.push('--message', `"${params.message.replace(/"/g, '\\"')}"`);
    if (params.agentId) args.push('--agent', params.agentId);
    if (params.model) args.push('--model', `"${params.model}"`);
    if (params.announce !== false) args.push('--announce');
    if (params.channel) args.push('--channel', params.channel);
    if (params.to) args.push('--to', `"${params.to}"`);

    execSync(args.join(' '), { timeout: 15000, encoding: 'utf-8' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.stderr || err.message || 'Failed to add cron job' };
  }
}

// Enable/disable a cron job via CLI
export function toggleCronJob(id: string, enable: boolean): { success: boolean; error?: string } {
  try {
    const cmd = enable ? 'enable' : 'disable';
    execSync(`openclaw cron ${cmd} ${id}`, { timeout: 10000, encoding: 'utf-8' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.stderr || err.message };
  }
}

// Delete a cron job via CLI
export function deleteCronJob(id: string): { success: boolean; error?: string } {
  try {
    execSync(`openclaw cron rm ${id} --yes`, { timeout: 10000, encoding: 'utf-8' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.stderr || err.message };
  }
}

// Run a cron job immediately via CLI
export function runCronJob(id: string): { success: boolean; error?: string } {
  try {
    execSync(`openclaw cron run ${id}`, { timeout: 10000, encoding: 'utf-8' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.stderr || err.message };
  }
}

// Get cron run history for a job
export function getCronRuns(id: string, limit: number = 20): any[] {
  const runsFile = path.join(path.dirname(CRON_JOBS_FILE), 'runs', `${id}.jsonl`);
  try {
    const content = fs.readFileSync(runsFile, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    return lines.slice(-limit).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean).reverse();
  } catch {
    return [];
  }
}
