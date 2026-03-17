import { Router } from 'express';
import { getWorkflows, getExecutions, getN8nSummary } from '../lib/n8n';

const router = Router();

router.get('/workflows', (_req, res) => {
  const workflows = getWorkflows();
  res.json({ success: true, data: workflows });
});

router.get('/executions', (_req, res) => {
  const executions = getExecutions();
  res.json({ success: true, data: executions });
});

router.get('/summary', (_req, res) => {
  const summary = getN8nSummary();
  res.json({ success: true, data: summary });
});

export default router;
