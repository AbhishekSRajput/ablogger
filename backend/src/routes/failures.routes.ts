import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { failureService } from '../services/failureService';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET / - list failures (with query filters)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      resolution_status: req.query.status as string | undefined,
      test_id: req.query.test_id as string | undefined,
      error_type: req.query.error_type as string | undefined,
      browser: req.query.browser as string | undefined,
      client_id: req.query.client_id ? parseInt(req.query.client_id as string, 10) : undefined,
      url_id: req.query.url_id ? parseInt(req.query.url_id as string, 10) : undefined,
      date_from: req.query.start_date as string | undefined,
      date_to: req.query.end_date as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };
    const failures = await failureService.list(filters);
    res.json(failures);
  } catch (error) {
    next(error);
  }
});

// GET /filters/test-ids - get distinct test IDs
router.get('/filters/test-ids', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const testIds = await failureService.getDistinctTestIds();
    res.json(testIds);
  } catch (error) {
    next(error);
  }
});

// GET /filters/error-types - get distinct error types
router.get('/filters/error-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const errorTypes = await failureService.getDistinctErrorTypes();
    res.json(errorTypes);
  } catch (error) {
    next(error);
  }
});

// GET /filters/browsers - get distinct browsers
router.get('/filters/browsers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const browsers = await failureService.getDistinctBrowsers();
    res.json(browsers);
  } catch (error) {
    next(error);
  }
});

// GET /:id - get failure detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const failureId = parseInt(req.params.id, 10);
    const failure = await failureService.get(failureId);
    res.json(failure);
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/status - update status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const failureId = parseInt(req.params.id, 10);
    const { resolution_status, resolution_notes } = req.body;
    const adminId = req.user?.admin_id || 0;
    await failureService.updateStatus(failureId, { resolution_status, resolution_notes }, adminId);
    res.json({ message: 'Failure status updated successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/notes - update notes
router.patch('/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const failureId = parseInt(req.params.id, 10);
    const { notes } = req.body;
    await failureService.updateNotes(failureId, notes);
    res.json({ message: 'Failure notes updated successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /bulk-status - bulk update status
router.post('/bulk-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { failure_ids, resolution_status } = req.body;
    const adminId = req.user?.admin_id || 0;
    await failureService.bulkUpdateStatus({ failure_ids, resolution_status }, adminId);
    res.json({ message: 'Failure statuses updated successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /:id/screenshot - serve screenshot file
router.get('/:id/screenshot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const failureId = parseInt(req.params.id, 10);
    const screenshotPath = await failureService.getScreenshotPath(failureId);
    res.sendFile(screenshotPath);
  } catch (error) {
    next(error);
  }
});

export default router;
