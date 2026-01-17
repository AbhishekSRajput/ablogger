import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { urlService } from '../services/urlService';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET / - list URLs (optional ?client_id filter)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.query.client_id ? parseInt(req.query.client_id as string, 10) : undefined;
    const urls = await urlService.list(clientId);
    res.json(urls);
  } catch (error) {
    next(error);
  }
});

// POST / - create URL
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const urlData = req.body;
    const urlId = await urlService.create(urlData);
    res.status(201).json({ url_id: urlId, message: 'URL created successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /:id - get URL
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const urlId = parseInt(req.params.id, 10);
    const url = await urlService.get(urlId);
    res.json(url);
  } catch (error) {
    next(error);
  }
});

// PUT /:id - update URL
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const urlId = parseInt(req.params.id, 10);
    const urlData = req.body;
    await urlService.update(urlId, urlData);
    res.json({ message: 'URL updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - delete URL
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const urlId = parseInt(req.params.id, 10);
    await urlService.delete(urlId);
    res.json({ message: 'URL deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/active - toggle active
router.patch('/:id/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const urlId = parseInt(req.params.id, 10);
    await urlService.toggleActive(urlId);
    res.json({ message: 'URL active status toggled successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/has-test - toggle has_active_test
router.patch('/:id/has-test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const urlId = parseInt(req.params.id, 10);
    await urlService.toggleHasActiveTest(urlId);
    res.json({ message: 'URL has_active_test status toggled successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
