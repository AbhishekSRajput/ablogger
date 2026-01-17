import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { LoginRequest } from '../types';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credentials: LoginRequest = req.body;
    const result = await authService.login(credentials);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/create-admin (for initial setup only - you may want to remove this in production)
router.post('/create-admin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password } = req.body;
    const adminId = await authService.createAdminUser(username, email, password);
    res.status(201).json({ admin_id: adminId, message: 'Admin user created successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
