import { Router } from 'express';
import { getEnvVars, setEnvVar, deleteEnvVar } from '../lib/envvars';
import { requireRole } from '../middleware/auth';
import { logActivity } from '../lib/activity';

const router = Router();

// GET /api/envvars — list all (masked by default)
router.get('/', requireRole('admin'), (req, res) => {
  const reveal = req.query.reveal === 'true';
  const vars = getEnvVars(reveal);
  res.json({ success: true, data: vars });
});

// PUT /api/envvars — set/update an env var (admin only)
router.put('/', requireRole('admin'), (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ success: false, error: 'key and value required' });

  const result = setEnvVar(key, value);
  if (result.success) {
    logActivity({
      type: 'system',
      source: String(req.user?.username || 'admin'),
      title: `Updated env var: ${key}`,
      severity: 'info',
    });
  }
  res.json(result);
});

// DELETE /api/envvars/:key — delete an env var (admin only)
router.delete('/:key', requireRole('admin'), (req, res) => {
  const result = deleteEnvVar(String(req.params.key));
  if (result.success) {
    logActivity({
      type: 'system',
      source: req.user?.username || 'admin',
      title: `Deleted env var: ${req.params.key}`,
      severity: 'warning',
    });
  }
  res.json(result);
});

export default router;
