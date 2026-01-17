import { query, queryOne, insert, execute } from '../config/database';
import {
  BrowserConfiguration,
  CreateBrowserConfigRequest,
  UpdateBrowserConfigRequest,
} from '../types';
import { AppError } from '../middleware/errorHandler';
import { isValidDeviceType, sanitizeString } from '../utils/validators';

export class BrowserService {
  async list(): Promise<BrowserConfiguration[]> {
    const sql = `
      SELECT * FROM browser_configurations
      ORDER BY device_type ASC, browser_name ASC
    `;

    return await query<BrowserConfiguration>(sql);
  }

  async create(data: CreateBrowserConfigRequest): Promise<number> {
    const {
      browser_name,
      browser_version,
      device_type,
      operating_system,
      viewport_width,
      viewport_height,
      user_agent,
      is_active,
    } = data;

    // Validate required fields
    if (!browser_name || browser_name.trim().length === 0) {
      throw new AppError('Browser name is required', 400);
    }

    if (!device_type || !isValidDeviceType(device_type)) {
      throw new AppError(
        'Valid device type is required (desktop, mobile, or tablet)',
        400
      );
    }

    // Validate viewport dimensions if provided
    if (viewport_width !== undefined && viewport_width !== null) {
      if (viewport_width < 1 || viewport_width > 10000) {
        throw new AppError('Viewport width must be between 1 and 10000', 400);
      }
    }

    if (viewport_height !== undefined && viewport_height !== null) {
      if (viewport_height < 1 || viewport_height > 10000) {
        throw new AppError('Viewport height must be between 1 and 10000', 400);
      }
    }

    const sql = `
      INSERT INTO browser_configurations
      (browser_name, browser_version, device_type, operating_system,
       viewport_width, viewport_height, user_agent, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const configId = await insert(sql, [
      sanitizeString(browser_name, 100),
      browser_version ? sanitizeString(browser_version, 50) : null,
      device_type,
      operating_system ? sanitizeString(operating_system, 100) : null,
      viewport_width || null,
      viewport_height || null,
      user_agent || null,
      is_active !== undefined ? is_active : true,
    ]);

    return configId;
  }

  async get(configId: number): Promise<BrowserConfiguration> {
    const config = await queryOne<BrowserConfiguration>(
      'SELECT * FROM browser_configurations WHERE config_id = ?',
      [configId]
    );

    if (!config) {
      throw new AppError('Browser configuration not found', 404);
    }

    return config;
  }

  async update(configId: number, data: UpdateBrowserConfigRequest): Promise<void> {
    // Check if configuration exists
    await this.get(configId);

    // Validate device type if provided
    if (data.device_type && !isValidDeviceType(data.device_type)) {
      throw new AppError(
        'Valid device type is required (desktop, mobile, or tablet)',
        400
      );
    }

    // Validate viewport dimensions if provided
    if (data.viewport_width !== undefined && data.viewport_width !== null) {
      if (data.viewport_width < 1 || data.viewport_width > 10000) {
        throw new AppError('Viewport width must be between 1 and 10000', 400);
      }
    }

    if (data.viewport_height !== undefined && data.viewport_height !== null) {
      if (data.viewport_height < 1 || data.viewport_height > 10000) {
        throw new AppError('Viewport height must be between 1 and 10000', 400);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.browser_name !== undefined) {
      updates.push('browser_name = ?');
      values.push(sanitizeString(data.browser_name, 100));
    }
    if (data.browser_version !== undefined) {
      updates.push('browser_version = ?');
      values.push(data.browser_version ? sanitizeString(data.browser_version, 50) : null);
    }
    if (data.device_type !== undefined) {
      updates.push('device_type = ?');
      values.push(data.device_type);
    }
    if (data.operating_system !== undefined) {
      updates.push('operating_system = ?');
      values.push(
        data.operating_system ? sanitizeString(data.operating_system, 100) : null
      );
    }
    if (data.viewport_width !== undefined) {
      updates.push('viewport_width = ?');
      values.push(data.viewport_width || null);
    }
    if (data.viewport_height !== undefined) {
      updates.push('viewport_height = ?');
      values.push(data.viewport_height || null);
    }
    if (data.user_agent !== undefined) {
      updates.push('user_agent = ?');
      values.push(data.user_agent || null);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(configId);
    const sql = `UPDATE browser_configurations SET ${updates.join(', ')} WHERE config_id = ?`;
    await execute(sql, values);
  }

  async delete(configId: number): Promise<void> {
    // Check if configuration exists
    await this.get(configId);

    // Check if configuration is being used in url_checks
    const checks = await query(
      'SELECT check_id FROM url_checks WHERE config_id = ? LIMIT 1',
      [configId]
    );

    if (checks.length > 0) {
      throw new AppError(
        'Cannot delete browser configuration that has been used in monitoring checks. Deactivate it instead.',
        400
      );
    }

    const affectedRows = await execute(
      'DELETE FROM browser_configurations WHERE config_id = ?',
      [configId]
    );

    if (affectedRows === 0) {
      throw new AppError('Failed to delete browser configuration', 500);
    }
  }

  async toggleActive(configId: number): Promise<boolean> {
    // Check if configuration exists
    const config = await this.get(configId);

    const newStatus = !config.is_active;
    await execute('UPDATE browser_configurations SET is_active = ? WHERE config_id = ?', [
      newStatus,
      configId,
    ]);

    return newStatus;
  }
}

export const browserService = new BrowserService();
