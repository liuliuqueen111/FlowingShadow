/**
 * 数据库迁移脚本
 * 运行: npm run db:migrate
 */

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sequelize, User, Category, Tag } from '../server/models/index.js';
import bcrypt from 'bcrypt';

async function migrate() {
  console.log('🚀 开始数据库迁移...\n');

  try {
    // 测试连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');

    // 同步所有模型（开发环境可用 alter: true，生产环境建议使用专门的迁移工具）
    await sequelize.sync({ alter: true });
    
    console.log('✅ 数据表同步完成\n');

    // 创建默认数据
    await createDefaultData();
    
    console.log('📋 已创建的表:');
    console.log('   - users (用户表)');
    console.log('   - categories (分类表)');
    console.log('   - tags (标签表)');
    console.log('   - articles (文章表)');
    console.log('   - article_tags (文章-标签关联表)\n');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

async function createDefaultData() {
  console.log('🌱 创建默认数据...\n');

  // 创建默认管理员用户
  const adminExists = await User.findOne({ where: { username: 'admin' } });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password_hash: hashedPassword,
      role: 'admin',
      status: 'active'
    });
    console.log('   ✅ 创建管理员用户: admin / admin123');
  } else {
    console.log('   ℹ️ 管理员用户已存在');
  }

  // 创建默认分类
  const categories = [
    { name: '技术深度', slug: 'tech', description: '技术深度文章' },
    { name: '随笔', slug: 'essays', description: '个人随笔' },
    { name: '设计美学', slug: 'design', description: '设计相关内容' },
    { name: '人工智能', slug: 'ai', description: 'AI 相关内容' },
    { name: '前端架构', slug: 'frontend', description: '前端架构讨论' }
  ];

  for (const cat of categories) {
    try {
      const [category, created] = await Category.findOrCreate({
        where: { slug: cat.slug },
        defaults: cat
      });
      if (created) {
        console.log(`   ✅ 创建分类: ${cat.name}`);
      } else {
        console.log(`   ℹ️ 分类已存在: ${cat.name}`);
      }
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log(`   ℹ️ 分类已存在 (跳过): ${cat.name}`);
      } else {
        throw error;
      }
    }
  }

  // 创建默认标签
  const tags = [
    { name: 'React', slug: 'react', color: '#61dafb' },
    { name: 'JavaScript', slug: 'javascript', color: '#f7df1e' },
    { name: 'TypeScript', slug: 'typescript', color: '#3178c6' },
    { name: 'Node.js', slug: 'nodejs', color: '#339933' },
    { name: 'AI', slug: 'ai', color: '#ff6b6b' },
    { name: '设计', slug: 'design', color: '#9c88ff' },
    { name: '性能优化', slug: 'performance', color: '#00b894' }
  ];

  for (const tagData of tags) {
    try {
      const [tag, created] = await Tag.findOrCreate({
        where: { slug: tagData.slug },
        defaults: tagData
      });
      if (created) {
        console.log(`   ✅ 创建标签: ${tagData.name}`);
      } else {
        console.log(`   ℹ️ 标签已存在: ${tagData.name}`);
      }
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log(`   ℹ️ 标签已存在 (跳过): ${tagData.name}`);
      } else {
        throw error;
      }
    }
  }

  console.log('✅ 默认数据创建完成\n');
}

migrate();
