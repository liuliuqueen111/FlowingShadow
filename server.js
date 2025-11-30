/*
  SSR + Express 服务器
 */

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import compression from 'compression';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

// Global error handlers - log uncaught exceptions and rejections for debugging
process.on('uncaughtException', (err) => {
  console.error('\n🚨 UNCAUGHT EXCEPTION:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n🚨 UNHANDLED REJECTION:', reason && reason.stack ? reason.stack : reason);
});

// 服务端模块
import { sequelize } from './server/models/index.js';
import cacheService from './server/services/cacheService.js';
import articleService from './server/services/articleService.js';
import AuthService from './server/services/authService.js';
import { authenticate, optionalAuthenticate, authorize, checkOwnership } from './server/middleware/auth.js';
import { apiLimiter, authLimiter, uploadLimiter, aiLimiter } from './server/middleware/rateLimiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// 上传目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 文件名：时间戳 + 随机数 + 原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cover-' + uniqueSuffix + ext);
  }
});

//只允许图片
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  }
});

async function createServer() {
  const app = express();

  // 中间件
  app.use(compression());
  app.use(express.json());

  //提供上传的图片
  app.use('/uploads', express.static(uploadDir, {
    maxAge: '1y',
    immutable: true
  }));

  let vite;

  if (isProduction) {
    app.use('/assets', express.static(path.join(__dirname, 'dist/client/assets'), {
      maxAge: '1y',
      immutable: true
    }));
    app.use(express.static(path.join(__dirname, 'dist/client'), {
      index: false,
      maxAge: '1h'
    }));
  } else {
    // 开发环境
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  }
  let dbConnected = false;
  let redisConnected = false;

  try {
    await sequelize.authenticate();
    console.log('✅ MySQL 数据库连接成功');
    dbConnected = true;
  } catch (error) {
    console.error('❌ MySQL 连接失败，将使用降级模式:', error.message);
  }

  try {
    redisConnected = await cacheService.connect();
  } catch (error) {
    console.error('❌ Redis 连接失败，使用内存缓存:', error.message);
  }


  // API 通用限流
  app.use('/api', apiLimiter);

  // 文件上传接口
  app.post('/api/upload/cover', uploadLimiter, upload.single('cover'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: '没有上传文件' });
      }

      // 返回URL
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        ok: true,
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('文件上传失败:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });


  // 用户注册
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          ok: false,
          error: '用户名、邮箱和密码都是必需的'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          ok: false,
          error: '密码长度至少6位'
        });
      }

      const result = await AuthService.register({ username, email, password });
      res.status(201).json({ ok: true, ...result });
    } catch (error) {
      console.error('注册失败:', error);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  // 用户登录
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          ok: false,
          error: '用户名和密码都是必需的'
        });
      }

      const result = await AuthService.login({ username, password });
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error('登录失败:', error);
      res.status(401).json({ ok: false, error: error.message });
    }
  });

  // 获取当前用户信息
  app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
      res.json({
        ok: true,
        user: req.user
      });
    } catch (error) {
      console.error('获取用户信息失败:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 更新用户信息
  app.put('/api/auth/me', authenticate, async (req, res) => {
    try {
      const result = await AuthService.updateUser(req.user.id, req.body);
      res.json({ ok: true, user: result });
    } catch (error) {
      console.error('更新用户信息失败:', error);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  // 健康检查
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      db: dbConnected ? 'connected' : 'disconnected',
      cache: cacheService.getStatus()
    });
  });

  // 获取用户自己的文章列表
  app.get('/api/my/articles', authenticate, async (req, res) => {
    const start = Date.now();
    const { page = 1, limit = 10, status } = req.query;

    try {
      if (!dbConnected) {
        return res.status(503).json({
          data: { articles: [], total: 0 },
          source: 'NONE',
          degraded: true,
          error: 'Database unavailable'
        });
      }

      const result = await articleService.getList({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        authorId: req.user.id, // 只获取当前用户的文章
        status: status || undefined 
      });

      res.setHeader('X-Cache', result.source === 'L2_REDIS' ? 'HIT' : 'MISS');
      res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({
        data: result,
        serverGeneratedTime: Date.now(),
        source: result.source,
        latency: Date.now() - start,
        renderStrategy: 'SSR_FULL',
        degraded: false
      });
    } catch (error) {
      console.error('API 错误:', error);
      res.status(500).json({
        data: { articles: [], total: 0 },
        source: 'NONE',
        degraded: true,
        error: error.message
      });
    }
  });
  
  // 文章列表 API
  app.get('/api/articles', async (req, res) => {
    const start = Date.now();
    const { page = 1, limit = 10, category, tag, status } = req.query;

    try {
      if (!dbConnected) {
        return res.status(503).json({
          data: { articles: [], total: 0 },
          source: 'NONE',
          degraded: true,
          error: 'Database unavailable'
        });
      }

      const result = await articleService.getList({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        category,
        tag,
        status: status || 'PUBLISHED'
      });

      res.setHeader('X-Cache', result.source === 'L2_REDIS' ? 'HIT' : 'MISS');
      res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({
        data: result,
        serverGeneratedTime: Date.now(),
        source: result.source,
        latency: Date.now() - start,
        renderStrategy: 'SSR_FULL',
        degraded: false
      });
    } catch (error) {
      console.error('API 错误:', error);
      res.status(500).json({
        data: { articles: [], total: 0 },
        source: 'NONE',
        degraded: true,
        error: error.message
      });
    }
  });

  // 文章详情 API
  app.get('/api/articles/:id', async (req, res) => {
    const start = Date.now();
    const { id } = req.params;

    try {
      if (!dbConnected) {
        return res.status(503).json({
          data: null,
          source: 'NONE',
          degraded: true,
          error: 'Database unavailable'
        });
      }

      const result = await articleService.getById(id);

      if (!result.data) {
        return res.status(404).json({
          data: null,
          source: 'L4_DB',
          degraded: false,
          error: 'Article not found'
        });
      }

      // 异步增加阅读量
      articleService.incrementViews(id);

      res.setHeader('X-Cache', result.source === 'L2_REDIS' ? 'HIT' : 'MISS');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({
        data: result.data,
        serverGeneratedTime: Date.now(),
        source: result.source,
        latency: Date.now() - start,
        renderStrategy: 'SSR_FULL',
        degraded: false
      });
    } catch (error) {
      console.error('API 错误:', error);
      res.status(500).json({
        data: null,
        source: 'NONE',
        degraded: true,
        error: error.message
      });
    }
  });

  // 创建文章
  app.post('/api/articles', authenticate, async (req, res) => {
    try {
      if (!dbConnected) {
        return res.status(503).json({ ok: false, error: 'Database unavailable' });
      }

      // 添加作者信息
      const articleData = {
        ...req.body,
        author_id: req.user.id
      };

      const result = await articleService.create(articleData);
      res.status(201).json({ ok: true, ...result });
    } catch (error) {
      console.error('创建文章失败:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 更新文章
  app.put('/api/articles/:id', authenticate, checkOwnership('article'), async (req, res) => {
    try {
      if (!dbConnected) {
        return res.status(503).json({ ok: false, error: 'Database unavailable' });
      }

      const result = await articleService.update(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      console.error('更新文章失败:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 删除文章
  app.delete('/api/articles/:id', authenticate, checkOwnership('article'), async (req, res) => {
    try {
      if (!dbConnected) {
        return res.status(503).json({ ok: false, error: 'Database unavailable' });
      }

      const hard = req.query.hard === 'true';
      const result = await articleService.delete(req.params.id, hard);
      res.json(result);
    } catch (error) {
      console.error('删除文章失败:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 批量删除
  app.post('/api/articles/batch-delete', authenticate, authorize('editor'), async (req, res) => {
    try {
      if (!dbConnected) {
        return res.status(503).json({ ok: false, error: 'Database unavailable' });
      }

      const { ids, hard } = req.body;
      const result = await articleService.batchDelete(ids, hard);
      res.json(result);
    } catch (error) {
      console.error('批量删除失败:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // AI 生成接口
  app.post('/api/ai/generate', aiLimiter, async (req, res) => {
    try {
      const { type, prompt, context, tags } = req.body;

      // 没有配置豆包 API Key，返回模拟数据
      if (!process.env.ARK_API_KEY || !process.env.ARK_MODEL_ENDPOINT) {
        return res.json({
          text: `【本地模拟】类型: ${type}\n\n基于提示 "${prompt || '未提供'}" 生成的内容。`,
          mock: true
        });
      }

      // 导入豆包服务
      const { generateBlogContent } = await import('./services/doubaoService.js');

      // 调用豆包 AI 
      const result = await generateBlogContent({
        type: type.toUpperCase(),
        prompt,
        context,
        tags
      });

      res.json({
        text: result,
        mock: false
      });
    } catch (error) {
      console.error('AI 生成失败:', error);
      res.status(500).json({
        error: error.message || 'AI 服务暂时不可用'
      });
    }
  });


  //SSR 处理函数
  async function handleSSR(req, res, getInitialData) {
    const url = req.originalUrl;
    let template, render;

    try {
      // 获取初始数据
      let initialData = null;
      let degraded = false;

      try {
        if (dbConnected && getInitialData) {
          console.log(`[SSR] 开始获取初始数据 -> url=${url} dbConnected=${dbConnected}`);
          initialData = await getInitialData();
          try {
            const keys = initialData ? Object.keys(initialData).join(',') : 'null';
            console.log(`[SSR] 初始数据获取成功 -> keys=${keys}`);
          } catch (e) {
            console.log('[SSR] 初始数据获取成功，无法列出键（可能包含不可枚举或循环结构）');
          }
        }
      } catch (error) {
        console.error('SSR 数据获取失败，降级渲染:', error && error.stack ? error.stack : error);
        degraded = true;
      }

      if (isProduction) {
        // 生产
        template = fs.readFileSync(path.join(__dirname, 'dist/client/index.html'), 'utf-8');
        const serverModule = await import('./dist/server/entry-server.js');
        render = serverModule.render;
      } else {
        // 开发
        template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const serverModule = await vite.ssrLoadModule('/entry-server.tsx');
        render = serverModule.render;
      }

      // 执行 React 服务端渲染
      const { html: appHtml } = render({ initialData, url });

      // 注入初始数据脚本
      const initialDataScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};window.__SSR_DEGRADED__ = ${degraded};</script>`;

      // 替换模板中的占位符
      let html = template
        .replace('<!--ssr-outlet-->', appHtml)
        .replace('</head>', `${initialDataScript}</head>`);


      if (!template.includes('<!--ssr-outlet-->')) {
        html = template.replace(
          '<div id="root"></div>',
          `<div id="root">${appHtml}</div>${initialDataScript}`
        );
      }

      // HTTP 缓存头
      const etag = Buffer.from(html).toString('base64').substring(0, 32);
      res.setHeader('ETag', `"${etag}"`);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

      if (req.headers['if-none-match'] === `"${etag}"`) {
        return res.status(304).end();
      }

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-SSR', degraded ? 'degraded' : 'full');
      res.status(200).send(html);

    } catch (error) {
      console.error('SSR 渲染错误:', error);

      if (!isProduction && vite) {
        vite.ssrFixStacktrace(error);
      }

      // 获取初始数据用于客户端渲染
      let initialData = null;
      try {
        if (dbConnected && getInitialData) {
          initialData = await getInitialData();
        }
      } catch (dataError) {
        console.error('降级时数据获取失败:', dataError.message);
      }

      // 降级：返回客户端渲染的 HTML
      let fallbackTemplate;
      try {
        fallbackTemplate = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
        if (!isProduction && vite) {
          fallbackTemplate = await vite.transformIndexHtml(url, fallbackTemplate);
        }
      } catch (e) {
        // 如果读取模板失败，使用硬编码的 fallback
        fallbackTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flowing Shadow</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/entry-client.tsx"></script>
</body>
</html>`;
      }

      // 注入初始数据
      const dataScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};window.__SSR_DEGRADED__ = true;</script>`;
      const fallbackHtml = fallbackTemplate.replace('</head>', `${dataScript}</head>`);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-SSR', 'client-only');
      res.status(200).send(fallbackHtml);
    }
  }

  // 首页 SSR
  app.get('/', (req, res) => {
    handleSSR(req, res, async () => {
      const result = await articleService.getList({ page: 1, limit: 10 });
      return { articles: result.articles, total: result.total };
    });
  });

  // 文章详情页 SSR
  app.get('/article/:id', (req, res) => {
    handleSSR(req, res, async () => {
      const result = await articleService.getById(req.params.id);
      if (result.data) {
        articleService.incrementViews(req.params.id);
      }
      return { article: result.data };
    });
  });

  // 其他路由走 SSR
  app.get('*', (req, res) => {
    // 跳过 API 和静态资源
    if (req.url.startsWith('/api') || req.url.includes('.')) {
      return res.status(404).send('Not Found');
    }
    handleSSR(req, res);
  });

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 SSR Blog Server Started                               ║
║                                                            ║
║   Local:   http://localhost:${PORT}                          ║
║   Mode:    ${isProduction ? 'Production' : 'Development'}                               ║
║                                                            ║
║   MySQL:   ${dbConnected ? '✅ Connected' : '❌ Disconnected (Degraded Mode)'}             ║
║   Redis:   ${redisConnected ? '✅ Connected' : '⚠️  Memory Cache (Fallback)'}              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

createServer().catch(console.error);
