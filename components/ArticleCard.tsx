
import React, { useMemo } from 'react';
import { Article } from '../types';

interface Props {
  article: Article;
  onClick: (id: string) => void;
}

// 确定性的日期格式化函数
const formatDate = (timestamp: number | string | undefined): string => {
  if (!timestamp) return '未知时间';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '未知时间';
  
  // 避免服务器/客户端不一致
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

const ArticleCard: React.FC<Props> = ({ article, onClick }) => {
  //  useMemo
  const formattedDate = useMemo(() => formatDate(article.createdAt), [article.createdAt]);
  return (
    <div 
      onClick={() => onClick(article.id)}
      className="group relative flex flex-col h-full bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-white/5 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:bg-white/90 dark:hover:bg-slate-800/90 backdrop-blur-sm"
    >
 
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700 animate-pulse" />
        {article.coverImage && (
          <img 
            src={article.coverImage} 
            alt={article.title} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        )}
        <div className="absolute top-4 left-4">
           <span className="px-3 py-1 text-xs font-bold text-white bg-black/30 backdrop-blur-md border border-white/20 rounded-full shadow-sm">
             {article.category}
           </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow relative z-10">
        <div className="flex flex-wrap gap-2 mb-3">
          {article.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300">
              #{tag}
            </span>
          ))}
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {article.title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 flex-grow leading-relaxed">
          {article.excerpt}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-gray-500">
           <div className="flex items-center space-x-2">
             <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-400 to-purple-500 flex items-center justify-center text-white font-bold text-[10px]">
               {article.author.charAt(0)}
             </div>
             <span>{article.author}</span>
           </div>
           <div className="flex items-center space-x-3">
             <span className="flex items-center space-x-1">
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <span>{formattedDate}</span>
             </span>
             <span className="flex items-center space-x-1">
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
               </svg>
               <span>{article.views}</span>
             </span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
