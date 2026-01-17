import { query, queryOne, insert, execute } from '../config/database';
import { MonitoredUrl, CreateUrlRequest, UpdateUrlRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { isValidUrl, sanitizeString, isPositiveInteger } from '../utils/validators';

export class UrlService {
  async list(clientId?: number): Promise<MonitoredUrl[]> {
    let sql = `
      SELECT * FROM monitored_urls
    `;
    const params: any[] = [];

    if (clientId) {
      sql += ' WHERE client_id = ?';
      params.push(clientId);
    }

    sql += ' ORDER BY created_at DESC';

    return await query<MonitoredUrl>(sql, params);
  }

  async create(data: CreateUrlRequest): Promise<number> {
    const { client_id, url, url_label, is_active, has_active_test, notes } = data;

    // Validate required fields
    if (!isPositiveInteger(client_id)) {
      throw new AppError('Valid client ID is required', 400);
    }

    if (!url || url.trim().length === 0) {
      throw new AppError('URL is required', 400);
    }

    if (!isValidUrl(url)) {
      throw new AppError('Invalid URL format', 400);
    }

    // Check if client exists
    const clientExists = await queryOne(
      'SELECT client_id FROM clients WHERE client_id = ?',
      [client_id]
    );

    if (!clientExists) {
      throw new AppError('Client not found', 404);
    }

    // Check for duplicate URL for this client
    const existing = await queryOne<MonitoredUrl>(
      'SELECT url_id FROM monitored_urls WHERE client_id = ? AND url = ?',
      [client_id, url.trim()]
    );

    if (existing) {
      throw new AppError('This URL is already monitored for this client', 409);
    }

    const sql = `
      INSERT INTO monitored_urls
      (client_id, url, url_label, is_active, has_active_test, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const urlId = await insert(sql, [
      client_id,
      sanitizeString(url, 500),
      url_label ? sanitizeString(url_label) : null,
      is_active !== undefined ? is_active : true,
      has_active_test !== undefined ? has_active_test : true,
      notes || null,
    ]);

    return urlId;
  }

  async get(urlId: number): Promise<MonitoredUrl> {
    const url = await queryOne<MonitoredUrl>(
      'SELECT * FROM monitored_urls WHERE url_id = ?',
      [urlId]
    );

    if (!url) {
      throw new AppError('Monitored URL not found', 404);
    }

    return url;
  }

  async update(urlId: number, data: UpdateUrlRequest): Promise<void> {
    // Check if URL exists
    await this.get(urlId);

    // Validate URL if provided
    if (data.url && !isValidUrl(data.url)) {
      throw new AppError('Invalid URL format', 400);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.url !== undefined) {
      updates.push('url = ?');
      values.push(sanitizeString(data.url, 500));
    }
    if (data.url_label !== undefined) {
      updates.push('url_label = ?');
      values.push(data.url_label ? sanitizeString(data.url_label) : null);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(data.is_active);
    }
    if (data.has_active_test !== undefined) {
      updates.push('has_active_test = ?');
      values.push(data.has_active_test);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes || null);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(urlId);
    const sql = `UPDATE monitored_urls SET ${updates.join(', ')} WHERE url_id = ?`;
    await execute(sql, values);
  }

  async delete(urlId: number): Promise<void> {
    // Check if URL exists
    await this.get(urlId);

    const affectedRows = await execute('DELETE FROM monitored_urls WHERE url_id = ?', [
      urlId,
    ]);

    if (affectedRows === 0) {
      throw new AppError('Failed to delete URL', 500);
    }
  }

  async toggleActive(urlId: number): Promise<boolean> {
    // Check if URL exists
    const url = await this.get(urlId);

    const newStatus = !url.is_active;
    await execute('UPDATE monitored_urls SET is_active = ? WHERE url_id = ?', [
      newStatus,
      urlId,
    ]);

    return newStatus;
  }

  async toggleHasActiveTest(urlId: number): Promise<boolean> {
    // Check if URL exists
    const url = await this.get(urlId);

    const newStatus = !url.has_active_test;
    await execute('UPDATE monitored_urls SET has_active_test = ? WHERE url_id = ?', [
      newStatus,
      urlId,
    ]);

    return newStatus;
  }
}

export const urlService = new UrlService();
