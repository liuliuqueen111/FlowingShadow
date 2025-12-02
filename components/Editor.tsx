
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Article, ArticleStatus, AICompletionRequest } from '../types';

interface Props {
  initialData?: Partial<Article>;
  onSave: (article: Partial<Article>) => Promise<void>;
  onCancel: () => void;
}

const Editor: React.FC<Props> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Article>>({
    title: '',
    excerpt: '',
    content: '',
    tags: [],
    category: '技术深度',
    coverImage: '',
    status: ArticleStatus.DRAFT,
    ...initialData
  });
  
  const [aiLoading, setAiLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeAITool, setActiveAITool] = useState<string | null>(null);
  const [seoReport, setSeoReport] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [showTitleSelector, setShowTitleSelector] = useState(false);
  const [availableTags, setAvailableTags] = useState<Array<{id: string; name: string; color: string}>>([]);
  const [loadingTags, setLoadingTags] = useState(true);

  // 加载预设标签
  React.useEffect(() => {
    const loadTags = async () => {
      try {
        const resp = await fetch('/api/tags');
        if (resp.ok) {
          const data = await resp.json();
          setAvailableTags(data.data || []);
        }
      } catch (e) {
        console.error('加载标签失败:', e);
      } finally {
        setLoadingTags(false);
      }
    };
    loadTags();
  }, []);
  
  // 表单验证状态
  const [errors, setErrors] = useState<{
    title?: string;
    content?: string;
  }>({});
  const [touched, setTouched] = useState<{
    title?: boolean;
    content?: boolean;
  }>({});

  // 验证规则
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    // 标题验证
    if (!formData.title?.trim()) {
      newErrors.title = '标题不能为空';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = '标题至少需要 2 个字符';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = '标题不能超过 200 个字符';
    }
    
    // 内容验证
    if (!formData.content?.trim()) {
      newErrors.content = '内容不能为空';
    } else if (formData.content.trim().length < 10) {
      newErrors.content = '内容至少需要 10 个字符';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 实时验证（当字段被触碰后）
  React.useEffect(() => {
    if (touched.title || touched.content) {
      validateForm();
    }
  }, [formData.title, formData.content, touched]);

  // 检查表单是否有效
  const isFormValid = () => {
    return formData.title?.trim() && 
           formData.title.trim().length >= 2 && 
           formData.content?.trim() && 
           formData.content.trim().length >= 10;
  };

  // 获取验证提示信息
  const getValidationSummary = () => {
    const issues: string[] = [];
    if (!formData.title?.trim()) {
      issues.push('请输入标题');
    } else if (formData.title.trim().length < 2) {
      issues.push('标题至少 2 个字符');
    }
    if (!formData.content?.trim()) {
      issues.push('请输入内容');
    } else if (formData.content.trim().length < 10) {
      issues.push(`内容还需 ${10 - formData.content.trim().length} 个字符`);
    }
    return issues;
  };

  const handleAI = async (type: AICompletionRequest['type']) => {
    setAiLoading(true);
    setActiveAITool(type);
    setSeoReport(null);

    try {
      let prompt = '';
      let context = '';
      
      // 根据不同类型组装提示词
      if (type === 'TITLE') {
        // 优先使用标题栏内容作为主题，其次用正文内容，最后用分类
        const titleHint = formData.title?.trim();
        const contentHint = formData.content?.substring(0, 500)?.trim();
        prompt = titleHint || contentHint || formData.category || "技术博客";
      }
      if (type === 'SUMMARY' || type === 'SEO_OPTIMIZE') {
        if (!formData.content?.trim()) {
          throw new Error('请先输入文章内容再使用此功能');
        }
        context = formData.content;
      }
      if (type === 'POLISH') {
        if (!formData.content?.trim()) {
          throw new Error('请先输入文章内容再进行润色');
        }
        prompt = formData.content;
      }
      if (type === 'CONTINUE') {
        if (!formData.content?.trim()) {
          throw new Error('请先输入一些内容，AI 才能帮你续写');
        }
        context = formData.content.substring(0, 1000);
        prompt = formData.content.slice(-300);
      }

      // 调用后端 AI API
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          prompt,
          context,
          tags: formData.tags
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI 服务请求失败 (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      if (!result.text) {
        throw new Error('AI 服务返回的数据格式不正确');
      }

      const aiResult = result.text;

      if (type === 'TITLE') {
         // 解析返回的标题列表
         const lines = aiResult.split('\n').filter(line => line.trim());
         const titles = lines.map(line => line.replace(/^\d+\.?\s*/, '').replace(/["《》]/g, '').trim()).filter(title => title);
         
         if (titles.length > 0) {
           setTitleSuggestions(titles);
           setShowTitleSelector(true);
         }
      } else if (type === 'SUMMARY') {
        setFormData(prev => ({ ...prev, excerpt: aiResult }));
      } else if (type === 'POLISH' || type === 'CONTINUE') {
        setFormData(prev => ({ ...prev, content: type === 'CONTINUE' ? (prev.content + '\n' + aiResult) : aiResult }));
      } else if (type === 'TAG_GENERATE') {
        setFormData(prev => ({ ...prev, content: aiResult }));
      } else if (type === 'SEO_OPTIMIZE') {
        setSeoReport(aiResult);
      }
    } catch (e: any) {
      console.error('AI 调用错误:', e);
      if (e.message && e.message.includes('Extension context invalidated')) {
        alert('AI 功能被浏览器扩展干扰，请尝试禁用翻译扩展或刷新页面重试。');
      } else {
        alert(`AI 错误: ${e.message}`);
      }
    } finally {
      setAiLoading(false);
      setActiveAITool(null);
    }
  };

  const { user, hasRole } = useAuth();

  const handleSave = async (publishNow: boolean = true) => {
    // 标记所有字段为已触碰
    setTouched({ title: true, content: true });
    
    // 验证表单
    if (!validateForm()) {
      return; // 验证失败，不提交
    }
    
    setIsSaving(true);
    try {
      // 如果是在编辑已有文章，先做客户端的 ownership 校验，避免 403
      if (initialData?.id) {
        const ownerId = (initialData as any).authorId || (initialData as any).author_id || null;
        if (ownerId && user && user.id !== ownerId && !hasRole('admin')) {
          alert('发布失败：你不是这篇文章的作者或管理员，无法编辑该文章。');
          return;
        }
      }
      // 发布设置状态为 PUBLISHED
      const saveData = {
        ...formData,
        status: publishNow ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT
      };
      await onSave(saveData);
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput && !formData.tags?.includes(tagInput)) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput] }));
      setTagInput('');
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小 
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setUploadingCover(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('cover', file);

      const response = await fetch('/api/upload/cover', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await response.json();

      if (result.ok) {
        setFormData(prev => ({ ...prev, coverImage: result.url }));
      } else {
        alert('上传失败: ' + result.error);
      }
    } catch (error) {
      console.error('上传错误:', error);
      alert('上传失败，请重试');
    } finally {
      setUploadingCover(false);
    }
  };

  const categories = ['技术深度', '随笔', '设计美学', '人工智能', '前端架构'];

  return (
    <div className="glass rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-slide-up">
      {/* Toolbar */}
      <div className="bg-white/80 dark:bg-slate-900/80 px-8 py-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {initialData?.id ? '✏️ 编辑文章' : '✨ 新建创作'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">豆包 Doubao-Pro 深度驱动</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* 验证提示 */}
          {!isFormValid() && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{getValidationSummary().join(' · ')}</span>
            </div>
          )}
          
          <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            取消
          </button>
          <div className="relative group">
            <button 
              onClick={() => handleSave(false)} 
              disabled={isSaving || !isFormValid()}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              存为草稿
            </button>
            {!isFormValid() && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {getValidationSummary().join('，')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
          <div className="relative group">
            <button 
              onClick={() => handleSave(true)} 
              disabled={isSaving || !isFormValid()}
              className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 rounded-xl shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 transform active:scale-95 transition-all"
            >
              {isSaving ? '保存中...' : '🚀 立即发布'}
            </button>
            {!isFormValid() && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {getValidationSummary().join('，')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-gray-50/50 dark:bg-slate-900/50">
        {/* Main Editor */}
        <div className="lg:col-span-8 space-y-6">
          {/* Title */}
          <div className="group relative">
             <input 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData(prev => ({...prev, title: e.target.value}))}
                onBlur={() => setTouched(prev => ({ ...prev, title: true }))}
                className={`w-full text-4xl font-extrabold bg-transparent border-none placeholder-gray-300 dark:placeholder-slate-600 text-gray-900 dark:text-white focus:ring-0 px-0 font-serif ${touched.title && errors.title ? 'text-red-500' : ''}`}
                placeholder="请输入文章标题..."
              />
              {/* 标题字数统计和错误提示 */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {touched.title && errors.title && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.title}
                    </span>
                  )}
                </div>
                <span className={`text-xs ${(formData.title?.length || 0) > 200 ? 'text-red-500' : 'text-gray-400'}`}>
                  {formData.title?.length || 0}/200
                </span>
              </div>
              <button 
                onClick={() => handleAI('TITLE')}
                disabled={aiLoading}
                className="absolute right-0 top-3 opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                {activeAITool === 'TITLE' ? '...' : '✨ 豆包拟题'}
              </button>

              {/* Title Suggestions Selector */}
              {showTitleSelector && titleSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl z-50 p-4 animate-slide-down">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">选择一个标题</h4>
                    <button 
                      onClick={() => setShowTitleSelector(false)}
                      className="text-gray-400 hover:text-gray-600 text-lg"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {titleSuggestions.map((title, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, title }));
                          setShowTitleSelector(false);
                          setTitleSuggestions([]);
                        }}
                        className="w-full text-left p-3 rounded-lg border border-gray-100 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all text-sm text-gray-700 dark:text-gray-300"
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Content Area */}
          <div className={`relative rounded-2xl bg-white dark:bg-slate-800 border ${touched.content && errors.content ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-slate-700'} shadow-inner min-h-[600px] flex flex-col`}>
            <div className="flex items-center gap-2 p-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 rounded-t-2xl overflow-x-auto">
              <span className="text-xs font-bold text-gray-400 uppercase px-2 shrink-0">Markdown Editor</span>
              {/* 内容字数统计 */}
              <span className={`text-xs px-2 ${(formData.content?.length || 0) < 10 ? 'text-amber-500' : 'text-gray-400'}`}>
                {formData.content?.length || 0} 字
                {(formData.content?.length || 0) < 10 && ` (还需 ${10 - (formData.content?.length || 0)} 字)`}
              </span>
              <div className="flex-grow"></div>
               {/* AI Tools */}
              <div className="flex gap-2 flex-wrap">
                 <button 
                  onClick={() => handleAI('TAG_GENERATE')}
                  disabled={aiLoading || formData.tags?.length === 0}
                  className={`ai-tool-card ${activeAITool === 'TAG_GENERATE' ? 'ai-tool-active' : ''}`}
                  title="根据标签生成大纲"
                >
                  <span className="ai-tool-icon">🧬</span>
                  <span className="ai-tool-text">{activeAITool === 'TAG_GENERATE' ? '生成中...' : '标签大纲'}</span>
                </button>
                <button 
                  onClick={() => handleAI('CONTINUE')}
                  disabled={aiLoading}
                  className={`ai-tool-card ${activeAITool === 'CONTINUE' ? 'ai-tool-active' : ''}`}
                  title="基于已有内容续写"
                >
                  <span className="ai-tool-icon">✍️</span>
                  <span className="ai-tool-text">{activeAITool === 'CONTINUE' ? '续写中...' : '续写'}</span>
                </button>
                <button 
                  onClick={() => handleAI('POLISH')}
                  disabled={aiLoading}
                  className={`ai-tool-card ${activeAITool === 'POLISH' ? 'ai-tool-active' : ''}`}
                  title="优化润色文章内容"
                >
                  <span className="ai-tool-icon">🪄</span>
                  <span className="ai-tool-text">{activeAITool === 'POLISH' ? '润色中...' : '润色'}</span>
                </button>
                 <button 
                  onClick={() => handleAI('SEO_OPTIMIZE')}
                  disabled={aiLoading}
                  className={`ai-tool-card ai-tool-seo ${activeAITool === 'SEO_OPTIMIZE' ? 'ai-tool-active' : ''}`}
                  title="SEO 搜索优化诊断"
                >
                  <span className="ai-tool-icon">🔍</span>
                  <span className="ai-tool-text">{activeAITool === 'SEO_OPTIMIZE' ? '诊断中...' : 'SEO诊断'}</span>
                </button>
              </div>
            </div>
            
            <textarea 
              value={formData.content} 
              onChange={e => setFormData(prev => ({...prev, content: e.target.value}))}
              onBlur={() => setTouched(prev => ({ ...prev, content: true }))}
              className="w-full flex-grow p-8 bg-transparent border-none focus:ring-0 outline-none font-mono text-sm leading-loose dark:text-gray-200 resize-none"
              placeholder="# 在此输入 Markdown 内容...&#10;&#10;提示：内容至少需要 10 个字符才能保存"
            />
            
            {/* 内容错误提示 */}
            {touched.content && errors.content && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.content}
              </div>
            )}
            
            {/* SEO Report Overlay */}
            {seoReport && (
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-brand-500 p-6 animate-slide-up shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-b-2xl">
                 <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-brand-600 flex items-center gap-2">🔍 豆包 SEO 深度诊断报告</h4>
                   <button onClick={() => setSeoReport(null)} className="text-gray-400 hover:text-gray-600">×</button>
                 </div>
                 <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono h-32 overflow-y-auto">{seoReport}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
             <label className="label">封面视觉</label>
             
             {/* 文件上传区域 */}
             <div className="mb-4">
               <label className="block">
                 <input
                   type="file"
                   accept="image/*"
                   onChange={handleCoverUpload}
                   disabled={uploadingCover}
                   className="hidden"
                 />
                 <div className="w-full h-24 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-brand-500 dark:hover:border-brand-400 transition-colors bg-gray-50 dark:bg-slate-900/50">
                   {uploadingCover ? (
                     <div className="flex items-center gap-2 text-gray-500">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
                       上传中...
                     </div>
                   ) : (
                     <div className="text-center">
                       <div className="text-2xl mb-1">📁</div>
                       <div className="text-sm text-gray-500 dark:text-gray-400">点击上传封面图片</div>
                       <div className="text-xs text-gray-400 mt-1">支持 JPG、PNG、WebP (最大 5MB)</div>
                     </div>
                   )}
                 </div>
               </label>
             </div>

             {/* URL 输入框 */}
             <div className="mb-3">
               <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">或输入图片 URL</div>
               <input 
                 value={formData.coverImage} 
                 onChange={e => setFormData(prev => ({...prev, coverImage: e.target.value}))}
                 className="input-field"
                 placeholder="https://example.com/image.jpg"
               />
             </div>

             {/* 预览 */}
             {formData.coverImage && (
               <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 relative group">
                 <img 
                   src={formData.coverImage.startsWith('/uploads/') ? formData.coverImage : formData.coverImage} 
                   className="w-full h-full object-cover" 
                   alt="封面预览" 
                   onError={(e) => (e.currentTarget.style.display = 'none')} 
                 />
                 <button
                   onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                   className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   ×
                 </button>
               </div>
             )}
           </div>

           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm relative">
             <div className="flex justify-between items-center mb-3">
               <label className="label">摘要 (Meta Desc)</label>
               <button onClick={() => handleAI('SUMMARY')} disabled={aiLoading} className="text-xs text-brand-600 font-bold hover:underline">⚡ 智能提炼</button>
             </div>
             <textarea 
                value={formData.excerpt} 
                onChange={e => setFormData(prev => ({...prev, excerpt: e.target.value}))}
                className="input-field h-24 resize-none w-full"
                placeholder="简短的介绍..."
              />
           </div>

           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
             <div>
               <label className="label">内容分类</label>
               <select 
                  value={formData.category} 
                  onChange={e => setFormData(prev => ({...prev, category: e.target.value}))}
                  className="input-field"
               >
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>

             <div>
               <label className="label">文章标签</label>
               
               {/* 预设标签选择区 */}
               <div className="mb-3">
                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">点击选择标签（可多选）：</p>
                 {loadingTags ? (
                   <div className="flex gap-2 flex-wrap">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className="h-7 w-16 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
                     ))}
                   </div>
                 ) : (
                   <div className="flex flex-wrap gap-2">
                     {availableTags.map(tag => {
                       const isSelected = formData.tags?.includes(tag.name);
                       return (
                         <button
                           key={tag.id}
                           type="button"
                           onClick={() => {
                             if (isSelected) {
                               setFormData(prev => ({...prev, tags: prev.tags?.filter(t => t !== tag.name)}));
                             } else {
                               setFormData(prev => ({...prev, tags: [...(prev.tags || []), tag.name]}));
                             }
                           }}
                           className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                             isSelected 
                               ? 'text-white shadow-md scale-105' 
                               : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:scale-105'
                           }`}
                           style={isSelected ? { backgroundColor: tag.color } : {}}
                         >
                           {isSelected && <span className="mr-1">✓</span>}
                           {tag.name}
                         </button>
                       );
                     })}
                   </div>
                 )}
               </div>

               {/* 已选标签展示 */}
               {formData.tags && formData.tags.length > 0 && (
                 <div className="mb-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                   <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">已选择 {formData.tags.length} 个标签：</p>
                   <div className="flex flex-wrap gap-2">
                     {formData.tags.map(tagName => {
                       const tagInfo = availableTags.find(t => t.name === tagName);
                       return (
                         <span 
                           key={tagName} 
                           className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 text-white"
                           style={{ backgroundColor: tagInfo?.color || '#6b7280' }}
                         >
                           {tagName}
                           <button 
                             onClick={() => setFormData(prev => ({...prev, tags: prev.tags?.filter(t => t !== tagName)}))} 
                             className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                           >
                             ×
                           </button>
                         </span>
                       );
                     })}
                   </div>
                 </div>
               )}

               {/* 自定义标签输入 */}
               <div className="border-t border-gray-200 dark:border-slate-700 pt-3 mt-3">
                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">或自定义标签：</p>
                 <div className="flex gap-2">
                   <input 
                     value={tagInput}
                     onChange={e => setTagInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                     className="input-field flex-1"
                     placeholder="输入后按回车添加..."
                   />
                   <button onClick={addTag} className="px-3 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">+</button>
                 </div>
               </div>
               
               <p className="text-[10px] text-gray-400 mt-3">提示：添加标签后点击「标签大纲」可自动生成结构。</p>
             </div>
           </div>

        </div>
      </div>
      <style>{`
        .label { @apply block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2; }
        .input-field { @apply w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none dark:text-white transition-all resize-none; }
        
    
        .ai-tool-card {
          @apply px-3 py-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl text-xs font-semibold;
          @apply hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20;
          @apply text-gray-700 dark:text-gray-200 flex items-center gap-1.5;
          @apply transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed;
          @apply shadow-sm hover:shadow-lg hover:-translate-y-0.5;
          @apply active:scale-95 active:shadow-inner transform cursor-pointer;
        }
        .ai-tool-card:not(:disabled):hover {
          @apply ring-2 ring-brand-200 dark:ring-brand-800;
        }
        .ai-tool-active {
          @apply border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300;
          @apply shadow-lg shadow-brand-200 dark:shadow-brand-900/50 animate-pulse;
        }
        .ai-tool-seo {
          @apply text-emerald-600 dark:text-emerald-400;
        }
        .ai-tool-seo:hover {
          @apply border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20;
        }
        .ai-tool-icon {
          @apply text-base;
        }
        .ai-tool-text {
          @apply whitespace-nowrap;
        }
        
        .animate-slide-down { animation: slideDown 0.2s ease-out; }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Editor;
