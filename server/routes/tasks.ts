import { Router } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { createIssue, buildLabelsForTask } from '../lib/github';
import type { TaskColumn, TaskPriority } from '../../shared/types';

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

// Migrate local task to GitHub issue
router.post('/:id/migrate-to-github', async (req, res) => {
  try {
    const { id } = req.params;
    const { repo } = req.body;

    if (!repo) {
      return res.status(400).json({ success: false, error: 'repo is required' });
    }

    // Fetch the local task
    const task = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Create GitHub issue
    const labels = buildLabelsForTask(
      (task.column as TaskColumn) || 'backlog',
      (task.priority as TaskPriority) || 'medium'
    );
    const assignees = task.assignee ? [task.assignee.toLowerCase()] : [];

    const ghTask = await createIssue(repo, task.title, task.description || '', assignees, labels);

    // Delete local task
    db.delete(schema.tasks).where(eq(schema.tasks.id, id)).run();

    res.json({ success: true, data: ghTask });
  } catch (err: any) {
    console.error('Failed to migrate task to GitHub:', err);
    res.status(500).json({ success: false, error: err.message || 'Migration failed' });
  }
});

export default router;
