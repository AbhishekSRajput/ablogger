import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from '../config/database';
import { AdminUser, LoginRequest, LoginResponse, JwtPayload } from '../types';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { isValidUsername, isValidPassword } from '../utils/validators';

export class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { username, password } = credentials;

    if (!username || !password) {
      throw new AppError('Username and password are required', 400);
    }

    // Find user by username
    const user = await queryOne<AdminUser>(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await execute('UPDATE admin_users SET last_login = NOW() WHERE admin_id = ?', [
      user.admin_id,
    ]);

    // Generate JWT
    const payload: JwtPayload = {
      admin_id: user.admin_id,
      username: user.username,
      email: user.email,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions);

    return {
      token,
      admin: {
        admin_id: user.admin_id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async createAdminUser(
    username: string,
    email: string,
    password: string
  ): Promise<number> {
    if (!isValidUsername(username)) {
      throw new AppError(
        'Username must be 3-50 characters and contain only letters, numbers, and underscores',
        400
      );
    }

    if (!isValidPassword(password)) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    // Check if username exists
    const existing = await queryOne<AdminUser>(
      'SELECT admin_id FROM admin_users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing) {
      throw new AppError('Username or email already exists', 409);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const sql = `
      INSERT INTO admin_users (username, email, password_hash)
      VALUES (?, ?, ?)
    `;

    const [result] = await query(sql, [username, email, password_hash]);
    return (result as any).insertId;
  }
}

export const authService = new AuthService();
