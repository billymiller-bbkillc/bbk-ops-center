import { Router } from 'express';
import { getCrmHealth } from '../lib/salespipe';
import {
  getQuickStats,
  getTenantOverview,
  getUsersByTenant,
  getLoginEvents,
  getLoginStats,
  getFunnelData,
  getInactiveTenants,
} from '../lib/crm-db';

const router = Router();

// Keep REST health check (checks if CRM app is running)
router.get('/health', (_req, res) => {
  const health = getCrmHealth();
  res.json({ success: true, data: health });
});

// Quick stats (tenant count, user count, active tenants)
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getQuickStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('CRM stats error:', err);
    res.json({ success: false, error: 'Failed to fetch quick stats' });
  }
});

// Tenant directory with user counts
router.get('/tenants', async (_req, res) => {
  try {
    const tenants = await getTenantOverview();
    res.json({ success: true, data: tenants });
  } catch (err) {
    console.error('CRM tenants error:', err);
    res.json({ success: false, error: 'Failed to fetch tenants' });
  }
});

// All users with org info and login data
router.get('/users', async (_req, res) => {
  try {
    const orgId = _req.query.orgId as string | undefined;
    const users = await getUsersByTenant(orgId);
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('CRM users error:', err);
    res.json({ success: false, error: 'Failed to fetch users' });
  }
});

// Login event history
router.get('/logins', async (_req, res) => {
  try {
    const events = await getLoginEvents({
      orgId: _req.query.orgId as string | undefined,
      userId: _req.query.userId as string | undefined,
      eventType: _req.query.eventType as string | undefined,
      limit: _req.query.limit ? parseInt(String(_req.query.limit)) : undefined,
    });
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('CRM logins error:', err);
    res.json({ success: false, error: 'Failed to fetch login events' });
  }
});

// Login aggregate stats
router.get('/logins/stats', async (_req, res) => {
  try {
    const stats = await getLoginStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('CRM login stats error:', err);
    res.json({ success: false, error: 'Failed to fetch login stats' });
  }
});

router.get('/funnel', async (_req, res) => {
  try {
    const funnel = await getFunnelData();
    res.json({ success: true, data: funnel });
  } catch (err) {
    console.error('CRM funnel error:', err);
    res.json({ success: false, error: 'Failed to fetch funnel data' });
  }
});

router.get('/inactive', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(String(req.query.days)) : 14;
    const tenants = await getInactiveTenants(days);
    res.json({ success: true, data: tenants });
  } catch (err) {
    console.error('CRM inactive tenants error:', err);
    res.json({ success: false, error: 'Failed to fetch inactive tenants' });
  }
});

export default router;
