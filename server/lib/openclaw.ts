import fs from 'fs';
import path from 'path';
import type { Agent, AgentStatus, AgentSession } from '../../shared/types';

const AGENTS_DIR = process.env.OPENCLAW_AGENTS_DIR || '/data/.openclaw/agents';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'E1QiKQwbhRJ0kVuLRM7mjK2tLdcy7vOP';

// Skip the 'main' directory — it's the gateway, not an agent
const SKIP_DIRS = new Set(['main']);

// Business unit mapping for known agents
const BUSINESS_UNITS: Record<string, string> = {
  bubba: 'BBK Holdings',
  ashley: 'BBK Holdings',
  basil: 'BBK Holdings',
  bo: 'BBK Holdings',
  butter: 'BBK Holdings',
  kosi: 'BBK Holdings',
  maria: 'BBK Holdings',
  sophie: 'BBK Holdings',
  woody: 'BBK Holdings',
};

// Model pricing per 1M tokens (input / output)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-haiku-4-20250414': { input: 0.80, output: 4 },
  'claude-haiku-4.5': { input: 0.80, output: 4 },
  'gemini-3-flash-preview': { input: 0.10, output: 0.40 },
  'gemini-2.5-flash': { input: 0.10, output: 0.40 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-3.1-pro-preview': { input: 1.25, output: 10 },
};

function getModelPricing(model: string): { input: number; output: number } {
  // Try exact match first
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  // Try partial match
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.includes(key) || key.includes(model)) return pricing;
  }
  // Default to a mid-range price
  return { input: 3, output: 15 };
}

export function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = getModelPricing(model);
  return (tokensIn * pricing.input + tokensOut * pricing.output) / 1_000_000;
}

interface SessionMeta {
  sessionId: string;
  updatedAt: number;
  sessionFile?: string;
  lastChannel?: string;
  chatType?: string;
  abortedLastRun?: boolean;
}

interface SessionsJson {
  [key: string]: SessionMeta;
}

function readSessionsJson(agentName: string): SessionsJson {
  const filePath = path.join(AGENTS_DIR, agentName, 'sessions', 'sessions.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function getSessionFiles(agentName: string): string[] {
  const sessionsDir = path.join(AGENTS_DIR, agentName, 'sessions');
  try {
    return fs.readdirSync(sessionsDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => path.join(sessionsDir, f));
  } catch {
    return [];
  }
}

function getAgentDirs(): string[] {
  try {
    return fs.readdirSync(AGENTS_DIR)
      .filter(d => !SKIP_DIRS.has(d))
      .filter(d => {
        try {
          return fs.statSync(path.join(AGENTS_DIR, d)).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

// Cache for gateway sessions to avoid hammering the API
let gatewaySessionsCache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

async function fetchGatewaySessions(): Promise<any[]> {
  const now = Date.now();
  if (gatewaySessionsCache && (now - gatewaySessionsCache.fetchedAt) < CACHE_TTL_MS) {
    return gatewaySessionsCache.data;
  }

  try {
    const resp = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({ tool: 'sessions_list', args: { limit: 100, messageLimit: 0 } }),
    });
    if (!resp.ok) return gatewaySessionsCache?.data || [];
    const result = await resp.json();
    const sessions = result?.result?.sessions || result?.sessions || [];
    gatewaySessionsCache = { data: sessions, fetchedAt: now };
    return sessions;
  } catch {
    return gatewaySessionsCache?.data || [];
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function getAgents(): Promise<Agent[]> {
  const agentDirs = getAgentDirs();
  const gatewaySessions = await fetchGatewaySessions();

  const agents: Agent[] = [];

  for (const agentName of agentDirs) {
    const sessionsJson = readSessionsJson(agentName);
    const sessionKeys = Object.keys(sessionsJson);

    // Find the most recently updated session
    let latestSession: SessionMeta | null = null;
    let latestModel = 'unknown';
    let latestKey = '';

    for (const [key, meta] of Object.entries(sessionsJson)) {
      if (!latestSession || meta.updatedAt > latestSession.updatedAt) {
        latestSession = meta;
        latestKey = key;
      }
    }

    // Check gateway for active session status
    const gatewayMatch = gatewaySessions.find((s: any) =>
      s.sessionKey?.includes(`agent:${agentName}:`) || s.agent === agentName
    );

    // Determine model from JSONL if available
    if (latestSession?.sessionFile) {
      latestModel = getModelFromJsonl(latestSession.sessionFile);
    } else {
      // Try to find the model from the session JSONL files
      const files = getSessionFiles(agentName);
      if (files.length > 0) {
        latestModel = getModelFromJsonl(files[files.length - 1]);
      }
    }

    // Determine status
    let status: AgentStatus = 'idle';
    const lastSeenTs = latestSession?.updatedAt || 0;
    const ageMs = Date.now() - lastSeenTs;

    if (gatewayMatch?.active || gatewayMatch?.running) {
      status = 'busy';
    } else if (ageMs < 12 * 60 * 60 * 1000) {
      status = 'active';
    } else {
      status = 'idle';
    }

    if (agentName === 'bubba') {
      console.log(`[DEBUG] Bubba status check: status=${status}, ageMs=${ageMs}, lastSeen=${new Date(lastSeenTs).toISOString()}`);
    }

    // Calculate uptime as time since first session
    const allUpdatedAts = Object.values(sessionsJson).map(s => s.updatedAt);
    const earliestSession = Math.min(...allUpdatedAts);
    const uptime = allUpdatedAts.length > 0 ? Math.floor((Date.now() - earliestSession) / 1000) : 0;

    // Determine current task from the latest session key
    let currentTask: string | null = null;
    if (status !== 'offline' && latestKey) {
      // Session key format: "agent:name:main" or "agent:name:subagent:id"
      if (latestKey.includes(':subagent:')) {
        currentTask = 'Running subagent task';
      } else if (latestKey.includes(':main')) {
        currentTask = 'Active in main session';
      } else {
        currentTask = `Session: ${latestKey}`;
      }
    }

    agents.push({
      id: `agent-${agentName}`,
      name: capitalize(agentName),
      status,
      model: latestModel,
      currentTask,
      uptime,
      lastSeen: latestSession ? new Date(latestSession.updatedAt).toISOString() : new Date(0).toISOString(),
      nodeId: 'vps-main',
      businessUnit: BUSINESS_UNITS[agentName] || 'BBK Holdings',
    });
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAgent(id: string): Promise<Agent | null> {
  const agents = await getAgents();
  return agents.find(a => a.id === id) || null;
}

function getModelFromJsonl(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    // Search backwards for the last model_change or assistant message with model
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'model_change' && entry.modelId) {
          return entry.modelId;
        }
        if (entry.type === 'message' && entry.message?.role === 'assistant' && entry.message?.model) {
          return entry.message.model;
        }
      } catch { continue; }
    }
  } catch { /* ignore */ }
  return 'unknown';
}

export interface ParsedUsage {
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  timestamp: string;
}

export function parseJsonlUsage(filePath: string): ParsedUsage[] {
  const usages: ParsedUsage[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'message' && entry.message?.role === 'assistant' && entry.message?.usage) {
          const usage = entry.message.usage;
          const model = entry.message.model || 'unknown';
          const tokensIn = usage.input || 0;
          const tokensOut = usage.output || 0;
          const cost = usage.cost?.total || calculateCost(model, tokensIn, tokensOut);

          usages.push({
            model,
            tokensIn,
            tokensOut,
            cost: typeof cost === 'number' ? cost : 0,
            timestamp: entry.timestamp || '',
          });
        }
      } catch { continue; }
    }
  } catch { /* ignore */ }
  return usages;
}

export function getAgentSessions(agentId: string): AgentSession[] {
  const agentName = agentId.replace('agent-', '');
  const sessionsJson = readSessionsJson(agentName);
  const sessionFiles = getSessionFiles(agentName);

  const sessions: AgentSession[] = [];

  for (const filePath of sessionFiles) {
    const fileName = path.basename(filePath, '.jsonl');
    const usages = parseJsonlUsage(filePath);

    // Find matching session metadata
    let sessionMeta: SessionMeta | null = null;
    for (const meta of Object.values(sessionsJson)) {
      if (meta.sessionId === fileName) {
        sessionMeta = meta;
        break;
      }
    }

    const totalTokensIn = usages.reduce((s, u) => s + u.tokensIn, 0);
    const totalTokensOut = usages.reduce((s, u) => s + u.tokensOut, 0);
    const totalCost = usages.reduce((s, u) => s + u.cost, 0);
    const model = usages.length > 0 ? usages[usages.length - 1].model : 'unknown';

    // Get timestamps from JSONL
    let startedAt = '';
    let endedAt: string | null = null;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const firstLine = content.split('\n')[0];
      const firstEntry = JSON.parse(firstLine);
      startedAt = firstEntry.timestamp || '';

      const lines = content.split('\n').filter(Boolean);
      const lastLine = lines[lines.length - 1];
      const lastEntry = JSON.parse(lastLine);
      endedAt = lastEntry.timestamp || null;
    } catch { /* ignore */ }

    // Determine task name from session key
    let task = 'Session';
    if (sessionMeta) {
      for (const [key, meta] of Object.entries(sessionsJson)) {
        if (meta.sessionId === fileName) {
          if (key.includes(':main')) task = 'Main session';
          else if (key.includes(':subagent:')) task = 'Subagent task';
          else task = key;
          break;
        }
      }
    }

    // Determine if the session is still active
    const lastUpdateMs = sessionMeta?.updatedAt || 0;
    const isRecent = (Date.now() - lastUpdateMs) < 10 * 60 * 1000;

    sessions.push({
      id: fileName,
      agentId,
      startedAt,
      endedAt: isRecent ? null : endedAt,
      model,
      task,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      cost: Math.round(totalCost * 100) / 100,
      status: isRecent ? 'active' : 'completed',
    });
  }

  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getAllAgentUsage(): { agentName: string; agentId: string; usages: ParsedUsage[] }[] {
  const agentDirs = getAgentDirs();
  const result: { agentName: string; agentId: string; usages: ParsedUsage[] }[] = [];

  for (const agentName of agentDirs) {
    const files = getSessionFiles(agentName);
    const allUsages: ParsedUsage[] = [];

    for (const file of files) {
      allUsages.push(...parseJsonlUsage(file));
    }

    result.push({
      agentName: capitalize(agentName),
      agentId: `agent-${agentName}`,
      usages: allUsages,
    });
  }

  return result;
}
