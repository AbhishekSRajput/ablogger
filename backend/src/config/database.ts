import mysql from 'mysql2/promise';
import { config } from './env';
import { logger } from '../utils/logger';

// Create connection pool
export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    logger.info('Database connection established successfully');
    connection.release();
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    return false;
  }
}

// Helper function to execute queries with error handling
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    logger.error('Database query error:', { sql, error });
    throw error;
  }
}

// Helper for single row queries
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper for insert operations (returns insertId)
export async function insert(sql: string, params?: any[]): Promise<number> {
  try {
    const [result] = await pool.execute(sql, params);
    return (result as any).insertId;
  } catch (error) {
    logger.error('Database insert error:', { sql, error });
    throw error;
  }
}

// Helper for update/delete operations (returns affected rows)
export async function execute(sql: string, params?: any[]): Promise<number> {
  try {
    const [result] = await pool.execute(sql, params);
    return (result as any).affectedRows;
  } catch (error) {
    logger.error('Database execute error:', { sql, error });
    throw error;
  }
}

// Transaction helper
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction rolled back:', error);
    throw error;
  } finally {
    connection.release();
  }
}
