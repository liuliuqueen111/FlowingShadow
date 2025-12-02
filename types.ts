
export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED'
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  category: string;
  coverImage?: string;
  author: string;
  status: ArticleStatus;
  createdAt: number;
  updatedAt: number;
  views: number;
  readingProgress?: number; // 客户端特有：阅读进度 0-100
}

export type RenderStrategy = 'SSR_FULL' | 'SSR_HYBRID' | 'CSR_FALLBACK' | 'STATIC_CACHE';

export type CacheLayer = 'L1_MEMORY' | 'L2_REDIS' | 'L3_STATIC' | 'L4_DB' | 'NONE';

// Simulated Server Response for SSR hydration
export interface SSRResponse<T> {
  data: T | null;
  serverGeneratedTime: number;
  source: CacheLayer;
  renderStrategy: RenderStrategy;
  latency: number;
  error?: string;
  degraded: boolean; // 是否处于降级模式
}

export interface AICompletionRequest {
  prompt: string;
  context?: string;
  tags?: string[];
  type: 'TITLE' | 'SUMMARY' | 'POLISH' | 'CONTINUE' | 'SEO_OPTIMIZE' | 'TAG_GENERATE';
}

export interface SystemConfig {
  redisOnline: boolean;
  dbOnline: boolean;
  userType: 'BOT' | 'USER_FAST' | 'USER_SLOW'; // 模拟不同用户以触发混合渲染
}

// 标签类型
export interface Tag {
  id: number | string;
  name: string;
  slug?: string;
  color?: string;
  count?: number;
}
