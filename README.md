<img src="./FlowingShadow.jpg" alt="flowiingshadow" style="zoom:50%;" />


# 流影博客 

基于 React + Express + MySQL 构建的SSR 博客系统，集成 Redis 缓存优化、服务端降级、豆包 AI 写作助手等进阶功能。

## 项目概述

本项目是一个完整的博客内容管理系统，采用服务端渲染（SSR）架构实现首屏快速加载和 SEO 优化。前端使用 React 18 配合 Vite 构建，后端基于 Express 框架，采用 MySQL 数据库，通过 Redis 实现多层缓存策略。系统支持用户认证授权、文章 CRUD 操作、AI 辅助写作、图片上传等核心功能，提供完善的降级保护机制确保高可用性。

## 功能实现详解

---

### 🖥️ SSR 服务端渲染

> 基于 Express + Vite SSR 模式实现首屏快速加载与 SEO 优化

**流程：**

- **数据获取**：请求到达时，服务器优先从 Redis 缓存获取数据，未命中则查询 MySQL 数据库
- **服务端渲染**：调用 React 的 `renderToString` 方法将 App 组件渲染为完整 HTML 字符串
- **数据注水**：渲染后的 HTML 注入预取数据作为 `window.__INITIAL_DATA__`
- **客户端激活**：hydration 时直接使用注入数据，避免重复请求

**支持：**

- 文章列表页和详情页均支持 SSR
-  搜索引擎爬虫可直接获取完整内容
-  开发环境 Vite 热更新（HMR）支持
-  生产环境静态资源强缓存（`maxAge: 1y`）

---

### 🗄️ 后端 API 与数据库设计

> RESTful API 设计 + Sequelize ORM 数据建模

**技术选型：**
- **框架**：Express.js
- **ORM**：Sequelize
- **数据库**：MySQL

**数据库表结构：**

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 用户表 | 账户信息、角色权限 |
| `articles` | 文章表 | 内容、状态（DRAFT/PUBLISHED/ARCHIVED） |
| `categories` | 分类表 | 内容分类组织 |
| `tags` | 标签表 | 内容标签组织 |
| `article_tags` | 关联表 | 文章与标签多对多关系 |

**设计说明：**

-  `is_deleted` 字段支持逻辑删除
-  `published_at` 记录发布时间便于排序
-  适当索引（`status`、`author_id`、`published_at`）优化查询性能

**API 功能：**
- 文章列表分页查询（支持分类、标签、状态筛选）
- 文章详情查询 / 新增 / 修改 / 删除
- 支持逻辑删除和物理删除

---

### 📦 HTTP 缓存策略

> 多层缓存策略提升系统性能

**静态资源（强缓存）：**
```
CSS / JS / 图片 / 字体
├── maxAge: '1y'
├── immutable: true
└── 浏览器直接使用本地缓存，不发起请求
```

**动态页面（协商缓存）：**
- 服务器计算响应内容的 **ETag** 值
- 后续请求携带 `If-None-Match` 头
- 内容未变化返回 **304** 状态码，节省带宽

**其他策略：**
- API 响应设置 `X-Cache` 头标识数据来源（Redis / MySQL）
- 上传图片配置长期缓存（1 年），文件名含时间戳保证唯一性

---

### ⚡ Redis 缓存优化

> 多层缓存架构 + 主动失效策略

**缓存架构：**

```
L2 层 ──→ Redis 缓存
    │
    └─ 未命中
           │
           ▼
L4 层 ──→ MySQL 数据库 ──→ 写入缓存
```

**缓存 Key 设计：**
```
articles:list:p1:l10:call:tall:sPUBLISHED
         │   │    │    │    │
         │   │    │    │    └── 状态：已发布
         │   │    │    └── 全标签
         │   │    └── 全分类
         │   └── 每页 10 条
         └── 第 1 页
```

**缓存更新策略：**
- `invalidateArticle`：删除对应详情缓存
- `invalidateArticleList`：SCAN 命令模式匹配删除列表缓存
- **降级方案**：Redis 不可用时自动切换到内存 Map

---

### 🛡️ 服务端降级方案

> 完整的降级保护机制确保高可用性

**检测机制：**
- 启动时检测 MySQL / Redis 连接状态
- 连接失败标记 `dbConnected` / `redisConnected` 为 `false`

**降级流程：**
```
SSR 数据获取失败
       │
       ▼
捕获异常，设置 degraded: true
       │
       ▼
返回基础 HTML 骨架（不含预取数据）
       │
       ▼
客户端接管数据请求和渲染
```

**用户体验：**
-  客户端通过 `window.__SSR_DEGRADED__` 检测降级状态
-  UI 显示"系统服务降级中"提示
-  提供"刷新重试"按钮
-  API 返回 503 状态码和友好错误信息

**开发支持：**

- 前端开发者工具面板可模拟 Redis/MySQL 离线状态测试降级行为

---

### 🤖 AI 写作助手

> 集成字节跳动豆包（Doubao）大模型

**技术实现：**
- 通过火山引擎 Ark API 调用
- 接口：`/api/ai/generate`
- 返回 Markdown 格式内容

** AI 功能：**

| 功能 | 说明 |
|------|------|
| 🏷️ **智能拟题** | 根据文章内容或关键词生成多个候选标题 |
| 📝 **摘要提炼** | 自动提取 100 字左右精华概要 |
| ✍️ **智能续写** | 根据上下文语境继续撰写段落 |
| ✨ **文本润色** | 优化行文逻辑和表达方式 |
| 📋 **标签大纲** | 根据标签生成文章结构框架 |
| 🔍 **SEO 诊断** | 分析内容并给出搜索优化建议 |

**保护措施：**

- 独立限流策略：每分钟 10 次
- 未配置 API Key 时返回模拟数据

---

### 🔐 用户认证与权限控制

> JWT 认证 + RBAC 权限模型

**密码安全：**
- 使用 **bcrypt** 加盐哈希存储（12 轮）
- 支持用户名或邮箱登录

**JWT 令牌：**
- 有效期：7 天
- 包含：用户 ID、用户名、角色
- 存储：客户端 localStorage
- 传输：`Authorization: Bearer <token>`

**角色权限：**

| 角色 | 权限说明 |
|------|----------|
| `admin` | 管理员，拥有全部权限 |
| `editor` | 编辑，可管理文章 |
| `user` | 普通用户，只能管理自己的内容 |

**中间件体系：**
- `authenticate`：验证令牌有效性，注入 `req.user`
- `authorize`：检查角色权限
- `checkOwnership`：验证资源所有权（管理员可绕过）

---

### 🚦 接口限流防刷

> 固定时间窗口算法 + 多级限流策略

**实现方式：**
- 自定义中间件，支持 Redis 和内存两种存储
- 超过阈值返回 **429** 状态码和 `Retry-After` 头

**限流策略配置：**

| 接口类型 | 限流规则 | 说明 |
|----------|----------|------|
| 通用 API | 100 次/分钟 | 基础限流 |
| 认证接口 | 10 次/15分钟 | 防暴力破解 |
| 文件上传 | 20 次/小时 | 防存储滥用 |
| AI 接口 | 10 次/分钟 | 保护 API 配额 |

**响应头信息：**
- `X-RateLimit-Limit`：限制次数
- `X-RateLimit-Remaining`：剩余次数
- `X-RateLimit-Reset`：重置时间戳

**降级处理：**
- Redis 不可用时降级到内存 Map
- 定时清理过期记录防止内存泄漏

---

### 📤 文件上传功能

> multer 中间件处理文件上传

**接口配置：**
- 路径：`/api/upload/cover`
- 类型过滤：仅允许 `image/*` MIME 类型
- 大小限制：最大 5MB

**文件存储：**
```
uploads/
└── cover-{时间戳}-{随机数}.{扩展名}
```

**功能特性：**

- 上传成功返回文件访问 URL
-  uploads 目录配置强缓存策略
-  支持点击上传和 URL 输入两种方式
-  实时预览 + 一键清除已选图片
-  独立限流：每小时 20 次

---

### 🎨 前端交互功能

> React 18 + Hooks 现代化开发

**技术栈：**
- React 18 函数组件
- Hooks 状态管理
- CSS 暗黑模式切换

**文章列表页：**
- 三列卡片布局
- 点击卡片进入详情页
- 支持按分类和标签筛选

**文章详情页：**

- 完整文章内容 + 作者信息 + 阅读量统计
- 上下篇导航
- 沉浸阅读模式
- 阅读进度自动保存到 localStorage

**后台管理：**
- 文章新建 / 编辑 / 删除
- 表格展示所有文章状态

**Markdown 增强：**
- 代码块（带语言标注）
- 表格 / 引用 / 列表
- 图片懒加载优化

**开发工具：**

- 系统仿真控制台
- 模拟 Redis/MySQL 离线
- 不同用户类型测试（爬虫/快速网络/慢速网络）


## 环境要求

Node.js 18 或更高版本、MySQL 8.0 或更高版本、Redis 6.0 或更高版本（可选，不配置时自动降级到内存缓存）。

## 安装部署步骤

## Docker 一键部署

作者提供 docker-compose.yml 配置文件，可以一键启动 MySQL 和 Redis 服务，无需本地安装这些服务。我们打开dockerDesktop后，再执行 docker-compose up -d 命令后会创建并启动三个容器：MySQL 监听 3306 端口、Redis 监听 6379 端口、phpMyAdmin 数据库管理界面监听 8080 端口。容器数据通过 Docker Volume 持久化，这样重启也不会丢失。

1. **确保 Docker Desktop 运行**
   ```bash
   # Windows: 启动 Docker Desktop
   # 或者在系统托盘中找到 Docker Desktop 图标并启动
   ```

2. **启动服务**
   ```bash
   cd homework3
   docker-compose up -d
   ```

3. **等待服务启动完成**
   ```bash
   # 检查容器状态
   docker ps
   ```

4. **初始化数据库**
   ```bash
   npm run db:migrate
   ```

5. **启动应用**
   ```bash
   npm run dev
   ```

启动后访问：
- **博客应用**: http://localhost:3000
- **phpMyAdmin**: http://localhost:8080 (用户名: root, 密码: root123)
- **Redis Commander**: http://localhost:8081

### 停止服务

```bash
docker-compose down
```
### 清理数据

```bash
docker-compose down -v
```

如果你不想使用docker，作者也提供了手动安装配置教程：

### 第一步：克隆项目并安装依赖

首先克隆代码仓库到本地，进入项目目录后执行 npm install 安装所有前端和后端依赖包，包括 React、Express、Sequelize、ioredis 等核心依赖。

```bash
git clone <repository-url>
cd homework3
npm install
```

### 第二步：配置环境变量

复制环境变量模板文件 .env.example 为 .env.local，然后使用编辑器打开该文件填写实际的配置信息。数据库配置包括 MySQL 的主机地址、端口、数据库名、用户名和密码；Redis 配置包括主机地址、端口和可选的密码；JWT_SECRET 是用于签发认证令牌的密钥，生产环境必须设置为复杂随机字符串；豆包 AI 配置需要填入火山引擎 Ark 平台的 API Key 和模型端点 ID，如果不使用 AI 功能可以留空。

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件示例：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ssr_blog
DB_USER=root
DB_PASSWORD=your_mysql_password

# Redis 配置（可选，不配置则使用内存缓存）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 认证密钥（生产环境必须修改为安全的随机字符串）
JWT_SECRET=your-secure-secret-key-change-in-production

# 豆包 AI 配置（可选）
ARK_API_KEY=your-volcengine-ark-api-key
ARK_MODEL_ENDPOINT=your-model-endpoint-id
```

### 第三步：初始化数据库

确保 MySQL 服务已启动运行，首先创建名为 ssr_blog 的数据库并设置 utf8mb4 字符集支持完整的 Unicode 字符。然后执行数据库迁移命令，脚本会自动创建 users、articles、categories、tags、article_tags 五张表，建立外键关系和索引，插入默认的分类和标签数据，以及创建管理员账户（用户名 admin，密码 admin123）。

```bash
# 在 MySQL 命令行中创建数据库
mysql -u root -p -e "CREATE DATABASE ssr_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行迁移脚本创建表结构和初始数据
npm run db:migrate
```

### 第四步：启动开发服务器

执行开发启动命令后，Vite 会启动开发服务器并启用热模块替换（HMR），Express 服务器在 3000 端口监听请求并处理 SSR 渲染。打开浏览器访问 http://localhost:3000 即可看到博客首页。开发模式下修改代码会自动刷新页面，方便调试。

```bash
npm run dev
```

### 第五步：生产环境部署

生产部署需要先执行构建命令，Vite 会编译并打包前端资源到 dist/client 目录，同时生成服务端渲染入口到 dist/server 目录。构建完成后启动生产服务器，Express 会加载预构建的资源并启用各项性能优化（如静态资源强缓存、gzip 压缩等）。Windows 系统使用 start:win 命令启动。

```bash
# 构建前端和服务端代码
npm run build

# Linux/macOS 启动生产服务器
npm start

# Windows 启动生产服务器
npm run start:win
```



## 项目结构说明

```
homework3/
├── server.js                 # Express 服务器入口，SSR 渲染和 API 路由
├── entry-server.tsx          # React 服务端渲染入口
├── entry-client.tsx          # React 客户端激活入口
├── App.tsx                   # 主应用组件，路由和状态管理
├── index.html                # HTML 模板
├── vite.config.ts            # Vite 构建配置
├── components/               # React 组件目录
│   ├── ArticleCard.tsx       # 文章卡片展示组件
│   ├── ArticleViewer.tsx     # 文章详情阅读组件
│   ├── Editor.tsx            # 文章编辑器（含 AI 功能）
│   ├── Layout.tsx            # 页面布局组件
│   ├── AuthModal.tsx         # 登录注册模态框
│   └── MarkdownViewer.tsx    # Markdown 渲染组件
├── contexts/
│   └── AuthContext.tsx       # 用户认证状态上下文
├── services/
│   ├── backendSimulation.ts  # 前端 API 调用封装
│   └── doubaoService.ts      # 豆包 AI 服务调用
├── server/                   # 后端模块目录
│   ├── config/
│   │   ├── database.js       # MySQL 连接配置
│   │   └── redis.js          # Redis 连接配置
│   ├── models/
│   │   └── index.js          # Sequelize 模型定义
│   ├── services/
│   │   ├── articleService.js # 文章业务逻辑
│   │   ├── authService.js    # 认证业务逻辑
│   │   └── cacheService.js   # 缓存服务层
│   └── middleware/
│       ├── auth.js           # 认证授权中间件
│       └── rateLimiter.js    # 接口限流中间件
├── scripts/
│   └── migrate.js            # 数据库迁移脚本
└── uploads/                  # 文件上传存储目录
```

## API 接口清单

### 用户认证接口

| 方法 | 路径 | 描述 | 限流策略 |
|------|------|------|----------|
| POST | /api/auth/register | 用户注册 | 15分钟10次 |
| POST | /api/auth/login | 用户登录 | 15分钟10次 |
| GET | /api/auth/me | 获取当前用户信息 | 需要认证 |
| PUT | /api/auth/me | 更新用户信息 | 需要认证 |

### 文章管理接口

| 方法 | 路径 | 描述 | 权限要求 |
|------|------|------|----------|
| GET | /api/articles | 获取文章列表（分页、筛选） | 公开访问 |
| GET | /api/articles/:id | 获取文章详情 | 公开访问 |
| POST | /api/articles | 创建新文章 | 需要登录 |
| PUT | /api/articles/:id | 更新文章 | 作者或管理员 |
| DELETE | /api/articles/:id | 删除文章 | 作者或管理员 |
| GET | /api/my/articles | 获取我的文章列表 | 需要登录 |

### 文件与 AI 接口

| 方法 | 路径 | 描述 | 限流策略 |
|------|------|------|----------|
| POST | /api/upload/cover | 上传文章封面图 | 每小时20次 |
| POST | /api/ai/generate | AI 内容生成 | 每分钟10次 |
| GET | /api/health | 服务健康检查 | 无限制 |
