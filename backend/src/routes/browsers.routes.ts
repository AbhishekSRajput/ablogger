import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { browserService } from '../services/browserService';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET / - list browsers
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const browsers = await browserService.list();
    res.json(browsers);
  } catch (error) {
    next(error);
  }
});

// POST / - create browser
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const browserData = req.body;
    const browserId = await browserService.create(browserData);
    res.status(201).json({ browser_id: browserId, message: 'Browser created successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /:id - get browser
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const browserId = parseInt(req.params.id, 10);
    const browser = await browserService.get(browserId);
    res.json(browser);
  } catch (error) {
    next(error);
  }
});

// PUT /:id - update browser
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const browserId = parseInt(req.params.id, 10);
    const browserData = req.body;
    await browserService.update(browserId, browserData);
    res.json({ message: 'Browser updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - delete browser
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const browserId = parseInt(req.params.id, 10);
    await browserService.delete(browserId);
    res.json({ message: 'Browser deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/active - toggle active
router.patch('/:id/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const browserId = parseInt(req.params.id, 10);
    await browserService.toggleActive(browserId);
    res.json({ message: 'Browser active status toggled successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
