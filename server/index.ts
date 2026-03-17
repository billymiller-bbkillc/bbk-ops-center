import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate';
import agentRoutes from './routes/agents';
import costRoutes from './routes/costs';
import taskRoutes from './routes/tasks';
import healthRoutes from './routes/health';
import sseRoutes, { pollAndBroadcast } from './routes/sse';
import crmRoutes from './routes/crm';
import { startCrmPolling } from './lib/salespipe';

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

// Health check
app.get('/api/status', (_req, res) => {
  res.json({ status: 'operational', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Start CRM polling (every 30s)
startCrmPolling();

// Poll real metrics every 5 seconds and broadcast via SSE
setInterval(pollAndBroadcast, 5000);

app.listen(PORT, () => {
  console.log(`⚡ BBK Ops Center API running on http://localhost:${PORT}`);
});
