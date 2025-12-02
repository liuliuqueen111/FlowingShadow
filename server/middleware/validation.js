/**
 * 使用 express-validator 请求参数验证
 */

import { body, param, query, validationResult } from 'express-validator';


export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      error: '输入验证失败',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};


export const validateArticleCreate = [
  body('title')
    .trim()
    .notEmpty().withMessage('标题不能为空')
    .isLength({ min: 1, max: 200 }).withMessage('标题长度必须在 1-200 个字符之间'),
  // 注意：不使用 escape()，因为会破坏中文等字符，sanitizer 会单独处理 XSS
  
  body('content')
    .notEmpty().withMessage('内容不能为空')
    .isLength({ min: 1 }).withMessage('内容不能为空'),
  
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('摘要不能超过 500 个字符'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('标签必须是数组且最多 10 个')
    .custom((tags) => {
      if (tags && tags.some(tag => typeof tag !== 'string' || tag.length > 50)) {
        throw new Error('每个标签必须是字符串且长度不超过 50 个字符');
      }
      return true;
    }),
  
  body('categoryId')
    .optional()
    .isInt({ min: 1 }).withMessage('分类 ID 必须是正整数'),
  
  body('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED']).withMessage('状态必须是 DRAFT 或 PUBLISHED'),
  
  body('coverImage')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('封面图片 URL 不能超过 500 个字符')
    .custom((url) => {
      if (url && !url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('封面图片必须是有效的 URL 或相对路径');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * 文章更新验证规则
 */
export const validateArticleUpdate = [
  param('id')
    .isInt({ min: 1 }).withMessage('文章 ID 必须是正整数'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('标题长度必须在 1-200 个字符之间'),
  // 注意：不使用 escape()，sanitizer 会单独处理 XSS
  
  body('content')
    .optional()
    .isLength({ min: 1 }).withMessage('内容不能为空'),
  
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('摘要不能超过 500 个字符'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('标签必须是数组且最多 10 个')
    .custom((tags) => {
      if (tags && tags.some(tag => typeof tag !== 'string' || tag.length > 50)) {
        throw new Error('每个标签必须是字符串且长度不超过 50 个字符');
      }
      return true;
    }),
  
  body('categoryId')
    .optional()
    .isInt({ min: 1 }).withMessage('分类 ID 必须是正整数'),
  
  body('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('状态必须是 DRAFT、PUBLISHED 或 ARCHIVED'),
  
  handleValidationErrors
];

/**
 * 文章删除验证规则
 */
export const validateArticleDelete = [
  param('id')
    .isInt({ min: 1 }).withMessage('文章 ID 必须是正整数'),
  
  query('hard')
    .optional()
    .isIn(['true', 'false']).withMessage('hard 参数必须是 true 或 false'),
  
  handleValidationErrors
];

/**
 * 批量删除验证规则
 */
export const validateBatchDelete = [
  body('ids')
    .isArray({ min: 1, max: 100 }).withMessage('ids 必须是包含 1-100 个元素的数组')
    .custom((ids) => {
      if (ids.some(id => !Number.isInteger(id) || id < 1)) {
        throw new Error('每个 ID 必须是正整数');
      }
      return true;
    }),
  
  body('hard')
    .optional()
    .isBoolean().withMessage('hard 参数必须是布尔值'),
  
  handleValidationErrors
];

/**
 * 分页查询验证规则
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page 必须是正整数'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit 必须是 1-100 之间的整数'),
  
  query('category')
    .optional()
    .isInt({ min: 1 }).withMessage('category 必须是正整数'),
  
  query('tag')
    .optional()
    .isInt({ min: 1 }).withMessage('tag 必须是正整数'),
  
  query('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('status 必须是有效的状态值'),
  
  handleValidationErrors
];

/**
 * 用户注册验证规则
 */
export const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('用户名不能为空')
    .isLength({ min: 2, max: 50 }).withMessage('用户名长度必须在 2-50 个字符之间')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/).withMessage('用户名只能包含字母、数字、下划线和中文')
    .escape(),
  
  body('email')
    .trim()
    .notEmpty().withMessage('邮箱不能为空')
    .isEmail().withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6, max: 100 }).withMessage('密码长度必须在 6-100 个字符之间')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/).withMessage('密码必须包含字母和数字'),
  
  handleValidationErrors
];

/**
 * 用户登录验证规则
 */
export const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('用户名不能为空'),
  
  body('password')
    .notEmpty().withMessage('密码不能为空'),
  
  handleValidationErrors
];

/**
 * AI 验证
 */
export const validateAIGenerate = [
  body('type')
    .notEmpty().withMessage('类型不能为空')
    .isIn(['TITLE', 'SUMMARY', 'POLISH', 'CONTINUE', 'SEO_OPTIMIZE', 'TAG_GENERATE'])
    .withMessage('类型必须是有效的 AI 生成类型'),
  
  body('prompt')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('提示词不能超过 2000 个字符'),
  
  body('context')
    .optional()
    .isLength({ max: 10000 }).withMessage('上下文不能超过 10000 个字符'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('标签必须是数组且最多 10 个'),
  
  handleValidationErrors
];

export default {
  handleValidationErrors,
  validateArticleCreate,
  validateArticleUpdate,
  validateArticleDelete,
  validateBatchDelete,
  validatePagination,
  validateRegister,
  validateLogin,
  validateAIGenerate
};
