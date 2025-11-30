/**
 * 接口限流中间件
 * 基于内存实现简单的速率限制，防止接口滥用
 * 支持 Redis 和内存两种模式
 */

import cacheService from '../services/cacheService.js';

// 内存存储（Redis 不可用时的备用方案）
const memoryStore = new Map();

/**
 * 清理过期的内存记录
 */
const cleanupMemoryStore = () => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetTime < now) {
      memoryStore.delete(key);
    }
  }
};

// 每分钟清理一次过期记录
setInterval(cleanupMemoryStore, 60000);

/**
 * 创建限流中间件
 * @param {Object} options 配置选项
 * @param {number} options.windowMs 时间窗口（毫秒）
 * @param {number} options.max 时间窗口内最大请求数
 * @param {string} options.message 超限时的错误消息
 * @param {Function} options.keyGenerator 生成限流 key 的函数
 * @param {boolean} options.skipSuccessfulRequests 是否跳过成功的请求
 */
export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 默认 1 分钟
    max = 100, // 默认每分钟 100 次
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req) => {
      // 默认使用 IP + 路径作为 key
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      return `ratelimit:${ip}:${req.path}`;
    },
    skipSuccessfulRequests = false
  } = options;

  return async (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    try {
      let current;
      let resetTime;

      // 优先使用 Redis
      if (cacheService.isConnected) {
        const redisKey = key;
        const data = await cacheService.get(redisKey);

        if (data) {
          current = data.count;
          resetTime = data.resetTime;

          if (now > resetTime) {
            // 窗口已过期，重置
            current = 1;
            resetTime = now + windowMs;
          } else {
            current += 1;
          }
        } else {
          current = 1;
          resetTime = now + windowMs;
        }

        await cacheService.set(redisKey, { count: current, resetTime }, Math.ceil(windowMs / 1000));
      } else {
        // 使用内存存储
        const data = memoryStore.get(key);

        if (data) {
          current = data.count;
          resetTime = data.resetTime;

          if (now > resetTime) {
            current = 1;
            resetTime = now + windowMs;
          } else {
            current += 1;
          }
        } else {
          current = 1;
          resetTime = now + windowMs;
        }

        memoryStore.set(key, { count: current, resetTime });
      }

      // 设置响应头
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      if (current > max) {
        res.setHeader('Retry-After', Math.ceil((resetTime - now) / 1000));
        return res.status(429).json({
          ok: false,
          error: message,
          retryAfter: Math.ceil((resetTime - now) / 1000)
        });
      }

      // 如果需要跳过成功请求的计数，在响应完成后减少计数
      if (skipSuccessfulRequests) {
        res.on('finish', async () => {
          if (res.statusCode < 400) {
            // 成功的请求，减少计数
            if (cacheService.isConnected) {
              const data = await cacheService.get(key);
              if (data && data.count > 0) {
                data.count -= 1;
                await cacheService.set(key, data, Math.ceil(windowMs / 1000));
              }
            } else {
              const data = memoryStore.get(key);
              if (data && data.count > 0) {
                data.count -= 1;
              }
            }
          }
        });
      }

      next();
    } catch (error) {
      console.error('限流中间件错误:', error);
      // 出错时放行请求
      next();
    }
  };
};

/**
 * 预配置的限流器
 */

// API 通用限流：每分钟 100 次
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'API 请求过于频繁，请稍后再试'
});

// 认证接口限流：每 15 分钟 10 次（防暴力破解）
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '登录尝试过于频繁，请 15 分钟后再试',
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    return `ratelimit:auth:${ip}`;
  }
});

// 文件上传限流：每小时 20 次
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: '文件上传过于频繁，请稍后再试'
});

// AI 接口限流：每分钟 10 次（保护 API 配额）
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'AI 服务调用过于频繁，请稍后再试'
});

// 严格限流：每秒 5 次（用于敏感操作）
export const strictLimiter = createRateLimiter({
  windowMs: 1000,
  max: 5,
  message: '操作过于频繁，请稍后再试'
});

export default {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  uploadLimiter,
  aiLimiter,
  strictLimiter
};
