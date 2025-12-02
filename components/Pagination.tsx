/**
 * 分页组件
 * 支持页码切换、显示当前页码和总页数
 */

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false
}) => {
  if (totalPages <= 1) return null;

  // 生成页码数组，显示当前页前后各2页
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5; // 最多显示5个页码
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // 调整以确保显示足够的页码
    if (endPage - startPage < showPages - 1) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + showPages - 1);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, endPage - showPages + 1);
      }
    }
    
    // 添加第一页
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }
    
    // 添加中间页码
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // 添加最后一页
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 mt-8 mb-4">
      {/* 上一页按钮 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        className={`
          flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm
          transition-all duration-200
          ${currentPage === 1 || disabled
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md border border-gray-200 dark:border-slate-600'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        上一页
      </button>

      {/* 页码 */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-3 py-2 text-gray-400 dark:text-gray-500">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                disabled={disabled || page === currentPage}
                className={`
                  min-w-[40px] h-10 rounded-lg font-medium text-sm
                  transition-all duration-200
                  ${page === currentPage
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                    : disabled
                      ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600'
                  }
                `}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 下一页按钮 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        className={`
          flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm
          transition-all duration-200
          ${currentPage === totalPages || disabled
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-md border border-gray-200 dark:border-slate-600'
          }
        `}
      >
        下一页
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 页码信息 */}
      <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
        第 {currentPage} / {totalPages} 页
      </span>
    </div>
  );
};

export default Pagination;
