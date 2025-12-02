/**
 * 标签种子数据脚本
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sequelize, Tag } from '../server/models/index.js';

// 预设标签数据
const presetTags = [
  { name: '科技', slug: 'tech', color: '#3b82f6' },
  { name: '随笔', slug: 'essay', color: '#8b5cf6' },
  { name: '校园', slug: 'campus', color: '#10b981' },
  { name: '文艺', slug: 'art', color: '#ec4899' },
  { name: '美食', slug: 'food', color: '#f59e0b' },
  { name: '运动', slug: 'sports', color: '#ef4444' },
  { name: '旅行', slug: 'travel', color: '#06b6d4' },
  { name: '音乐', slug: 'music', color: '#a855f7' },
  { name: '电影', slug: 'movie', color: '#6366f1' },
  { name: '游戏', slug: 'gaming', color: '#22c55e' },
  { name: '读书', slug: 'reading', color: '#f97316' },
  { name: '摄影', slug: 'photography', color: '#14b8a6' },
  { name: '职场', slug: 'career', color: '#64748b' },
  { name: '情感', slug: 'emotion', color: '#f43f5e' },
  { name: '生活', slug: 'lifestyle', color: '#84cc16' },
];

async function seedTags() {
  console.log('开始插入预设标签...\n');

  try {
    await sequelize.authenticate();
    console.log('数据库连接成功\n');

    let created = 0;
    let skipped = 0;

    for (const tagData of presetTags) {
      // 检查是否已存在
      const existing = await Tag.findOne({ where: { name: tagData.name } });
      if (existing) {
        console.log(`   标签 "${tagData.name}" 已存在，跳过`);
        skipped++;
      } else {
        await Tag.create(tagData);
        console.log(`   创建标签 "${tagData.name}"`);
        created++;
      }
    }


  } catch (error) {
    console.error('标签插入失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedTags();
