import { Router } from 'express';
import { login, getAllUsers, createUser, updateUser, deleteUser, type UserRole } from '../lib/auth';
import { requireAuth, requireRole } from '../middleware/auth';
import { logActivity } from '../lib/activity';

const router = Router();

// POST /api/auth/login — public
router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username || '');
    const password = String(req.body.password || '');
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const result = await login(username, password);
    if (!result) {
      logActivity({ type: 'system', source: username || 'unknown', title: `Failed login attempt`, severity: 'warning' });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    logActivity({ type: 'system', source: result.user.username, title: `${result.user.displayName} logged in`, severity: 'info' });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// GET /api/auth/me — returns current user from token
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, data: req.user });
});

// GET /api/auth/setup-check — public, checks if any users exist
router.get('/setup-check', (_req, res) => {
  const users = getAllUsers();
  res.json({ success: true, data: { hasUsers: users.length > 0, userCount: users.length } });
});

// ===== Admin-only user management =====

// GET /api/auth/users — list all users
router.get('/users', requireAuth, requireRole('admin'), (_req, res) => {
  const users = getAllUsers();
  res.json({ success: true, data: users });
});

// POST /api/auth/users — create user
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const username = String(req.body.username || '');
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || '');
    const role = req.body.role ? (String(req.body.role) as UserRole) : 'viewer';
    const actorName = String(req.user!.username);

    if (!username || !password || !displayName) {
      return res.status(400).json({ success: false, error: 'username, password, and displayName required' });
    }

    const validRoles: UserRole[] = ['admin', 'operator', 'viewer'];
    if (req.body.role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const user = await createUser(username, password, displayName, role);
    logActivity({ type: 'system', source: actorName, title: `Created user "${displayName}" (${role})`, severity: 'info' });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create user' });
  }
});

// PATCH /api/auth/users/:id — update user
router.patch('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = String(req.params.id);
    const displayName: string | undefined = req.body.displayName ? String(req.body.displayName) : undefined;
    const role: UserRole | undefined = req.body.role ? (String(req.body.role) as UserRole) : undefined;
    const password: string | undefined = req.body.password ? String(req.body.password) : undefined;
    const actorName = String(req.user!.username);

    const user = await updateUser(userId, { displayName, role, password });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    logActivity({ type: 'system', source: actorName, title: `Updated user "${user.displayName}"`, severity: 'info' });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/auth/users/:id — delete user
router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const userId = String(req.params.id);
  const actorName = String(req.user!.username);

  // Prevent deleting yourself
  if (req.user!.userId === userId) {
    return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
  }

  const deleted = deleteUser(userId);
  if (!deleted) return res.status(404).json({ success: false, error: 'User not found' });

  logActivity({ type: 'system', source: actorName, title: `Deleted user ${userId}`, severity: 'warning' });
  res.json({ success: true, data: null });
});

export default router;
