/**
 * Redis 缓存服务，使用 ioredis 
 */

import Redis from 'ioredis';
import redisConfig from '../config/redis.js';

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackCache = new Map(); // 降级时使用内存缓存
  }

  /**
   * 初始化 Redis 连接
   */
  async connect() {
    try {
      this.client = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        keyPrefix: redisConfig.keyPrefix,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.client.on('connect', () => {
        console.log('Redis 连接成功');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('Redis 错误:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('Redis 连接已关闭');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Redis 连接失败，使用内存缓存降级:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 获取缓存
   * @param {string} key 键
   * @returns {Promise<any>} 值
   */
  async get(key) {
    try {
      if (this.isConnected && this.client) {
        const value = await this.client.get(key);
        if (value) {
          return JSON.parse(value);
        }
        return null;
      }
      // 降级到内存缓存
      const cached = this.fallbackCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }
      return null;
    } catch (error) {
      console.error('缓存读取错误:', error.message);
      return null;
    }
  }

  /**
   * 设置缓存
   * @param {string} key 键
   * @param {any} value 值
   * @param {number} ttl 过期时间
   */
  async set(key, value, ttl = 60) {
    try {
      const serialized = JSON.stringify(value);
      if (this.isConnected && this.client) {
        await this.client.setex(key, ttl, serialized);
      } else {
        // 降级到内存缓存
        this.fallbackCache.set(key, {
          value,
          expires: Date.now() + ttl * 1000
        });
      }
    } catch (error) {
      console.error('缓存写入错误:', error.message);
    }
  }

  /**
   * 删除缓存
   * @param {string} key 键
   */
  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      }
      this.fallbackCache.delete(key);
    } catch (error) {
      console.error('缓存删除错误:', error.message);
    }
  }

  /**
   * 按模式删除缓存
   */
  async delByPattern(pattern) {
    try {
      if (this.isConnected && this.client) {
        // 使用 SCAN 避免阻塞
        const stream = this.client.scanStream({
          match: redisConfig.keyPrefix + pattern,
          count: 100
        });

        const keysToDelete = [];
        
        for await (const keys of stream) {
          keysToDelete.push(...keys);
        }

        if (keysToDelete.length > 0) {
          // 注意：scanStream 返回的是完整键名（含前缀）
          // 但 ioredis 配置了 keyPrefix 后，del 操作会自动添加前缀
          // 所以需要移除前缀后再删除，让 ioredis 重新添加
          const cleanKeys = keysToDelete.map(k => k.replace(redisConfig.keyPrefix, ''));
          // 使用 pipeline 批量删除提高效率
          const pipeline = this.client.pipeline();
          cleanKeys.forEach(key => pipeline.del(key));
          await pipeline.exec();
          console.log(`已失效 ${cleanKeys.length} 个缓存键: ${cleanKeys.slice(0, 3).join(', ')}${cleanKeys.length > 3 ? '...' : ''}`);
        } else {
          console.log(`未找到匹配 "${pattern}" 的缓存键`);
        }
      }
      
      // 清理内存缓存中匹配的键
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.fallbackCache.keys()) {
        if (regex.test(key)) {
          this.fallbackCache.delete(key);
        }
      }
    } catch (error) {
      console.error('模式删除缓存错误:', error.message);
    }
  }

  /**
   * 失效文章
   * @param {number|string} articleId 文章 ID
   */
  async invalidateArticle(articleId) {
    await this.del(`article:${articleId}`);
    await this.delByPattern('articles:list:*');
    console.log(`已失效文章 ${articleId} 相关缓存`);
  }

  /**
   * 失效文章列表缓存
   */
  async invalidateArticleList() {
    await this.delByPattern('articles:list:*');
    console.log('已失效文章列表缓存');
  }

  /**
   * 关闭连接
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * 获取连接
   */
  getStatus() {
    return {
      connected: this.isConnected,
      type: this.isConnected ? 'redis' : 'memory',
      fallbackCacheSize: this.fallbackCache.size
    };
  }
}

// 单例导出
const cacheService = new CacheService();
export default cacheService;
