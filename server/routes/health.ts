import { Router } from 'express';
import { getNodeHealth } from '../lib/system';
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

export default router;
