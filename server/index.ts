import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate';
import agentRoutes from './routes/agents';
import costRoutes from './routes/costs';
import taskRoutes from './routes/tasks';
import healthRoutes from './routes/health';
import sseRoutes, { pollAndBroadcast, SSE_POLL_INTERVAL } from './routes/sse';
import crmRoutes from './routes/crm';
import n8nRoutes from './routes/n8n';
import githubTaskRoutes from './routes/github-tasks';
import activityRoutes from './routes/activity';
import cronRoutes from './routes/cron';
import skillsRoutes from './routes/skills';
import envvarRoutes from './routes/envvars';
import authRoutes from './routes/auth';
import calendarRoutes from './routes/calendar';
import memoryRoutes from './routes/memory';
import documentRoutes from './routes/documents';
import { requireAuth } from './middleware/auth';
import { seedDefaultAdmin } from './lib/auth';
import { startCrmPolling } from './lib/salespipe';
import { startN8nPolling } from './lib/n8n';
import { getNodeHealth, saveHealthSnapshot, pruneHealthSnapshots } from './lib/system';
import { getAgents } from './lib/openclaw';

const app = express();
const PORT = process.env.OPS_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Run migrations on startup (needed for tasks table)
runMigrations();
seedDefaultAdmin();

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Health check — public
app.get('/api/status', (_req, res) => {
  res.json({ status: 'operational', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Auth middleware — protects everything below
app.use('/api', requireAuth);

// Protected routes
app.use('/api/agents', agentRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/github-tasks', githubTaskRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/envvars', envvarRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/documents', documentRoutes);

// Start CRM polling (every 30s)
startCrmPolling();

// Start N8N polling (every 30s)
startN8nPolling();

// Poll real metrics and broadcast via SSE (interval defined in sse.ts)
setInterval(pollAndBroadcast, SSE_POLL_INTERVAL);

// Save health snapshots every 5 minutes
setInterval(async () => {
  try {
    const agents = await getAgents();
    const health = getNodeHealth(agents.length);
    saveHealthSnapshot(health);
  } catch (err) {
    console.error('Health snapshot error:', err);
  }
}, 5 * 60 * 1000);

// Prune old snapshots daily
setInterval(() => pruneHealthSnapshots(), 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`⚡ BBK Ops Center API running on http://localhost:${PORT}`);
});
