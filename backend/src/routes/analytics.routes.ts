import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { analyticsService } from '../services/analyticsService';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /overview - overview stats
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await analyticsService.getOverviewStats();
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

// GET /trends - failure trends (optional ?days query param)
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
    const trends = await analyticsService.getFailureTrends(days);
    res.json(trends);
  } catch (error) {
    next(error);
  }
});

// GET /by-browser - failures by browser
router.get('/by-browser', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getFailuresByBrowser();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /by-client - failures by client
router.get('/by-client', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getFailuresByClient();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /by-error-type - failures by error type
router.get('/by-error-type', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getFailuresByErrorType();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /by-test-id - failures by test ID
router.get('/by-test-id', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getFailuresByTestId();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /top-errors - top error messages
router.get('/top-errors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const data = await analyticsService.getTopErrors(limit);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /client/:id - client stats
router.get('/client/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const stats = await analyticsService.getClientStats(clientId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /url/:id - URL stats
router.get('/url/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const urlId = parseInt(req.params.id, 10);
    const stats = await analyticsService.getUrlStats(urlId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
