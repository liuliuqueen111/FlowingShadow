/**
 * Redis 配置文件
 */

export default {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: 'ssr_blog:',
  // 缓存 TTL 配置（秒）
  ttl: {
    articleList: 60,      // 文章列表缓存 60 秒
    articleDetail: 120,   // 文章详情缓存 120 秒
    hotArticles: 300      // 热门文章缓存 5 分钟
  }
};
