import { query, queryOne, insert, execute } from '../config/database';
import {
  Client,
  ClientWithStats,
  CreateClientRequest,
  UpdateClientRequest,
} from '../types';
import { AppError } from '../middleware/errorHandler';
import { isValidEmail, sanitizeString } from '../utils/validators';

export class ClientService {
  async list(): Promise<ClientWithStats[]> {
    const sql = `
      SELECT
        c.*,
        COUNT(DISTINCT u.url_id) as url_count,
        COUNT(DISTINCT CASE
          WHEN df.detected_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          THEN df.failure_id
        END) as recent_failure_count
      FROM clients c
      LEFT JOIN monitored_urls u ON c.client_id = u.client_id
      LEFT JOIN detected_failures df ON c.client_id = df.client_id
      GROUP BY c.client_id
      ORDER BY c.client_name ASC
    `;

    return await query<ClientWithStats>(sql);
  }

  async create(data: CreateClientRequest): Promise<number> {
    const { client_name, company_name, email, contact_person, notes } = data;

    // Validate required fields
    if (!client_name || client_name.trim().length === 0) {
      throw new AppError('Client name is required', 400);
    }

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Check for duplicate client name
    const existing = await queryOne<Client>(
      'SELECT client_id FROM clients WHERE client_name = ?',
      [client_name.trim()]
    );

    if (existing) {
      throw new AppError('Client with this name already exists', 409);
    }

    const sql = `
      INSERT INTO clients (client_name, company_name, email, contact_person, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    const clientId = await insert(sql, [
      sanitizeString(client_name),
      company_name ? sanitizeString(company_name) : null,
      email ? sanitizeString(email) : null,
      contact_person ? sanitizeString(contact_person) : null,
      notes || null,
    ]);

    return clientId;
  }

  async get(clientId: number): Promise<Client> {
    const client = await queryOne<Client>(
      'SELECT * FROM clients WHERE client_id = ?',
      [clientId]
    );

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    return client;
  }

  async update(clientId: number, data: UpdateClientRequest): Promise<void> {
    // Check if client exists
    await this.get(clientId);

    // Validate email if provided
    if (data.email && !isValidEmail(data.email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Check for duplicate client name if changing name
    if (data.client_name) {
      const existing = await queryOne<Client>(
        'SELECT client_id FROM clients WHERE client_name = ? AND client_id != ?',
        [data.client_name.trim(), clientId]
      );

      if (existing) {
        throw new AppError('Client with this name already exists', 409);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.client_name !== undefined) {
      updates.push('client_name = ?');
      values.push(sanitizeString(data.client_name));
    }
    if (data.company_name !== undefined) {
      updates.push('company_name = ?');
      values.push(data.company_name ? sanitizeString(data.company_name) : null);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email ? sanitizeString(data.email) : null);
    }
    if (data.contact_person !== undefined) {
      updates.push('contact_person = ?');
      values.push(data.contact_person ? sanitizeString(data.contact_person) : null);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(data.is_active);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes || null);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(clientId);
    const sql = `UPDATE clients SET ${updates.join(', ')} WHERE client_id = ?`;
    await execute(sql, values);
  }

  async delete(clientId: number): Promise<void> {
    // Check if client exists
    await this.get(clientId);

    // Check if client has monitored URLs
    const urls = await query(
      'SELECT url_id FROM monitored_urls WHERE client_id = ?',
      [clientId]
    );

    if (urls.length > 0) {
      throw new AppError(
        'Cannot delete client with monitored URLs. Delete URLs first or deactivate the client.',
        400
      );
    }

    const affectedRows = await execute('DELETE FROM clients WHERE client_id = ?', [
      clientId,
    ]);

    if (affectedRows === 0) {
      throw new AppError('Failed to delete client', 500);
    }
  }

  async toggleStatus(clientId: number): Promise<boolean> {
    // Check if client exists
    const client = await this.get(clientId);

    const newStatus = !client.is_active;
    await execute('UPDATE clients SET is_active = ? WHERE client_id = ?', [
      newStatus,
      clientId,
    ]);

    return newStatus;
  }
}

export const clientService = new ClientService();
