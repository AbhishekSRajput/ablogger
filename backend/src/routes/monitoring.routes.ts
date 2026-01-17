import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { monitoringService } from '../services/monitoringService';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// POST /trigger - manual trigger
router.post('/trigger', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if there's already a running monitoring job
    const runningRun = await monitoringService.getRunningRun();
    if (runningRun) {
      res.status(409).json({
        error: 'A monitoring run is already in progress',
        runId: runningRun.run_id,
        startedAt: runningRun.started_at,
      });
      return;
    }

    // Start the monitoring run (don't await - let it run in background)
    const runId = await monitoringService.runMonitoring('manual');

    logger.info(`Manual monitoring run triggered: ${runId}`);

    res.status(202).json({
      run_id: runId,
      message: 'Monitoring run triggered successfully',
      status: 'running',
    });
  } catch (error) {
    logger.error('Failed to trigger monitoring run:', error);
    next(error);
  }
});

// GET /runs - get run history
router.get('/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    // Validate limit parameter
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      res.status(400).json({
        error: 'Invalid limit parameter. Must be between 1 and 1000.',
      });
      return;
    }

    const runs = await monitoringService.getRunHistory(limit);
    res.json(runs);
  } catch (error) {
    logger.error('Failed to fetch monitoring runs:', error);
    next(error);
  }
});

// GET /progress - get live progress of running monitoring
router.get('/progress', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const runningRun = await monitoringService.getRunningRun();

    if (!runningRun) {
      res.json({
        running: false,
        progress: null,
      });
      return;
    }

    // Calculate percentage safely (avoid division by zero)
    const totalExpected = runningRun.total_checks_expected || 0;
    const totalChecked = runningRun.total_urls_checked || 0;
    const percentage = totalExpected > 0
      ? Math.min(100, Math.round((totalChecked / totalExpected) * 100))
      : 0;

    res.json({
      running: true,
      progress: {
        runId: runningRun.run_id,
        totalChecked: totalChecked,
        totalExpected: totalExpected,
        percentage: percentage,
        currentUrl: runningRun.current_url,
        currentBrowser: runningRun.current_browser,
        startedAt: runningRun.started_at,
        errorsFound: runningRun.total_errors_found || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch monitoring progress:', error);
    next(error);
  }
});

// GET /runs/:id - get run detail
router.get('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = parseInt(req.params.id, 10);

    // Validate runId
    if (isNaN(runId) || runId < 1) {
      res.status(400).json({
        error: 'Invalid run ID. Must be a positive integer.',
      });
      return;
    }

    const run = await monitoringService.getRunById(runId);

    if (!run) {
      res.status(404).json({
        error: `Monitoring run with ID ${runId} not found`,
      });
      return;
    }

    res.json(run);
  } catch (error) {
    logger.error(`Failed to fetch monitoring run ${req.params.id}:`, error);
    next(error);
  }
});

// GET /runs/:id/checks - get run checks
router.get('/runs/:id/checks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = parseInt(req.params.id, 10);

    // Validate runId
    if (isNaN(runId) || runId < 1) {
      res.status(400).json({
        error: 'Invalid run ID. Must be a positive integer.',
      });
      return;
    }

    // Verify the run exists
    const run = await monitoringService.getRunById(runId);
    if (!run) {
      res.status(404).json({
        error: `Monitoring run with ID ${runId} not found`,
      });
      return;
    }

    const checks = await monitoringService.getRunChecks(runId);
    res.json(checks);
  } catch (error) {
    logger.error(`Failed to fetch checks for run ${req.params.id}:`, error);
    next(error);
  }
});

export default router;
