import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const OPENCLAW_BASE = process.env.OPENCLAW_BASE_DIR || '/data/.openclaw';

interface Document {
  id: string;
  title: string;
  filename: string;
  path: string;
  agent: string;
  category: string;
  content: string;
  preview: string; // first 300 chars
  sizeBytes: number;
  modifiedAt: string;
  createdAt: string;
}

// Files to exclude from document listing (system files)
const SYSTEM_FILES = new Set([
  'AGENTS.md', 'SOUL.md', 'USER.md', 'IDENTITY.md', 'TOOLS.md',
  'HEARTBEAT.md', 'BOOTSTRAP.md', 'MEMORY.md', 'RULES.md',
]);

// Categorize a document based on its path and content
function categorize(filePath: string, _filename: string): string {
  const lower = filePath.toLowerCase();
  if (lower.includes('plan') || lower.includes('roadmap') || lower.includes('execution')) return 'Plans';
  if (lower.includes('guide') || lower.includes('setup') || lower.includes('how')) return 'Guides';
  if (lower.includes('audit') || lower.includes('review')) return 'Audits';
  if (lower.includes('deploy') || lower.includes('release')) return 'Deployment';
  if (lower.includes('api') || lower.includes('webhook') || lower.includes('integration')) return 'API & Integrations';
  if (lower.includes('troubleshoot') || lower.includes('fix') || lower.includes('debug')) return 'Troubleshooting';
  if (lower.includes('test')) return 'Testing';
  if (lower.includes('readme')) return 'README';
  if (lower.includes('skill')) return 'Skills';
  return 'General';
}

// Extract title from markdown content (first # heading or filename)
function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return filename.replace(/\.md$/, '').replace(/[-_]/g, ' ');
}

// Map workspace dir name to agent ID
function wsToAgent(wsName: string): string {
  if (wsName === 'workspace-main') return 'basil';
  return wsName.replace('workspace-', '');
}

function scanWorkspace(wsPath: string, agentId: string, docs: Document[], maxDepth: number = 3, currentDepth: number = 0) {
  if (currentDepth > maxDepth) return;

  try {
    const entries = fs.readdirSync(wsPath);
    for (const entry of entries) {
      // Skip directories we don't want
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' ||
          entry === 'memory' || entry === '.env' || entry.startsWith('.')) continue;

      const fullPath = path.join(wsPath, entry);
      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanWorkspace(fullPath, agentId, docs, maxDepth, currentDepth + 1);
        } else if (entry.endsWith('.md') && !SYSTEM_FILES.has(entry)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const title = extractTitle(content, entry);
          const preview = content.replace(/^#.*$/gm, '').replace(/\n+/g, ' ').trim().slice(0, 300);

          docs.push({
            id: Buffer.from(fullPath).toString('base64url'),
            title,
            filename: entry,
            path: fullPath,
            agent: agentId,
            category: categorize(fullPath, entry),
            content,
            preview: preview || 'No content preview',
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            createdAt: stat.birthtime?.toISOString() || stat.mtime.toISOString(),
          });
        }
      } catch { /* skip unreadable */ }
    }
  } catch { /* skip unreadable dirs */ }
}

// GET /api/documents — list all documents
router.get('/', (req, res) => {
  try {
    const agentFilter = req.query.agent as string | undefined;
    const categoryFilter = req.query.category as string | undefined;
    const search = (req.query.q as string || '').toLowerCase();
    const docs: Document[] = [];

    // Scan all workspaces
    const wsBase = OPENCLAW_BASE;
    const workspaces = fs.readdirSync(wsBase).filter(d => d.startsWith('workspace-'));

    for (const ws of workspaces) {
      const agentId = wsToAgent(ws);
      if (agentFilter && agentId !== agentFilter) continue;

      scanWorkspace(path.join(wsBase, ws), agentId, docs);
    }

    // Apply filters
    let filtered = docs;
    if (categoryFilter) {
      filtered = filtered.filter(d => d.category === categoryFilter);
    }
    if (search) {
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(search) ||
        d.content.toLowerCase().includes(search) ||
        d.filename.toLowerCase().includes(search)
      );
    }

    // Sort by modified date desc
    filtered.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

    // Strip full content from list response (save bandwidth), keep preview
    const listData = filtered.map(({ content, ...rest }) => rest);

    res.json({ success: true, data: listData });
  } catch (err) {
    console.error('Documents error:', err);
    res.json({ success: true, data: [] });
  }
});

// GET /api/documents/meta/categories — list available categories
// NOTE: Must be defined BEFORE /:id to avoid wildcard match
router.get('/meta/categories', (_req, res) => {
  try {
    const docs: Document[] = [];
    const wsBase = OPENCLAW_BASE;
    const workspaces = fs.readdirSync(wsBase).filter(d => d.startsWith('workspace-'));
    for (const ws of workspaces) {
      scanWorkspace(path.join(wsBase, ws), wsToAgent(ws), docs);
    }

    const categories = [...new Set(docs.map(d => d.category))].sort();
    const agents = [...new Set(docs.map(d => d.agent))].sort();

    res.json({ success: true, data: { categories, agents, totalDocs: docs.length } });
  } catch (err) {
    res.json({ success: true, data: { categories: [], agents: [], totalDocs: 0 } });
  }
});

// GET /api/documents/:id — get full document content
router.get('/:id', (req, res) => {
  try {
    const filePath = Buffer.from(String(req.params.id), 'base64url').toString();

    // Security: only allow paths under /data/.openclaw/workspace-*
    if (!filePath.startsWith(OPENCLAW_BASE + '/workspace-')) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const wsMatch = filePath.match(/workspace-([^/]+)/);
    const agentId = wsMatch ? wsToAgent(`workspace-${wsMatch[1]}`) : 'unknown';

    res.json({
      success: true,
      data: {
        id: req.params.id,
        title: extractTitle(content, filename),
        filename,
        path: filePath,
        agent: agentId,
        category: categorize(filePath, filename),
        content,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      },
    });
  } catch (err) {
    res.status(404).json({ success: false, error: 'Document not found' });
  }
});

export default router;
