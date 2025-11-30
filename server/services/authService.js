/**
 * 用户认证服务
 * 处理 JWT token 生成、验证和密码加密
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthService {
  /**
   * 密码加密
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * 密码验证
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * 生成 JWT token
   */
  static generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'ssr-blog',
      audience: 'user'
    });
  }

  /**
   * 验证 JWT token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'ssr-blog',
        audience: 'user'
      });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * 从请求中提取 token
   */
  static extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 从 cookie 中提取（如果有的话）
    return req.cookies?.token;
  }

  /**
   * 用户注册
   */
  static async register(userData) {
    const { username, email, password } = userData;

    // 检查用户名和邮箱是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error('用户名已存在');
      }
      if (existingUser.email === email) {
        throw new Error('邮箱已被注册');
      }
    }

    // 创建新用户
    const hashedPassword = await this.hashPassword(password);
    const user = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      role: 'user', // 默认角色
      status: 'active'
    });

    // 生成 token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status
      },
      token
    };
  }

  /**
   * 用户登录
   */
  static async login(credentials) {
    const { username, password } = credentials;

    // 查找用户
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username } // 支持用邮箱登录
        ]
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.status !== 'active') {
      throw new Error('账户已被禁用');
    }

    // 验证密码
    const isValidPassword = await this.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('密码错误');
    }

    // 生成 token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status
      },
      token
    };
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(token) {
    const decoded = this.verifyToken(token);

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'email', 'role', 'avatar', 'status']
    });

    if (!user || user.status !== 'active') {
      throw new Error('用户不存在或已被禁用');
    }

    return user;
  }

  /**
   * 更新用户信息
   */
  static async updateUser(userId, updateData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const { password, ...otherData } = updateData;

    // 如果更新密码，需要加密
    if (password) {
      otherData.password_hash = await this.hashPassword(password);
    }

    await user.update(otherData);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status
    };
  }

  /**
   * 检查权限
   */
  static checkPermission(user, requiredRole) {
    const roleHierarchy = {
      'user': 1,
      'editor': 2,
      'admin': 3
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }
}

export default AuthService;