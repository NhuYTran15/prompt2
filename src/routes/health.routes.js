import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/live', (_req, res) => {
  res.json({ status: 'ok', service: 'ecommerce-api', timestamp: new Date().toISOString() });
});

router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    return res.status(503).json({ status: 'not_ready', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

export default router;
