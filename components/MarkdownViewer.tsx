import React, { useEffect, useRef } from 'react';

/**
 * 增强的 Markdown 解析器
 * 支持标题、列表、代码块、表格、图片懒加载等
 */
const parseMarkdown = (text: string): string => {
  if (!text) return '';

  let html = text;

  // 代码块（带语法高亮提示）
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/gm, (_, lang, code) => {
    const language = lang || 'plaintext';
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .trim();
    return `<pre class="code-block" data-lang="${language}"><code class="language-${language}">${escapedCode}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 标题（必须放在其他处理之后避免冲突）
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-lg font-bold mt-6 mb-2">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-8 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-10 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold mt-12 mb-6">$1</h1>');

  // 引用块
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-brand-500 pl-4 py-2 my-4 bg-brand-50/50 dark:bg-brand-900/20 italic text-gray-700 dark:text-gray-300">$1</blockquote>');

  // 无序列表
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>');

  // 有序列表
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>');

  // 粗体和斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // 删除线
  html = html.replace(/~~(.+?)~~/g, '<del class="text-gray-400">$1</del>');

  // 图片（带懒加载）
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, 
    '<img src="$2" alt="$1" loading="lazy" class="rounded-xl shadow-lg my-6 max-w-full h-auto mx-auto" />');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, 
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-600 dark:text-brand-400 hover:underline font-medium">$1</a>');

  // 水平分割线
  html = html.replace(/^---$/gim, '<hr class="my-8 border-gray-200 dark:border-gray-700" />');
  html = html.replace(/^\*\*\*$/gim, '<hr class="my-8 border-gray-200 dark:border-gray-700" />');

  // 表格（简单支持）
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(cell => cell.trim());
    if (cells.every(cell => /^[-:]+$/.test(cell.trim()))) {
      return ''; // 分隔行
    }
    const isHeader = !html.includes('<tbody>');
    const cellTag = isHeader ? 'th' : 'td';
    const cellClass = isHeader 
      ? 'px-4 py-2 bg-gray-100 dark:bg-gray-800 font-bold text-left border border-gray-200 dark:border-gray-700'
      : 'px-4 py-2 border border-gray-200 dark:border-gray-700';
    const row = cells.map(cell => `<${cellTag} class="${cellClass}">${cell.trim()}</${cellTag}>`).join('');
    return `<tr>${row}</tr>`;
  });

  // 包裹表格行
  if (html.includes('<tr>')) {
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="w-full my-6 border-collapse">$&</table>');
  }

  // 段落（换行处理）
  html = html
    .split('\n\n')
    .map(para => {
      if (para.startsWith('<') || para.trim() === '') return para;
      return `<p class="my-4 leading-relaxed">${para}</p>`;
    })
    .join('\n');

  // 单独换行转为 <br>（在段落内）
  html = html.replace(/([^>\n])\n([^<\n])/g, '$1<br />$2');

  return html;
};

const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理图片懒加载和错误
  useEffect(() => {
    if (!containerRef.current) return;

    const images = containerRef.current.querySelectorAll('img');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '100px' });

    images.forEach(img => {
      // 添加加载状态
      img.addEventListener('load', () => {
        img.classList.add('loaded');
      });
      
      img.addEventListener('error', () => {
        img.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.className = 'bg-gray-100 dark:bg-gray-800 rounded-xl p-8 text-center text-gray-400 my-6';
        placeholder.textContent = '图片加载失败';
        img.parentNode?.insertBefore(placeholder, img);
      });

      if ('loading' in HTMLImageElement.prototype) {
        // 浏览器原生支持懒加载
      } else {
        observer.observe(img);
      }
    });

    return () => observer.disconnect();
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className="markdown-body prose dark:prose-invert max-w-none" 
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};

export default MarkdownViewer;