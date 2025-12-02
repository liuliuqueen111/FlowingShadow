
import { Article, ArticleStatus, SSRResponse, CacheLayer, RenderStrategy, SystemConfig, Tag } from '../types';

/**
 * 多级缓存: L1 (Memory) -> L2 (Redis) -> L4 (MySQL)
 */

const STORAGE_KEY = 'ssr_blog_db_v3';

let systemConfig: SystemConfig = {
  redisOnline: true,
  dbOnline: true,
  userType: 'USER_FAST'
};

export const updateSystemConfig = (config: Partial<SystemConfig>) => {
  systemConfig = { ...systemConfig, ...config };
};

export const getSystemConfig = () => systemConfig;

//  Layer 1: Memory Cache 
const l1Cache = new Map<string, { data: any; expires: number }>();
const L1_TTL = 5000; // 5 seconds very hot cache

//  Layer 2: Redis Simulation 
const redisStore = new Map<string, { data: any; expires: number }>();
const REDIS_TTL = 30000; // 30 seconds

//  Layer 3: Static File (Simulated by a separate storage key) 
const simulateLatency = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

//  Cache Managers 

const getL1 = (key: string) => {
  const cached = l1Cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  return null;
};

const getL2 = async (key: string) => {
  if (!systemConfig.redisOnline) return null; // Circuit Breaker
  await simulateLatency(5); // Fast network
  const cached = redisStore.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  return null;
};

const setL1 = (key: string, data: any) => l1Cache.set(key, { data, expires: Date.now() + L1_TTL });
const setL2 = (key: string, data: any) => {
  if (systemConfig.redisOnline) {
    redisStore.set(key, { data, expires: Date.now() + REDIS_TTL });
  }
};

const invalidateCache = (pattern: string) => {
  // Clear L1
  for (const key of l1Cache.keys()) if (key.includes(pattern)) l1Cache.delete(key);
  // Clear L2
  if (systemConfig.redisOnline) {
    for (const key of redisStore.keys()) if (key.includes(pattern)) redisStore.delete(key);
  }
};

// --- DB Operations ---

const getDB = (): Article[] => {
  if (!systemConfig.dbOnline) throw new Error("Connection Refused: MySQL is down.");
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return seedDB();
  }
  return JSON.parse(raw);
};

const seedDB = (): Article[] => {
  const seed: Article[] = [
    {
      id: '1',
      title: '从豆到杯的艺术旅程',
      excerpt: '在蒸汽与香气的交织中，探索咖啡豆从种植到萃取的完整旅程。不仅仅是饮品，更是生活哲学的载体。',
      content: '# 咖啡的诗意\n\n咖啡不仅仅是饮品，它是一场从土地到唇间的诗意旅程。\n\n## 豆子的故事\n\n每一颗咖啡豆都承载着阳光、雨露和匠人的心血。从埃塞俄比亚的高地到哥伦比亚的山谷，每一处产区都有独特的风土。\n\n```jsx\n// 咖啡的萃取艺术\n// 温度、水质、研磨度、时间\n// 每一环都影响最终的风味\n```\n\n## 萃取的哲学\n\n手冲咖啡像是一场冥想。我们不再急于结果，而是享受过程。热水缓缓注入粉层，香气逐渐绽放。\n\n> "咖啡如人生，需要耐心与温度。"',
      tags: ['咖啡', '品鉴', '生活方式'],
      category: '美食文化',
      coverImage: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      author: 'CoffeeLover',
      status: ArticleStatus.PUBLISHED,
      createdAt: Date.now() - 10000000,
      updatedAt: Date.now(),
      views: 3420
    },
    {
      id: '2',
      title: '传统中餐的现代演绎',
      excerpt: '当古老的烹饪技艺遇上现代审美，中餐如何在传承中创新，在创新中传承？',
      content: '# 月下食光\n\n中餐曾经是味蕾的盛宴。现在，它正在成为视觉与味觉的交响。\n\n## 食材的对话\n\n传统中餐讲究"五味调和"。酸甜苦辣咸，每一种味道都有其哲学内涵。\n\n1. **火候的艺术**：炒菜的每一秒都至关重要\n2. **配料的智慧**：葱姜蒜酒醋，调味的哲学\n3. **时令的尊重**：好食材永远遵循自然节律\n\n我们需要在传统与现代之间找到平衡。',
      tags: ['中餐', '烹饪', '文化传承'],
      category: '美食文化',
      coverImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      author: 'ChefWang',
      status: ArticleStatus.PUBLISHED,
      createdAt: Date.now() - 5000000,
      updatedAt: Date.now(),
      views: 1203
    },
    {
      id: '3',
      title: '手工甜点的艺术世界',
      excerpt: '探讨烘焙的温度控制，以及如何在厨房中创造出令人心醉的甜蜜魔法。',
      content: '# 甜蜜的魔法\n\n烘焙正在成为现代人的心灵寄托。\n\n## 温度的奥秘\n\n过高的温度会让蛋糕干硬，过低则无法蓬发。我们需要精确控制每一个环节。\n\n```css\n.perfect-cake {\n  temperature: 180°C;\n  time: 35min;\n  magic: love;\n}\n```\n\n## 创意的空间\n\n从经典的提拉米苏到分子料理的甜品，烘焙给了我们无限的创造可能。每一道甜品都是匠人的心血结晶。\n\n拥抱甜蜜，但不要被糖分征服。',
      tags: ['烘焙', '甜点', '创意料理'],
      category: '美食文化',
      coverImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      author: 'SweetArtist',
      status: ArticleStatus.PUBLISHED,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      views: 892
    }
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
};

// --- Strategy Resolver ---

const determineStrategy = (userType: SystemConfig['userType']): RenderStrategy => {
  if (userType === 'BOT') return 'SSR_FULL'; // 全量 SSR
  if (userType === 'USER_SLOW') return 'SSR_FULL'; // 慢网速
  return 'SSR_HYBRID'; // 快网速/登录用户，Shell + CSR
};

// Public API 

export const fetchArticles = async (page: number = 1, limit: number = 10, tag: string | null = null): Promise<SSRResponse<{ articles: Article[], total: number, totalPages: number }>> => {
  // Prefer real backend API when available (SSR server). Fallback to in-browser simulation.
  try {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (tag) params.append('tag', tag);

    const resp = await fetch(`/api/articles?${params}`, { headers });
    if (resp.ok) {
      const json = await resp.json();
      return json as SSRResponse<{ articles: Article[], total: number, totalPages: number }>;
    }
  } catch (e) {
    // network fail -> fallback to simulation below
  }

  const cacheKey = `articles_p${page}_l${limit}_t${tag || 'all'}`;
  const start = Date.now();

  // Strategy Decision
  const strategy = determineStrategy(systemConfig.userType);
  
  // L1 Cache
  const l1 = getL1(cacheKey);
  if (l1) return { data: l1, serverGeneratedTime: Date.now(), source: 'L1_MEMORY', latency: 0, renderStrategy: strategy, degraded: false };

  // L2 Cache
  const l2 = await getL2(cacheKey);
  if (l2) {
    setL1(cacheKey, l2); // Populate L1
    return { data: l2, serverGeneratedTime: Date.now(), source: 'L2_REDIS', latency: 5, renderStrategy: strategy, degraded: false };
  }

  try {
    await simulateLatency(systemConfig.dbOnline ? 300 : 100); // DB latency simulation
    const all = getDB();
    let published = all.filter(a => a.status === ArticleStatus.PUBLISHED).sort((a, b) => b.createdAt - a.createdAt);
    
    // 标签筛选
    if (tag) {
      published = published.filter(a => a.tags && a.tags.some(t => t === tag || String(t).toLowerCase().includes(tag.toLowerCase())));
    }
    
    const total = published.length;
    const totalPages = Math.ceil(total / limit);
    const result = { 
      articles: published.slice((page - 1) * limit, page * limit), 
      total,
      totalPages
    };

    setL1(cacheKey, result);
    setL2(cacheKey, result);

    return { 
      data: result, 
      serverGeneratedTime: Date.now(), 
      source: 'L4_DB', 
      latency: Date.now() - start,
      renderStrategy: strategy,
      degraded: false
    };

  } catch (e) {
    return { 
      data: { articles: [], total: 0, totalPages: 0 }, 
      serverGeneratedTime: Date.now(), 
      source: 'NONE', 
      latency: Date.now() - start, 
      renderStrategy: 'CSR_FALLBACK',
      degraded: true,
      error: "Service Degradation: Database Unavailable"
    };
  }
};

// 获取标签列表
export const fetchTags = async (): Promise<Tag[]> => {
  // 调用后端 API
  try {
    const resp = await fetch('/api/tags');
    if (resp.ok) {
      const json = await resp.json();
      return json.data || [];
    }
  } catch (e) {
    // fallback to simulation
  }

  // 文章中提取标签
  try {
    const all = getDB();
    const tagMap = new Map<string, number>();
    
    all.forEach(article => {
      if (article.tags && article.status === ArticleStatus.PUBLISHED) {
        article.tags.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      }
    });
    
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    return Array.from(tagMap.entries()).map(([name, count], index) => ({
      id: name,
      name,
      count,
      color: colors[index % colors.length]
    }));
  } catch (e) {
    return [];
  }
};

export const fetchArticleById = async (id: string): Promise<SSRResponse<Article>> => {
  // Try backend API first
  try {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const resp = await fetch(`/api/articles/${id}`, { headers });
    if (resp.ok) {
      const json = await resp.json();
      return json as SSRResponse<Article>;
    }
  } catch (e) {
    // fallthrough to simulated path
  }

  const cacheKey = `article_${id}`;
  const start = Date.now();
  const strategy = determineStrategy(systemConfig.userType);

  // L1
  const l1 = getL1(cacheKey);
  if (l1) return { data: l1, serverGeneratedTime: Date.now(), source: 'L1_MEMORY', latency: 0, renderStrategy: strategy, degraded: false };

  // L2
  const l2 = await getL2(cacheKey);
  if (l2) {
    setL1(cacheKey, l2);
    return { data: l2, serverGeneratedTime: Date.now(), source: 'L2_REDIS', latency: 8, renderStrategy: strategy, degraded: false };
  }

  try {
    await simulateLatency(300);
    const all = getDB();
    const article = all.find(a => a.id === id);
    
    if (!article) throw new Error("Not Found");

    article.views++;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    setL1(cacheKey, article);
    setL2(cacheKey, article);

    return { 
      data: article, 
      serverGeneratedTime: Date.now(), 
      source: 'L4_DB', 
      latency: Date.now() - start,
      renderStrategy: strategy,
      degraded: false
    };

  } catch (e) {
    return {
      data: null,
      serverGeneratedTime: Date.now(),
      source: 'NONE',
      latency: Date.now() - start,
      renderStrategy: 'CSR_FALLBACK',
      degraded: true,
      error: "Service Degradation: Content Unavailable"
    };
  }
};

export const saveArticle = async (article: Partial<Article>, authorId?: number): Promise<void> => {
  // Try server API first
  try {
    const token = localStorage.getItem('auth_token');
    const url = article.id ? `/api/articles/${article.id}` : `/api/articles`;
    const method = article.id ? 'PUT' : 'POST';
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const resp = await fetch(url, { 
      method, 
      headers, 
      body: JSON.stringify({ ...article, author_id: authorId }) 
    });
    if (resp.ok) return;
    // 如果后端返回非 OK，尝试解析错误信息并抛出，便于上层捕获并显示
    let errMsg = `Request failed with status ${resp.status}`;
    try {
      const json = await resp.json();
      if (json && json.error) errMsg = json.error;
      else if (json && json.message) errMsg = json.message;
    } catch (e) {
      try {
        const text = await resp.text();
        if (text) errMsg = text;
      } catch (_e) {}
    }
    throw new Error(errMsg);
  } catch (e) {
    // fallback to local simulation below
  }

  if (!systemConfig.dbOnline) throw new Error("Cannot save: Database is offline");
  
  await simulateLatency(500);
  const all = getDB();
  
  if (article.id) {
    const idx = all.findIndex(a => a.id === article.id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...article, updatedAt: Date.now() } as Article;
    }
  } else {
    all.push({
      ...article,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      views: 0,
      author: 'ShadowMaster',
      category: article.category || '技术',
      coverImage: article.coverImage || `/uploads/cover-1764388383541-81817492.jpg`
    } as Article);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  invalidateCache('article'); 
  invalidateCache('articles'); 
};

export const deleteArticle = async (id: string): Promise<void> => {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const resp = await fetch(`/api/articles/${id}`, { method: 'DELETE', headers });
    if (resp.ok) return;
  } catch (e) {
    // fallback
  }

  if (!systemConfig.dbOnline) throw new Error("Database offline");
  await simulateLatency(300);
  const all = getDB().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  invalidateCache('article');
};
