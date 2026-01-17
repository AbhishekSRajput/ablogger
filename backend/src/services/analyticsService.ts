import { query, queryOne } from '../config/database';
import { OverviewStats, TrendData, GroupedCount } from '../types';

export class AnalyticsService {
  async getOverviewStats(): Promise<OverviewStats> {
    // Get total clients
    const clientCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM clients WHERE is_active = TRUE'
    );

    // Get total URLs
    const urlCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM monitored_urls WHERE is_active = TRUE'
    );

    // Get failures in last 7 days
    const failures7Days = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM detected_failures WHERE detected_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    // Get failures in last 30 days
    const failures30Days = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM detected_failures WHERE detected_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    // Get failures by status
    const failuresByStatus = await query<{ status: string; count: number }>(
      `SELECT
        resolution_status as status,
        COUNT(*) as count
      FROM detected_failures
      GROUP BY resolution_status
      ORDER BY count DESC`
    );

    return {
      totalClients: clientCount?.count || 0,
      totalUrls: urlCount?.count || 0,
      failuresLast7Days: failures7Days?.count || 0,
      failuresLast30Days: failures30Days?.count || 0,
      failuresByStatus,
    };
  }

  async getFailureTrends(days: number = 30): Promise<TrendData[]> {
    const sql = `
      SELECT
        DATE(detected_at) as date,
        COUNT(*) as count
      FROM detected_failures
      WHERE detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(detected_at)
      ORDER BY date ASC
    `;

    const results = await query<{ date: Date; count: number }>(sql, [days]);

    return results.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      count: r.count,
    }));
  }

  async getFailuresByBrowser(days: number = 30): Promise<GroupedCount[]> {
    const sql = `
      SELECT
        COALESCE(browser_from_cookie, 'Unknown') as label,
        COUNT(*) as count
      FROM detected_failures
      WHERE detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY browser_from_cookie
      ORDER BY count DESC
      LIMIT 10
    `;

    return await query<GroupedCount>(sql, [days]);
  }

  async getFailuresByClient(days: number = 30): Promise<GroupedCount[]> {
    const sql = `
      SELECT
        c.client_name as label,
        COUNT(*) as count
      FROM detected_failures df
      INNER JOIN clients c ON df.client_id = c.client_id
      WHERE df.detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY df.client_id, c.client_name
      ORDER BY count DESC
      LIMIT 10
    `;

    return await query<GroupedCount>(sql, [days]);
  }

  async getFailuresByErrorType(days: number = 30): Promise<GroupedCount[]> {
    const sql = `
      SELECT
        error_type as label,
        COUNT(*) as count
      FROM detected_failures
      WHERE detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 10
    `;

    return await query<GroupedCount>(sql, [days]);
  }

  async getFailuresByTestId(days: number = 30): Promise<GroupedCount[]> {
    const sql = `
      SELECT
        test_id as label,
        COUNT(*) as count
      FROM detected_failures
      WHERE detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY test_id
      ORDER BY count DESC
      LIMIT 10
    `;

    return await query<GroupedCount>(sql, [days]);
  }

  async getTopErrors(days: number = 30, limit: number = 10): Promise<GroupedCount[]> {
    const sql = `
      SELECT
        CONCAT(error_type, ': ', LEFT(error_message, 100)) as label,
        COUNT(*) as count
      FROM detected_failures
      WHERE detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY error_type, error_message
      ORDER BY count DESC
      LIMIT ?
    `;

    return await query<GroupedCount>(sql, [days, limit]);
  }

  async getClientStats(clientId: number, days: number = 30): Promise<{
    totalUrls: number;
    activeUrls: number;
    totalFailures: number;
    failuresByStatus: { status: string; count: number }[];
    failuresByErrorType: GroupedCount[];
    recentTrend: TrendData[];
  }> {
    // Get URL counts
    const urlStats = await queryOne<{ total: number; active: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active
      FROM monitored_urls
      WHERE client_id = ?`,
      [clientId]
    );

    // Get total failures
    const totalFailures = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count
      FROM detected_failures
      WHERE client_id = ? AND detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [clientId, days]
    );

    // Get failures by status
    const failuresByStatus = await query<{ status: string; count: number }>(
      `SELECT
        resolution_status as status,
        COUNT(*) as count
      FROM detected_failures
      WHERE client_id = ? AND detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY resolution_status
      ORDER BY count DESC`,
      [clientId, days]
    );

    // Get failures by error type
    const failuresByErrorType = await query<GroupedCount>(
      `SELECT
        error_type as label,
        COUNT(*) as count
      FROM detected_failures
      WHERE client_id = ? AND detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 10`,
      [clientId, days]
    );

    // Get recent trend
    const recentTrendResults = await query<{ date: Date; count: number }>(
      `SELECT
        DATE(detected_at) as date,
        COUNT(*) as count
      FROM detected_failures
      WHERE client_id = ? AND detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(detected_at)
      ORDER BY date ASC`,
      [clientId, days]
    );

    const recentTrend = recentTrendResults.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      count: r.count,
    }));

    return {
      totalUrls: urlStats?.total || 0,
      activeUrls: urlStats?.active || 0,
      totalFailures: totalFailures?.count || 0,
      failuresByStatus,
      failuresByErrorType,
      recentTrend,
    };
  }

  async getUrlStats(urlId: number, days: number = 30): Promise<{
    totalChecks: number;
    totalFailures: number;
    failuresByErrorType: GroupedCount[];
    failuresByBrowser: GroupedCount[];
    recentTrend: TrendData[];
  }> {
    // Get total checks
    const totalChecks = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count
      FROM url_checks
      WHERE url_id = ? AND checked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [urlId, days]
    );

    // Get total failures
    const totalFailures = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count
      FROM detected_failures
      WHERE url_id = ? AND detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [urlId, days]
    );

    // Get failures by error type
    const failuresByErrorType = await query<GroupedCount>(
      `SELECT
        error_type as label,
        COUNT(*) as count
      FROM detected_failures
      WHERE url_id = ? AND detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 10`,
      [urlId, days]
    );

    // Get failures by browser
    const failuresByBrowser = await query<GroupedCount>(
      `SELECT
        COALESCE(browser_from_cookie, 'Unknown') as label,
        COUNT(*) as count
      FROM detected_failures
      WHERE url_id = ? AND detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY browser_from_cookie
      ORDER BY count DESC
      LIMIT 10`,
      [urlId, days]
    );

    // Get recent trend
    const recentTrendResults = await query<{ date: Date; count: number }>(
      `SELECT
        DATE(detected_at) as date,
        COUNT(*) as count
      FROM detected_failures
      WHERE url_id = ? AND detected_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(detected_at)
      ORDER BY date ASC`,
      [urlId, days]
    );

    const recentTrend = recentTrendResults.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      count: r.count,
    }));

    return {
      totalChecks: totalChecks?.count || 0,
      totalFailures: totalFailures?.count || 0,
      failuresByErrorType,
      failuresByBrowser,
      recentTrend,
    };
  }
}

export const analyticsService = new AnalyticsService();
