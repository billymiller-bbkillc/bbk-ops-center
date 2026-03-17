import { Router } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', (_req, res) => {
  const agents = db.select().from(schema.agents).all();
  res.json({ success: true, data: agents });
});

router.get('/:id', (req, res) => {
  const agent = db.select().from(schema.agents).where(eq(schema.agents.id, req.params.id)).get();
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
});

router.get('/:id/sessions', (req, res) => {
  const sessions = db.select().from(schema.agentSessions)
    .where(eq(schema.agentSessions.agentId, req.params.id))
    .all();
  res.json({ success: true, data: sessions });
});

export default router;
