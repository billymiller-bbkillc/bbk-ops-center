import { Router } from 'express';
import { getActivity, getRecentActivity } from '../lib/activity';

const router = Router();

router.get('/', (req, res) => {
  try {
    const filters = {
      type: req.query.type as string | undefined,
      source: req.query.source as string | undefined,
      severity: req.query.severity as string | undefined,
      businessUnit: req.query.businessUnit as string | undefined,
      since: req.query.since as string | undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined,
    };
    const activity = getActivity(filters);
    res.json({ success: true, data: activity });
  } catch (err) {
    console.error('Error fetching activity:', err);
    res.json({ success: true, data: [] });
  }
});

router.get('/recent', (req, res) => {
  try {
    const count = req.query.count ? parseInt(String(req.query.count)) : 10;
    const activity = getRecentActivity(count);
    res.json({ success: true, data: activity });
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.json({ success: true, data: [] });
  }
});

export default router;
