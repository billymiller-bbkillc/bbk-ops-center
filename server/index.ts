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
import { startCrmPolling } from './lib/salespipe';
import { startN8nPolling } from './lib/n8n';

const app = express();
const PORT = process.env.OPS_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Run migrations on startup (needed for tasks table)
runMigrations();

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/github-tasks', githubTaskRoutes);

// Health check
app.get('/api/status', (_req, res) => {
  res.json({ status: 'operational', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Start CRM polling (every 30s)
startCrmPolling();

// Start N8N polling (every 30s)
startN8nPolling();

// Poll real metrics and broadcast via SSE (interval defined in sse.ts)
setInterval(pollAndBroadcast, SSE_POLL_INTERVAL);

app.listen(PORT, () => {
  console.log(`⚡ BBK Ops Center API running on http://localhost:${PORT}`);
});
