import { Router } from 'express';
import { getCronJobs, getCronJob, addCronJob, toggleCronJob, deleteCronJob, runCronJob, getCronRuns } from '../lib/cron';
import { requireRole } from '../middleware/auth';
import { logActivity } from '../lib/activity';

const router = Router();

// GET /api/cron — list all cron jobs
router.get('/', (_req, res) => {
  const jobs = getCronJobs();
  res.json({ success: true, data: jobs });
});

// GET /api/cron/:id — get single job with run history
router.get('/:id', (req, res) => {
  const job = getCronJob(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
  const runs = getCronRuns(req.params.id);
  res.json({ success: true, data: { ...job, runs } });
});

// POST /api/cron — create a new cron job (admin/operator only)
router.post('/', requireRole('admin', 'operator'), (req, res) => {
  const result = addCronJob(req.body);
  if (result.success) {
    logActivity({
      type: 'system',
      source: String(req.user?.username || 'admin'),
      title: `Created cron job: ${req.body.name}`,
      severity: 'info',
    });
  }
  res.json(result);
});

// POST /api/cron/:id/toggle — enable/disable (admin/operator only)
router.post('/:id/toggle', requireRole('admin', 'operator'), (req, res) => {
  const { enabled } = req.body;
  const result = toggleCronJob(String(req.params.id), !!enabled);
  if (result.success) {
    logActivity({
      type: 'system',
      source: String(req.user?.username || 'admin'),
      title: `${enabled ? 'Enabled' : 'Disabled'} cron job: ${req.params.id}`,
      severity: 'info',
    });
  }
  res.json(result);
});

// POST /api/cron/:id/run — run immediately (admin/operator only)
router.post('/:id/run', requireRole('admin', 'operator'), (req, res) => {
  const result = runCronJob(String(req.params.id));
  if (result.success) {
    logActivity({
      type: 'system',
      source: String(req.user?.username || 'admin'),
      title: `Manually triggered cron job: ${req.params.id}`,
      severity: 'info',
    });
  }
  res.json(result);
});

// DELETE /api/cron/:id — delete (admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  const result = deleteCronJob(String(req.params.id));
  if (result.success) {
    logActivity({
      type: 'system',
      source: String(req.user?.username || 'admin'),
      title: `Deleted cron job: ${req.params.id}`,
      severity: 'warning',
    });
  }
  res.json(result);
});

export default router;
