import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Map agent IDs to workspace directories
function getWorkspaceDir(agentId: string): string | null {
  // basil uses workspace-main (default agent)
  const mapping: Record<string, string> = { basil: 'workspace-main' };
  const wsName = mapping[agentId] || `workspace-${agentId}`;
  const wsPath = path.join('/data/.openclaw', wsName);
  try {
    if (fs.statSync(wsPath).isDirectory()) return wsPath;
  } catch {}
  return null;
}

function getAgentIds(): string[] {
  try {
    const agentsDir = process.env.OPENCLAW_AGENTS_DIR || '/data/.openclaw/agents';
    return fs.readdirSync(agentsDir).filter(d => {
      if (d === 'main') return false; // skip main, basil uses it
      try { return fs.statSync(path.join(agentsDir, d)).isDirectory(); } catch { return false; }
    });
  } catch { return []; }
}

interface MemoryFile {
  agent: string;
  date: string; // YYYY-MM-DD or 'long-term'
  filename: string;
  path: string;
  content: string;
  sizeBytes: number;
  type: 'daily' | 'long-term' | 'other';
}

// GET /api/memory — list all memory entries across all agents
router.get('/', (req, res) => {
  try {
    const agentFilter = req.query.agent as string | undefined;
    const typeFilter = req.query.type as string | undefined;
    const entries: MemoryFile[] = [];

    // Get all agent IDs including basil (mapped to main)
    let agentIds = getAgentIds();
    agentIds.push('basil'); // basil uses workspace-main

    if (agentFilter) {
      agentIds = agentIds.filter(a => a === agentFilter);
    }

    for (const agentId of agentIds) {
      const wsDir = getWorkspaceDir(agentId);
      if (!wsDir) continue;

      // Long-term memory (MEMORY.md)
      if (!typeFilter || typeFilter === 'long-term') {
        const memoryMdPath = path.join(wsDir, 'MEMORY.md');
        try {
          const stat = fs.statSync(memoryMdPath);
          const content = fs.readFileSync(memoryMdPath, 'utf-8');
          entries.push({
            agent: agentId,
            date: 'long-term',
            filename: 'MEMORY.md',
            path: memoryMdPath,
            content,
            sizeBytes: stat.size,
            type: 'long-term',
          });
        } catch { /* no MEMORY.md */ }
      }

      // Daily memory files (memory/YYYY-MM-DD.md)
      if (!typeFilter || typeFilter === 'daily') {
        const memoryDir = path.join(wsDir, 'memory');
        try {
          const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')).sort().reverse();
          for (const file of files) {
            const filePath = path.join(memoryDir, file);
            try {
              const stat = fs.statSync(filePath);
              const content = fs.readFileSync(filePath, 'utf-8');
              // Extract date from filename (YYYY-MM-DD.md)
              const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
              const date = dateMatch ? dateMatch[1] : file.replace('.md', '');
              entries.push({
                agent: agentId,
                date,
                filename: file,
                path: filePath,
                content,
                sizeBytes: stat.size,
                type: dateMatch ? 'daily' : 'other',
              });
            } catch { /* skip unreadable */ }
          }
        } catch { /* no memory dir */ }
      }
    }

    // Sort by date desc, then agent
    entries.sort((a, b) => {
      if (a.date === 'long-term' && b.date !== 'long-term') return 1;
      if (b.date === 'long-term' && a.date !== 'long-term') return -1;
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.agent.localeCompare(b.agent);
    });

    res.json({ success: true, data: entries });
  } catch (err) {
    console.error('Memory API error:', err);
    res.json({ success: true, data: [] });
  }
});

// GET /api/memory/agents — list agents that have memory files
router.get('/agents', (_req, res) => {
  try {
    const agents: { id: string; dailyCount: number; hasLongTerm: boolean }[] = [];
    let agentIds = getAgentIds();
    agentIds.push('basil');

    for (const agentId of agentIds) {
      const wsDir = getWorkspaceDir(agentId);
      if (!wsDir) continue;

      const hasLongTerm = fs.existsSync(path.join(wsDir, 'MEMORY.md'));
      let dailyCount = 0;
      try {
        dailyCount = fs.readdirSync(path.join(wsDir, 'memory')).filter(f => f.endsWith('.md')).length;
      } catch {}

      if (hasLongTerm || dailyCount > 0) {
        agents.push({ id: agentId, dailyCount, hasLongTerm });
      }
    }

    res.json({ success: true, data: agents });
  } catch (err) {
    console.error('Memory agents error:', err);
    res.json({ success: true, data: [] });
  }
});

export default router;
