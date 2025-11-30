/**
 * Sequelize 模型初始化与导出
 */

import { Sequelize, DataTypes } from 'sequelize';
import dbConfig from '../config/database.js';

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    define: config.define
  }
);

// ==================== 用户模型 ====================
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'editor', 'user'),
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active'
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['username'] },
    { fields: ['email'] }
  ]
});

// ==================== 标签模型 ====================
const Tag = sequelize.define('Tag', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  slug: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3b82f6'
  }
}, {
  tableName: 'tags'
});

// ==================== 分类模型 ====================
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  slug: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true
  }
}, {
  tableName: 'categories'
});

// ==================== 文章模型 ====================
const Article = sequelize.define('Article', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(200),
    allowNull: true,
    unique: true
  },
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  cover_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
    defaultValue: 'DRAFT'
  },
  views: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0
  },
  author_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  category_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'articles',
  indexes: [
    { fields: ['status'] },
    { fields: ['author_id'] },
    { fields: ['category_id'] },
    { fields: ['published_at'] },
    { fields: ['is_deleted'] },
    { type: 'FULLTEXT', fields: ['title', 'content'] }
  ]
});

// ==================== 文章-标签关联表 ====================
const ArticleTag = sequelize.define('ArticleTag', {
  article_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    references: {
      model: 'articles',
      key: 'id'
    }
  },
  tag_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    references: {
      model: 'tags',
      key: 'id'
    }
  }
}, {
  tableName: 'article_tags',
  timestamps: false
});

// ==================== 关联关系 ====================
// User -> Articles (一对多)
User.hasMany(Article, { foreignKey: 'author_id', as: 'articles' });
Article.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// Category -> Articles (一对多)
Category.hasMany(Article, { foreignKey: 'category_id', as: 'articles' });
Article.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Article <-> Tag (多对多)
Article.belongsToMany(Tag, { through: ArticleTag, foreignKey: 'article_id', as: 'tags' });
Tag.belongsToMany(Article, { through: ArticleTag, foreignKey: 'tag_id', as: 'articles' });

// 导出
export {
  sequelize,
  Sequelize,
  User,
  Tag,
  Category,
  Article,
  ArticleTag
};

export default sequelize;
