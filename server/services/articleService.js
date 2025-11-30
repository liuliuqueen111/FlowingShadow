/**
 * 文章服务
 */

import { Article, Tag, Category, User, ArticleTag, sequelize } from '../models/index.js';
import cacheService from './cacheService.js';
import redisConfig from '../config/redis.js';
import { Op } from 'sequelize';

class ArticleService {

  async getList({ page = 1, limit = 10, category, tag, status, authorId }) {
  
    const effectiveStatus = authorId && status === undefined ? null : (status || 'PUBLISHED');
    
    const cacheKey = `articles:list:p${page}:l${limit}:c${category || 'all'}:t${tag || 'all'}:s${effectiveStatus || 'all'}:a${authorId || 'all'}`;
    
    // 尝试从缓存获取
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, source: 'L2_REDIS' };
    }

    try {
      const where = { is_deleted: false };
      // 只有明确指定了状态才添加状态过滤
      if (effectiveStatus) where.status = effectiveStatus;
      if (category) where.category_id = category;
      if (authorId) where.author_id = authorId;

      const include = [
        { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Tag, as: 'tags', attributes: ['id', 'name', 'slug', 'color'], through: { attributes: [] } }
      ];

      // 如果按标签筛选
      if (tag) {
        include[2].where = { id: tag };
        include[2].required = true;
      }

      const { count, rows } = await Article.findAndCountAll({
        where,
        include,
        order: [['published_at', 'DESC'], ['created_at', 'DESC']],
        limit,
        offset: (page - 1) * limit,
        distinct: true
      });

      const result = {
        articles: rows.map(this.formatArticle),
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };

      // 写入缓存
      await cacheService.set(cacheKey, result, redisConfig.ttl.articleList);

      return { ...result, source: 'L4_DB' };
    } catch (error) {
      console.error('获取文章列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取文章详情
   */
  async getById(id) {
    const cacheKey = `article:${id}`;

    // 从缓存获取
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { data: cached, source: 'L2_REDIS' };
    }

    try {
      const article = await Article.findOne({
        where: { id, is_deleted: false },
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
          { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
          { model: Tag, as: 'tags', attributes: ['id', 'name', 'slug', 'color'], through: { attributes: [] } }
        ]
      });

      if (!article) {
        return { data: null, source: 'L4_DB' };
      }

      const formatted = this.formatArticle(article);

      // 写入缓存
      await cacheService.set(cacheKey, formatted, redisConfig.ttl.articleDetail);

      return { data: formatted, source: 'L4_DB' };
    } catch (error) {
      console.error('获取文章详情失败:', error);
      throw error;
    }
  }

  /**
   * 增加阅读量
   */
  async incrementViews(id) {
    try {
      await Article.increment('views', { where: { id } });
      // 可以延迟更新
    } catch (error) {
      console.error('增加阅读量失败:', error);
    }
  }

  /**
   * 创建文章
   */
  async create(data) {
    const transaction = await sequelize.transaction();

    try {
      // 生成 slug
      const slug = data.slug || this.generateSlug(data.title);

      const article = await Article.create({
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        cover_image: data.coverImage || '/uploads/cover-1764388383541-81817492.jpg',
        status: data.status || 'DRAFT',
        author_id: data.author_id,
        category_id: data.categoryId,
        published_at: data.status === 'PUBLISHED' ? new Date() : null
      }, { transaction });

      // 处理标签
      if (data.tags && data.tags.length > 0) {
        await this.syncTags(article.id, data.tags, transaction);
      }

      await transaction.commit();

      // 失效列表缓存
      await cacheService.invalidateArticleList();

      return { id: article.id };
    } catch (error) {
      await transaction.rollback();
      console.error('创建文章失败:', error);
      throw error;
    }
  }

  /**
   * 更新文章
   */
  async update(id, data) {
    const transaction = await sequelize.transaction();

    try {
      const article = await Article.findByPk(id);
      if (!article) {
        throw new Error('文章不存在');
      }

      const updateData = {
        title: data.title ?? article.title,
        excerpt: data.excerpt ?? article.excerpt,
        content: data.content ?? article.content,
        cover_image: data.coverImage ?? article.cover_image,
        status: data.status ?? article.status,
        category_id: data.categoryId ?? article.category_id
      };

      // 更新发布时间
      if (data.status === 'PUBLISHED' && article.status !== 'PUBLISHED') {
        updateData.published_at = new Date();
      }

      await article.update(updateData, { transaction });

      // 处理标签
      if (data.tags) {
        await this.syncTags(id, data.tags, transaction);
      }

      await transaction.commit();

      // 失效缓存
      await cacheService.invalidateArticle(id);

      return { ok: true };
    } catch (error) {
      await transaction.rollback();
      console.error('更新文章失败:', error);
      throw error;
    }
  }

  /**
   * 删除文章
   */
  async delete(id, hard = false) {
    try {
      if (hard) {
        // 物理
        await ArticleTag.destroy({ where: { article_id: id } });
        await Article.destroy({ where: { id } });
      } else {
        // 逻辑
        await Article.update({ is_deleted: true }, { where: { id } });
      }

      // 失效缓存
      await cacheService.invalidateArticle(id);

      return { ok: true };
    } catch (error) {
      console.error('删除文章失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除文章
   */
  async batchDelete(ids, hard = false) {
    try {
      if (hard) {
        await ArticleTag.destroy({ where: { article_id: { [Op.in]: ids } } });
        await Article.destroy({ where: { id: { [Op.in]: ids } } });
      } else {
        await Article.update({ is_deleted: true }, { where: { id: { [Op.in]: ids } } });
      }

      // 失效所有相关缓存
      for (const id of ids) {
        await cacheService.del(`article:${id}`);
      }
      await cacheService.invalidateArticleList();

      return { ok: true, count: ids.length };
    } catch (error) {
      console.error('批量删除文章失败:', error);
      throw error;
    }
  }

  /**
   * 同步文章标签
   */
  async syncTags(articleId, tagNames, transaction) {
    // 先删除旧关联
    await ArticleTag.destroy({ where: { article_id: articleId }, transaction });

    if (!tagNames || tagNames.length === 0) return;

    // 查找或创建标签
    const tagIds = [];
    for (const name of tagNames) {
      const [tag] = await Tag.findOrCreate({
        where: { name },
        defaults: { name, slug: this.generateSlug(name) },
        transaction
      });
      tagIds.push(tag.id);
    }

    // 创建新关联
    const relations = tagIds.map(tagId => ({
      article_id: articleId,
      tag_id: tagId
    }));
    await ArticleTag.bulkCreate(relations, { transaction });
  }

  /**
   * 格式化文章输出
   */
  formatArticle(article) {
    const data = article.toJSON ? article.toJSON() : article;
    return {
      id: String(data.id),
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.cover_image,
      status: data.status,
      views: data.views,
      likes: data.likes,
      author: data.author?.username || 'Anonymous',
      authorId: data.author_id || data.authorId,
      authorAvatar: data.author?.avatar,
      category: data.category?.name || '未分类',
      categoryId: data.category_id || data.categoryId,
      tags: data.tags?.map(t => t.name) || [],
      createdAt: (() => {
        const v = data.created_at ?? data.createdAt;
        const t = (typeof v === 'number') ? v : (v ? new Date(v).getTime() : NaN);
        return Number.isFinite(t) && t > 0 ? t : Date.now();
      })(),
      updatedAt: (() => {
        const v = data.updated_at ?? data.updatedAt;
        const t = (typeof v === 'number') ? v : (v ? new Date(v).getTime() : NaN);
        return Number.isFinite(t) && t > 0 ? t : Date.now();
      })(),
      publishedAt: (() => {
        const v = data.published_at ?? data.publishedAt;
        if (!v) return null;
        const t = (typeof v === 'number') ? v : new Date(v).getTime();
        return Number.isFinite(t) && t > 0 ? t : null;
      })()
    };
  }

  /**
   * 生成 slug
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100) + '-' + Date.now().toString(36);
  }
}

export default new ArticleService();
