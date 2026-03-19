import { Router } from 'express';
import {
  getRepos,
  getIssues,
  createIssue,
  updateIssue,
  closeIssue,
  moveIssueToColumn,
  buildLabelsForTask,
} from '../lib/github';
import { broadcast } from './sse';
import { notifyAgentTask } from '../lib/openclaw';
import type { GitHubTaskStatus, TaskColumn, TaskPriority } from '../../shared/types';

const router = Router();

/** Fetch all issues and broadcast to SSE clients */
async function broadcastTasks() {
  try {
    const tasks = await getIssues();
    broadcast('github-task-update', tasks);
  } catch {
    // Best-effort; don't fail the response
  }
}

// GET /api/github-tasks — all issues across all repos
router.get('/', async (_req, res) => {
  try {
    const tasks = await getIssues();
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    console.error('Failed to fetch GitHub issues:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch GitHub issues' });
  }
});

// GET /api/github-tasks/repos — list available repos
router.get('/repos', async (_req, res) => {
  try {
    const repos = await getRepos();
    res.json({ success: true, data: repos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/github-tasks/:repo — issues for a specific repo
router.get('/:repo', async (req, res) => {
  try {
    const tasks = await getIssues(req.params.repo);
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    console.error(`Failed to fetch issues for ${req.params.repo}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/github-tasks — create a new issue
router.post('/', async (req, res) => {
  try {
    const { repo, title, description, assignee, priority, column, subStatus } = req.body;

    if (!repo || !title) {
      return res.status(400).json({ success: false, error: 'repo and title are required' });
    }

    const labels = buildLabelsForTask(
      (column as TaskColumn) || 'backlog',
      (priority as TaskPriority) || 'medium',
      (subStatus as GitHubTaskStatus) || undefined
    );
    const assignees = assignee ? [assignee.toLowerCase()] : [];

    const task = await createIssue(repo, title, description || '', assignees, labels);
    res.json({ success: true, data: task });

    // Push update to all SSE clients
    broadcastTasks();

    // Notify assigned agent
    try { notifyAgentTask(task, 'created'); } catch (e) { /* non-blocking */ }
  } catch (err: any) {
    console.error('Failed to create GitHub issue:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/github-tasks/:repo/:issueNumber — update an issue
router.patch('/:repo/:issueNumber', async (req, res) => {
  try {
    const { repo, issueNumber } = req.params;
    const { title, description, assignee, assignees, labels, state } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.body = description;
    if (state !== undefined) updates.state = state;
    if (assignees !== undefined) updates.assignees = assignees;
    else if (assignee !== undefined) updates.assignees = assignee ? [assignee.toLowerCase()] : [];
    if (labels !== undefined) updates.labels = labels;

    const task = await updateIssue(repo, parseInt(issueNumber), updates);
    res.json({ success: true, data: task });

    // Push update to all SSE clients
    broadcastTasks();

    // Notify agent if assignee or state changed
    const hasAssigneeLabelChange = updates.labels?.some((l: string) => l.startsWith('assignee:'));
    if (updates.assignees || updates.state || hasAssigneeLabelChange) {
      try { notifyAgentTask(task, 'updated'); } catch (e) { /* non-blocking */ }
    }
  } catch (err: any) {
    console.error('Failed to update GitHub issue:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/github-tasks/:repo/:issueNumber/move — move to column
router.patch('/:repo/:issueNumber/move', async (req, res) => {
  try {
    const { repo, issueNumber } = req.params;
    const { column } = req.body;

    if (!column) {
      return res.status(400).json({ success: false, error: 'column is required' });
    }

    const task = await moveIssueToColumn(repo, parseInt(issueNumber), column as TaskColumn);
    res.json({ success: true, data: task });

    // Push update to all SSE clients
    broadcastTasks();

    // Notify assigned agent of column change
    try { notifyAgentTask(task, 'moved'); } catch (e) { /* non-blocking */ }
  } catch (err: any) {
    console.error('Failed to move GitHub issue:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/github-tasks/:repo/:issueNumber — close the issue
router.delete('/:repo/:issueNumber', async (req, res) => {
  try {
    const { repo, issueNumber } = req.params;
    const task = await closeIssue(repo, parseInt(issueNumber));
    res.json({ success: true, data: task });

    // Push update to all SSE clients
    broadcastTasks();

    // Notify assigned agent of closure
    try { notifyAgentTask(task, 'closed'); } catch (e) { /* non-blocking */ }
  } catch (err: any) {
    console.error('Failed to close GitHub issue:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
