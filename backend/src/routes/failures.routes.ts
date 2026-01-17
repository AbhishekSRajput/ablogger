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
      status: req.query.status as string | undefined,
      test_id: req.query.test_id as string | undefined,
      error_type: req.query.error_type as string | undefined,
      browser: req.query.browser as string | undefined,
      client_id: req.query.client_id ? parseInt(req.query.client_id as string, 10) : undefined,
      url_id: req.query.url_id ? parseInt(req.query.url_id as string, 10) : undefined,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
    };
    const failures = await failureService.getFailures(filters);
    res.json(failures);
  } catch (error) {
    next(error);
  }
});

// GET /filters/test-ids - get distinct test IDs
router.get('/filters/test-ids', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testIds = await failureService.getDistinctTestIds();
    res.json(testIds);
  } catch (error) {
    next(error);
  }
});

// GET /filters/error-types - get distinct error types
router.get('/filters/error-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errorTypes = await failureService.getDistinctErrorTypes();
    res.json(errorTypes);
  } catch (error) {
    next(error);
  }
});

// GET /filters/browsers - get distinct browsers
router.get('/filters/browsers', async (req: Request, res: Response, next: NextFunction) => {
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
    const failure = await failureService.getFailureById(failureId);
    res.json(failure);
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/status - update status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const failureId = parseInt(req.params.id, 10);
    const { status } = req.body;
    await failureService.updateFailureStatus(failureId, status);
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
    await failureService.updateFailureNotes(failureId, notes);
    res.json({ message: 'Failure notes updated successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /bulk-status - bulk update status
router.post('/bulk-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { failure_ids, status } = req.body;
    await failureService.bulkUpdateStatus(failure_ids, status);
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
