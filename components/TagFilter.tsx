/**
 * 标签筛选组件
 * 显示可选标签列表，支持单选筛选
 */

import React from 'react';

export interface Tag {
  id: number | string;
  name: string;
  slug?: string;
  color?: string;
  count?: number;
}

interface TagFilterProps {
  tags: Tag[];
  selectedTag: string | null;
  onTagChange: (tagId: string | null) => void;
  loading?: boolean;
}

const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTag,
  onTagChange,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 mb-6 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="h-8 w-20 bg-gray-200 dark:bg-slate-700 rounded-full"
          />
        ))}
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">标签筛选</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* 全部标签按钮 */}
        <button
          onClick={() => onTagChange(null)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium
            transition-all duration-200 ease-out
            ${selectedTag === null
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 scale-105'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
            }
          `}
        >
          全部
        </button>

        {/* 标签列表 */}
        {tags.map(tag => (
          <button
            key={tag.id}
            onClick={() => onTagChange(String(tag.id))}
            className={`
              px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200 ease-out
              ${selectedTag === String(tag.id)
                ? 'text-white shadow-lg scale-105'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
              }
            `}
            style={selectedTag === String(tag.id) ? {
              backgroundColor: tag.color || '#3b82f6',
              boxShadow: `0 10px 15px -3px ${tag.color || '#3b82f6'}40`
            } : undefined}
          >
            <span className="flex items-center gap-1.5">
              {/* 标签颜色指示器 */}
              {selectedTag !== String(tag.id) && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tag.color || '#3b82f6' }}
                />
              )}
              {tag.name}
              {tag.count !== undefined && (
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${selectedTag === String(tag.id)
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                  }
                `}>
                  {tag.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TagFilter;
