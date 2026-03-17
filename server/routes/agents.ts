import { Router } from 'express';
import { getAgents, getAgent, getAgentSessions } from '../lib/openclaw';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const agents = await getAgents();
    res.json({ success: true, data: agents });
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.json({ success: true, data: [] });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const agent = await getAgent(req.params.id);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    res.json({ success: true, data: agent });
  } catch (err) {
    console.error('Error fetching agent:', err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

router.get('/:id/sessions', (req, res) => {
  try {
    const sessions = getAgentSessions(req.params.id);
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.json({ success: true, data: [] });
  }
});

export default router;
