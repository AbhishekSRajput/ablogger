import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { monitoringService } from '../services/monitoringService';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// POST /trigger - manual trigger
router.post('/trigger', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await monitoringService.runMonitoring('manual');
    res.json({ run_id: result, message: 'Monitoring run triggered successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /runs - get run history
router.get('/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const runs = await monitoringService.getRunHistory(limit);
    res.json(runs);
  } catch (error) {
    next(error);
  }
});

// GET /runs/:id - get run detail
router.get('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = parseInt(req.params.id, 10);
    const run = await monitoringService.getRunById(runId);
    res.json(run);
  } catch (error) {
    next(error);
  }
});

// GET /runs/:id/checks - get run checks
router.get('/runs/:id/checks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = parseInt(req.params.id, 10);
    const checks = await monitoringService.getRunChecks(runId);
    res.json(checks);
  } catch (error) {
    next(error);
  }
});

export default router;
