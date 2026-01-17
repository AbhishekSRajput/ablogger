import { query, queryOne, execute } from '../config/database';
import {
  DetectedFailure,
  FailureWithDetails,
  FailureFilters,
  UpdateFailureStatusRequest,
  BulkUpdateFailuresRequest,
} from '../types';
import { AppError } from '../middleware/errorHandler';
import { isValidResolutionStatus } from '../utils/validators';

export class FailureService {
  async list(filters: FailureFilters = {}): Promise<{
    failures: FailureWithDetails[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      client_id,
      url_id,
      test_id,
      error_type,
      resolution_status,
      date_from,
      date_to,
      browser,
      page = 1,
      limit = 50,
    } = filters;

    const conditions: string[] = [];
    const params: any[] = [];

    if (client_id) {
      conditions.push('df.client_id = ?');
      params.push(client_id);
    }

    if (url_id) {
      conditions.push('df.url_id = ?');
      params.push(url_id);
    }

    if (test_id) {
      conditions.push('df.test_id = ?');
      params.push(test_id);
    }

    if (error_type) {
      conditions.push('df.error_type = ?');
      params.push(error_type);
    }

    if (resolution_status) {
      conditions.push('df.resolution_status = ?');
      params.push(resolution_status);
    }

    if (date_from) {
      conditions.push('df.detected_at >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('df.detected_at <= ?');
      params.push(date_to);
    }

    if (browser) {
      conditions.push('df.browser_from_cookie = ?');
      params.push(browser);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM detected_failures df
      ${whereClause}
    `;
    const countResult = await queryOne<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // Get paginated results with details
    const offset = (page - 1) * limit;
    const dataSql = `
      SELECT
        df.*,
        c.client_name,
        u.url,
        bc.browser_name,
        bc.device_type,
        fs.file_path as screenshot_path
      FROM detected_failures df
      INNER JOIN clients c ON df.client_id = c.client_id
      INNER JOIN monitored_urls u ON df.url_id = u.url_id
      INNER JOIN url_checks uc ON df.check_id = uc.check_id
      INNER JOIN browser_configurations bc ON uc.config_id = bc.config_id
      LEFT JOIN failure_screenshots fs ON df.failure_id = fs.failure_id
      ${whereClause}
      ORDER BY df.detected_at DESC
      LIMIT ? OFFSET ?
    `;

    const failures = await query<FailureWithDetails>(dataSql, [...params, limit, offset]);

    return {
      failures,
      total,
      page,
      limit,
    };
  }

  async get(failureId: number): Promise<FailureWithDetails> {
    const sql = `
      SELECT
        df.*,
        c.client_name,
        u.url,
        bc.browser_name,
        bc.device_type,
        fs.file_path as screenshot_path
      FROM detected_failures df
      INNER JOIN clients c ON df.client_id = c.client_id
      INNER JOIN monitored_urls u ON df.url_id = u.url_id
      INNER JOIN url_checks uc ON df.check_id = uc.check_id
      INNER JOIN browser_configurations bc ON uc.config_id = bc.config_id
      LEFT JOIN failure_screenshots fs ON df.failure_id = fs.failure_id
      WHERE df.failure_id = ?
    `;

    const failure = await queryOne<FailureWithDetails>(sql, [failureId]);

    if (!failure) {
      throw new AppError('Failure not found', 404);
    }

    return failure;
  }

  async updateStatus(
    failureId: number,
    data: UpdateFailureStatusRequest,
    adminId: number
  ): Promise<void> {
    // Check if failure exists
    await this.get(failureId);

    const { resolution_status, resolution_notes } = data;

    if (!isValidResolutionStatus(resolution_status)) {
      throw new AppError(
        'Invalid resolution status. Must be one of: new, acknowledged, investigating, resolved, ignored',
        400
      );
    }

    const updates: string[] = ['resolution_status = ?'];
    const values: any[] = [resolution_status];

    if (resolution_notes !== undefined) {
      updates.push('resolution_notes = ?');
      values.push(resolution_notes || null);
    }

    // Set resolved_at and resolved_by if status is 'resolved'
    if (resolution_status === 'resolved') {
      updates.push('resolved_at = NOW()');
      updates.push('resolved_by = ?');
      values.push(adminId);
    } else {
      // Clear resolved fields if status is changed from resolved
      updates.push('resolved_at = NULL');
      updates.push('resolved_by = NULL');
    }

    values.push(failureId);
    const sql = `UPDATE detected_failures SET ${updates.join(', ')} WHERE failure_id = ?`;
    await execute(sql, values);
  }

  async updateNotes(failureId: number, notes: string): Promise<void> {
    // Check if failure exists
    await this.get(failureId);

    await execute('UPDATE detected_failures SET resolution_notes = ? WHERE failure_id = ?', [
      notes || null,
      failureId,
    ]);
  }

  async bulkUpdateStatus(
    data: BulkUpdateFailuresRequest,
    adminId: number
  ): Promise<number> {
    const { failure_ids, resolution_status } = data;

    if (!failure_ids || failure_ids.length === 0) {
      throw new AppError('No failure IDs provided', 400);
    }

    if (!isValidResolutionStatus(resolution_status)) {
      throw new AppError(
        'Invalid resolution status. Must be one of: new, acknowledged, investigating, resolved, ignored',
        400
      );
    }

    const placeholders = failure_ids.map(() => '?').join(',');
    const updates: string[] = ['resolution_status = ?'];
    const values: any[] = [resolution_status];

    // Set resolved_at and resolved_by if status is 'resolved'
    if (resolution_status === 'resolved') {
      updates.push('resolved_at = NOW()');
      updates.push('resolved_by = ?');
      values.push(adminId);
    } else {
      // Clear resolved fields if status is changed from resolved
      updates.push('resolved_at = NULL');
      updates.push('resolved_by = NULL');
    }

    values.push(...failure_ids);

    const sql = `
      UPDATE detected_failures
      SET ${updates.join(', ')}
      WHERE failure_id IN (${placeholders})
    `;

    const affectedRows = await execute(sql, values);
    return affectedRows;
  }

  async getDistinctTestIds(): Promise<string[]> {
    const results = await query<{ test_id: string }>(
      'SELECT DISTINCT test_id FROM detected_failures ORDER BY test_id'
    );
    return results.map((r) => r.test_id);
  }

  async getDistinctErrorTypes(): Promise<string[]> {
    const results = await query<{ error_type: string }>(
      'SELECT DISTINCT error_type FROM detected_failures ORDER BY error_type'
    );
    return results.map((r) => r.error_type);
  }

  async getDistinctBrowsers(): Promise<string[]> {
    const results = await query<{ browser_from_cookie: string }>(
      'SELECT DISTINCT browser_from_cookie FROM detected_failures WHERE browser_from_cookie IS NOT NULL ORDER BY browser_from_cookie'
    );
    return results.map((r) => r.browser_from_cookie);
  }
}

export const failureService = new FailureService();
