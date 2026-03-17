import { Router } from 'express';
import { getCrmHealth } from '../lib/salespipe';
import {
  getGlobalStats,
  getOrganizations,
  getRecentActivity,
  getLeadsByStatus,
  getDealsByStage,
} from '../lib/crm-db';

const router = Router();

// Keep REST health check (checks if CRM app is running)
router.get('/health', (_req, res) => {
  const health = getCrmHealth();
  res.json({ success: true, data: health });
});

// Global stats from DB (cross-tenant)
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('CRM stats error:', err);
    res.json({ success: false, error: 'Failed to fetch global stats' });
  }
});

// All organizations with their stats
router.get('/organizations', async (_req, res) => {
  try {
    const orgs = await getOrganizations();
    res.json({ success: true, data: orgs });
  } catch (err) {
    console.error('CRM organizations error:', err);
    res.json({ success: false, error: 'Failed to fetch organizations' });
  }
});

// Recent activity feed across all tenants
router.get('/activity', async (_req, res) => {
  try {
    const limit = parseInt(String(_req.query.limit)) || 20;
    const activity = await getRecentActivity(limit);
    res.json({ success: true, data: activity });
  } catch (err) {
    console.error('CRM activity error:', err);
    res.json({ success: false, error: 'Failed to fetch activity' });
  }
});

// Lead status breakdown
router.get('/leads/by-status', async (_req, res) => {
  try {
    const breakdown = await getLeadsByStatus();
    res.json({ success: true, data: breakdown });
  } catch (err) {
    console.error('CRM leads breakdown error:', err);
    res.json({ success: false, error: 'Failed to fetch leads breakdown' });
  }
});

// Deal stage breakdown
router.get('/deals/by-stage', async (_req, res) => {
  try {
    const breakdown = await getDealsByStage();
    res.json({ success: true, data: breakdown });
  } catch (err) {
    console.error('CRM deals breakdown error:', err);
    res.json({ success: false, error: 'Failed to fetch deals breakdown' });
  }
});

export default router;
