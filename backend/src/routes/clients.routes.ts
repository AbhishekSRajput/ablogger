import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { clientService } from '../services/clientService';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET / - list all clients
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await clientService.getAllClients();
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

// POST / - create client
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientData = req.body;
    const clientId = await clientService.createClient(clientData);
    res.status(201).json({ client_id: clientId, message: 'Client created successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /:id - get client
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const client = await clientService.getClientById(clientId);
    res.json(client);
  } catch (error) {
    next(error);
  }
});

// PUT /:id - update client
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const clientData = req.body;
    await clientService.updateClient(clientId, clientData);
    res.json({ message: 'Client updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - delete client
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    await clientService.deleteClient(clientId);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/status - toggle status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    await clientService.toggleClientStatus(clientId);
    res.json({ message: 'Client status toggled successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
