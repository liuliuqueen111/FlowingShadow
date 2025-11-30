
import React, { useEffect, useRef, useState } from 'react';
import { Article } from '../types';
import MarkdownViewer from './MarkdownViewer';

interface Props {
  article: Article;
  onBack: () => void;
  prevArticle?: Article; // 上一篇（通常指更旧的文章）
  nextArticle?: Article; // 下一篇（通常指更新的文章）
  onNavigate: (id: string) => void; // 切换文章的回调
}

const ArticleViewer: React.FC<Props> = ({ article, onBack, prevArticle, nextArticle, onNavigate }) => {
  const [progress, setProgress] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem(`progress_${article.id}`);
    if (saved) {
      // Simulate "Syncing from cloud"
      setTimeout(() => setProgress(Number(saved)), 500);
    }
  }, [article.id]);

  // Scroll Progress Listener
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const current = window.scrollY;
      const p = Math.min(100, Math.max(0, (current / totalHeight) * 100));
      setProgress(p);
      localStorage.setItem(`progress_${article.id}`, p.toString());
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article.id]);

  // Dynamic Typography based on category
  const getTypographyClass = () => {
    if (article.category === '随笔' || article.category === '设计美学') {
      return 'prose-lg font-serif tracking-wide leading-loose';
    }
    return 'prose-lg font-sans tracking-normal leading-relaxed';
  };

  return (
    <div className={`relative transition-all duration-700 ${immersive ? 'max-w-6xl' : 'max-w-4xl'} mx-auto animate-fade-in`}>
      
      {/* Reading Progress Bar (Fixed Top) */}
      <div className="fixed top-0 left-0 w-full h-1 z-50 bg-transparent">
        <div 
          className="h-full bg-gradient-to-r from-brand-400 to-accent-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Control Bar */}
      <div className={`sticky top-20 z-40 flex justify-between items-center mb-8 transition-opacity duration-300 ${immersive ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <button 
          onClick={onBack} 
          className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white/20 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          返回列表
        </button>
        
        <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
          <span title="Cloud Sync Active" className="flex items-center gap-1 text-green-500">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> 进度同步
          </span>
          <span 
            className="cursor-pointer hover:text-brand-500 transition-colors"
            onClick={() => setImmersive(!immersive)}
          >
            {immersive ? '退出沉浸' : '双击内容开启沉浸模式'}
          </span>
        </div>
      </div>

      {/* Article Container */}
      <article 
        onDoubleClick={() => setImmersive(!immersive)}
        className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl rounded-3xl overflow-hidden transition-all duration-500 ${immersive ? 'p-12 md:p-16' : 'p-8 md:p-12'}`}
      >
        {/* Cover with Parallax Feel */}
        {article.coverImage && (
          <div className={`${immersive ? 'h-[500px]' : 'h-80'} -mx-12 -mt-12 mb-12 relative overflow-hidden transition-all duration-700`}>
              <img src={article.coverImage} className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-[20s]" alt="Cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-8 left-8 md:left-12 right-8 text-white">
                <span className="px-3 py-1 bg-brand-600/80 backdrop-blur rounded-lg text-xs font-bold mb-4 inline-block shadow-lg">
                  {article.category}
                </span>
                <h1 className={`${immersive ? 'text-5xl md:text-6xl' : 'text-3xl md:text-5xl'} font-extrabold leading-tight text-shadow-lg tracking-tight mb-4`}>
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-sm font-medium text-white/80">
                  <span>{article.author}</span>
                  <span>•</span>
                  <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{Math.ceil(article.content.length / 500)} 分钟阅读</span>
                </div>
              </div>
          </div>
        )}

        {/* Content with Dynamic Typography */}
        <div 
          ref={contentRef}
          className={`prose dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-brand-600 dark:prose-a:text-brand-400 hover:prose-a:text-brand-500 prose-img:rounded-2xl prose-img:shadow-lg prose-blockquote:border-brand-500 prose-blockquote:bg-brand-50/50 dark:prose-blockquote:bg-brand-900/20 py-4 ${getTypographyClass()}`}
        >
          <MarkdownViewer content={article.content} />
        </div>

        {/* Footer Actions */}
        <div className="mt-16 pt-8 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex gap-2">
            {article.tags.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  #{tag}
                </span>
            ))}
          </div>
          <div className="flex gap-4">
             <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 hover:text-red-500">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
             </button>
             <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 hover:text-blue-500">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
             </button>
          </div>
        </div>
      </article>

      {/* Suggested Reading Navigation */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Previous (Older) Article */}
        {prevArticle ? (
          <div 
            onClick={() => onNavigate(prevArticle.id)}
            className="group cursor-pointer bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl backdrop-blur border border-white/10 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all hover:-translate-y-1"
          >
            <span className="text-xs font-bold text-gray-400 uppercase group-hover:text-brand-500 transition-colors">← 上一篇</span>
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mt-1 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">{prevArticle.title}</h4>
          </div>
        ) : (
          <div className="opacity-0 pointer-events-none md:block hidden"></div>
        )}

        {/* Next (Newer) Article */}
        {nextArticle ? (
          <div 
            onClick={() => onNavigate(nextArticle.id)}
            className="group cursor-pointer bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl backdrop-blur border border-white/10 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all hover:-translate-y-1 text-right"
          >
            <span className="text-xs font-bold text-gray-400 uppercase group-hover:text-brand-500 transition-colors">下一篇 →</span>
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mt-1 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">{nextArticle.title}</h4>
          </div>
        ) : (
          <div className="opacity-0 pointer-events-none md:block hidden"></div>
        )}
      </div>
    </div>
  );
};

export default ArticleViewer;
