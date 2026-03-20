import { Router } from 'express';
import { getNodeHealth, getHealthHistory } from '../lib/system';
import { getAgents } from '../lib/openclaw';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const agents = await getAgents();
    const health = getNodeHealth(agents.length);
    res.json({ success: true, data: [health] });
  } catch (err) {
    console.error('Error fetching health:', err);
    res.json({ success: true, data: [] });
  }
});

router.get('/history', (req, res) => {
  try {
    const nodeId = (req.query.nodeId as string) || 'vps-main';
    const hours = req.query.hours ? parseInt(String(req.query.hours)) : 24;
    const history = getHealthHistory(nodeId, hours);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('Error fetching health history:', err);
    res.json({ success: true, data: [] });
  }
});

export default router;
