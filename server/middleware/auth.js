/**
 * 认证中间件
 */

import AuthService from '../services/authService.js';

/**
 * 验证 token 并将用户信息添加到 req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = AuthService.extractToken(req);

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: '未提供认证令牌'
      });
    }

    const user = await AuthService.getCurrentUser(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: '认证失败: ' + error.message
    });
  }
};

/**
 * 如果有 token 就验证，没有就跳过
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = AuthService.extractToken(req);
    if (token) {
      const user = await AuthService.getCurrentUser(token);
      req.user = user;
    }
    next();
  } catch (error) {
    // 可选认证失败不阻断请求
    next();
  }
};

/**
 * 检查用户是否有指定角色权限
 */
export const authorize = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: '需要先登录'
      });
    }

    if (!AuthService.checkPermission(req.user, requiredRole)) {
      return res.status(403).json({
        ok: false,
        error: '权限不足'
      });
    }

    next();
  };
};

/**
 * 检查用户是否是资源的拥有者（或管理员）
 */
export const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: '需要先登录'
      });
    }

    // 管理员可以访问所有资源
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params.id;
    let isOwner = false;

    try {
      switch (resourceType) {
        case 'article':
          // Use the DB model directly to get the raw author_id to avoid issues
          // with formatted objects returned by the service layer.
          const { Article } = await import('../models/index.js');
          const dbArticle = await Article.findByPk(resourceId, { attributes: ['id', 'author_id'] });
          isOwner = dbArticle && dbArticle.author_id === req.user.id;
          break;

        case 'user':
          isOwner = parseInt(resourceId) === req.user.id;
          break;

        default:
          return res.status(400).json({
            ok: false,
            error: '无效的资源类型'
          });
      }

      if (!isOwner) {
        console.warn(`⚠️ checkOwnership denied: userId=${req.user?.id}, resourceType=${resourceType}, resourceId=${resourceId}, ownerId=${article?.data?.authorId}`);
        return res.status(403).json({
          ok: false,
          error: '只能访问自己的资源'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: '权限检查失败'
      });
    }
  };
};

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  checkOwnership
};