import { Router } from 'express';
import { getInstalledSkills, searchSkills, installSkill } from '../lib/skills';
import { requireRole } from '../middleware/auth';
import { logActivity } from '../lib/activity';

const router = Router();

// GET /api/skills — list installed skills
router.get('/', (_req, res) => {
  const skills = getInstalledSkills();
  res.json({ success: true, data: skills });
});

// GET /api/skills/search?q=query — search ClawHub
router.get('/search', (req, res) => {
  const result = searchSkills(req.query.q as string | undefined);
  res.json({ success: true, data: result });
});

// POST /api/skills/install — install a skill (admin only)
router.post('/install', requireRole('admin'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });

  const result = installSkill(name);
  if (result.success) {
    logActivity({
      type: 'system',
      source: req.user?.username || 'admin',
      title: `Installed skill: ${name}`,
      severity: 'info',
    });
  }
  res.json(result);
});

export default router;
