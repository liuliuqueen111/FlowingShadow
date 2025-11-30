-- ============================================
-- SSR Blog 数据库建表语句
-- 数据库: MySQL 8.0+
-- 字符集: utf8mb4
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS ssr_blog
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ssr_blog;

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  role ENUM('admin', 'editor', 'user') DEFAULT 'user',
  status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username),
  UNIQUE KEY uk_email (email),
  KEY idx_role (role),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 分类表
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description VARCHAR(200) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name),
  UNIQUE KEY uk_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 标签表
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name),
  UNIQUE KEY uk_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 文章表
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) DEFAULT NULL,
  excerpt TEXT DEFAULT NULL,
  content LONGTEXT NOT NULL,
  cover_image VARCHAR(500) DEFAULT NULL,
  status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
  views INT UNSIGNED DEFAULT 0,
  likes INT UNSIGNED DEFAULT 0,
  author_id INT UNSIGNED DEFAULT NULL,
  category_id INT UNSIGNED DEFAULT NULL,
  is_deleted TINYINT(1) DEFAULT 0,
  published_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_slug (slug),
  KEY idx_status (status),
  KEY idx_author_id (author_id),
  KEY idx_category_id (category_id),
  KEY idx_published_at (published_at),
  KEY idx_is_deleted (is_deleted),
  FULLTEXT KEY ft_title_content (title, content),
  CONSTRAINT fk_article_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_article_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 文章-标签关联表（多对多）
-- ============================================
CREATE TABLE IF NOT EXISTS article_tags (
  article_id INT UNSIGNED NOT NULL,
  tag_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  KEY idx_tag_id (tag_id),
  CONSTRAINT fk_at_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
  CONSTRAINT fk_at_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 索引说明
-- ============================================
-- 1. users 表：
--    - uk_username: 用户名唯一索引，用于登录查询
--    - uk_email: 邮箱唯一索引，用于注册验证
--
-- 2. articles 表：
--    - idx_status: 状态索引，用于筛选已发布/草稿文章
--    - idx_published_at: 发布时间索引，用于时间排序
--    - ft_title_content: 全文索引，用于搜索功能
--
-- 3. article_tags 表：
--    - 复合主键 (article_id, tag_id): 保证关联唯一性
--    - idx_tag_id: 标签索引，用于按标签查询文章
