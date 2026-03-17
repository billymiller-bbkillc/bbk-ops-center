import { Router } from 'express';
import { getCrmHealth, getCrmStats, getPipelineData } from '../lib/salespipe';

const router = Router();

router.get('/health', (_req, res) => {
  const health = getCrmHealth();
  res.json({ success: true, data: health });
});

router.get('/stats', (_req, res) => {
  const stats = getCrmStats();
  res.json({ success: true, data: stats });
});

router.get('/pipelines', (_req, res) => {
  const pipelines = getPipelineData();
  res.json({ success: true, data: pipelines });
});

export default router;
