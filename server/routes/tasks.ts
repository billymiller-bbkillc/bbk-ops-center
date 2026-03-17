import { Router } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', (_req, res) => {
  const tasks = db.select().from(schema.tasks).all();
  res.json({ success: true, data: tasks });
});

router.post('/', (req, res) => {
  const { title, description, priority, column, assignee, businessUnit, dueDate } = req.body;
  const now = new Date().toISOString();
  const task = {
    id: randomUUID(),
    title,
    description: description || '',
    priority: priority || 'medium',
    column: column || 'backlog',
    assignee: assignee || null,
    businessUnit: businessUnit || 'BBK Holdings',
    dueDate: dueDate || null,
    createdAt: now,
    updatedAt: now,
    order: 0,
  };
  db.insert(schema.tasks).values(task).run();
  res.json({ success: true, data: task });
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body, updatedAt: new Date().toISOString() };
  db.update(schema.tasks).set(updates).where(eq(schema.tasks.id, id)).run();
  const task = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  res.json({ success: true, data: task });
});

router.delete('/:id', (req, res) => {
  db.delete(schema.tasks).where(eq(schema.tasks.id, req.params.id)).run();
  res.json({ success: true, data: null });
});

// Move task (drag-and-drop)
router.patch('/:id/move', (req, res) => {
  const { column, order } = req.body;
  db.update(schema.tasks).set({ column, order, updatedAt: new Date().toISOString() })
    .where(eq(schema.tasks.id, req.params.id)).run();
  const task = db.select().from(schema.tasks).where(eq(schema.tasks.id, req.params.id)).get();
  res.json({ success: true, data: task });
});

export default router;
