/**
 * 数据库种子脚本
 * 运行: npm run db:seed
 */

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sequelize, User, Category, Tag, Article, ArticleTag } from '../server/models/index.js';

const seedData = {
  users: [],
  categories: [],
  tags: [],
  articles: []
};

// 如果没有任何 seed 数据，则退出脚本，避免误删数据库中的现有数据
if ((seedData.users.length === 0) && (seedData.categories.length === 0) && (seedData.tags.length === 0) && (seedData.articles.length === 0)) {
  console.log('No seed data provided. Aborting seed script to avoid accidental data deletion.');
  process.exit(0);
}

async function seed() {
  console.log('🌱 开始填充种子数据...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');

    // 清空现有数据（按依赖顺序）
    console.log('🗑️ 清空现有数据...');
    await ArticleTag.destroy({ where: {} });
    await Article.destroy({ where: {} });
    await Tag.destroy({ where: {} });
    await Category.destroy({ where: {} });
    await User.destroy({ where: {} });

    // 插入用户
    console.log('👤 创建用户...');
    const users = await User.bulkCreate(seedData.users);
    console.log(`   创建了 ${users.length} 个用户`);

    // 插入分类
    console.log('📁 创建分类...');
    const categories = await Category.bulkCreate(seedData.categories);
    console.log(`   创建了 ${categories.length} 个分类`);

    // 插入标签
    console.log('🏷️ 创建标签...');
    const tags = await Tag.bulkCreate(seedData.tags);
    const tagMap = {};
    tags.forEach(t => tagMap[t.name] = t.id);
    console.log(`   创建了 ${tags.length} 个标签`);

    // 插入文章
    console.log('📝 创建文章...');
    for (const articleData of seedData.articles) {
      const { tags: tagNames, ...data } = articleData;
      data.published_at = new Date();
      
      const article = await Article.create(data);
      
      // 关联标签
      if (tagNames && tagNames.length > 0) {
        const tagIds = tagNames.map(name => tagMap[name]).filter(Boolean);
        await ArticleTag.bulkCreate(tagIds.map(tagId => ({
          article_id: article.id,
          tag_id: tagId
        })));
      }
    }
    console.log(`   创建了 ${seedData.articles.length} 篇文章`);

    console.log('\n✅ 种子数据填充完成！');

  } catch (error) {
    console.error('❌ 种子数据填充失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
