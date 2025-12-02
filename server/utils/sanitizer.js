/**
 * HTML 实体编码映射
 */
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

export const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
};

/**
 * 移除危险的 HTML 标签和属性
 */
export const sanitizeHtml = (html) => {
  if (typeof html !== 'string') return html;
  
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除 style 标签
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // 移除 iframe 标签
  clean = clean.replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '');
  
  // 移除 object 和 embed 标签
  clean = clean.replace(/<object\b[^>]*>.*?<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^>]*\/?>/gi, '');
  
  // 移除事件处理属性 (onclick, onerror, onload 等)
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // 移除 javascript
  clean = clean.replace(/javascript\s*:/gi, '');
  
  // 移除 data
  clean = clean.replace(/data\s*:\s*(?!image\/(png|jpeg|jpg|gif|webp|svg\+xml))[^"'\s>]*/gi, '');
  
  // 移除 vbscript
  clean = clean.replace(/vbscript\s*:/gi, '');
  
  // 移除 expression()
  clean = clean.replace(/expression\s*\([^)]*\)/gi, '');
  
  return clean;
};

/**
 * 清理 Markdown 内容
 */
export const sanitizeMarkdown = (markdown) => {
  if (typeof markdown !== 'string') return markdown;
  
  let clean = markdown;
  
  // 移除 HTML script 
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除 HTML style
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // 移除 iframe
  clean = clean.replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '');
  
  // 移除事件处理属性
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // 移除 javascript
  clean = clean.replace(/\[([^\]]*)\]\(javascript:[^)]*\)/gi, '[$1](#)');
  
  // 移除 data
  clean = clean.replace(/\[([^\]]*)\]\(data:(?!image\/)[^)]*\)/gi, '[$1](#)');
  
  return clean;
};

/**
 * 清理文章数据对象
 */
export const sanitizeArticleData = (articleData) => {
  const sanitized = { ...articleData };
  
  // 清理标题 
  if (sanitized.title) {
    sanitized.title = sanitized.title.trim();
  }
  
  // 清理摘要 
  if (sanitized.excerpt) {
    sanitized.excerpt = sanitized.excerpt.trim();
  }
  
  // 清理内容 
  if (sanitized.content) {
    sanitized.content = sanitizeMarkdown(sanitized.content);
  }
  
  // 清理标签 
  if (sanitized.tags && Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags
      .filter(tag => typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .slice(0, 10); // 最多 10 个标签
  }
  
  // 验证封面图片 URL
  if (sanitized.coverImage) {
    const url = sanitized.coverImage.trim();
    // 只允许相对路径或 http/https URL
    if (!url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://')) {
      delete sanitized.coverImage;
    } else {
      sanitized.coverImage = url;
    }
  }
  
  return sanitized;
};

/**
 * 清理用户输入数据
 */
export const sanitizeUserData = (userData) => {
  const sanitized = { ...userData };
  
  if (sanitized.username) {
    sanitized.username = escapeHtml(sanitized.username.trim());
  }
  
  if (sanitized.avatar) {
    const url = sanitized.avatar.trim();
    if (!url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://')) {
      delete sanitized.avatar;
    } else {
      sanitized.avatar = url;
    }
  }
  
  return sanitized;
};

/**
 * 生成内容的 ETag
 */
export const generateETag = (content) => {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  // 简单的哈希算法
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
};


export const checkETagMatch = (req, etag) => {
  const ifNoneMatch = req.headers['if-none-match'];
  if (!ifNoneMatch) return false;
  
  // 支持多个 ETag 值
  const tags = ifNoneMatch.split(',').map(tag => tag.trim());
  return tags.includes(etag) || tags.includes('*');
};

export default {
  escapeHtml,
  sanitizeHtml,
  sanitizeMarkdown,
  sanitizeArticleData,
  sanitizeUserData,
  generateETag,
  checkETagMatch
};
