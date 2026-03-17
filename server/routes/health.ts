import { Router } from 'express';
import { db, schema } from '../db';

const router = Router();

router.get('/', (_req, res) => {
  const nodes = db.select().from(schema.nodeHealth).all();
  res.json({ success: true, data: nodes });
});

export default router;
