/**
 * 客户端 Hydration 入口
 * 在服务端渲染的 HTML 基础上激活 React 交互
 */

import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

// 从服务端注入的数据中获取初始状态
const initialData = (window as any).__INITIAL_DATA__;

// 判断是否需要 hydration（服务端渲染过的页面）还是普通挂载
if (rootElement.innerHTML.trim()) {
  // 服务端已渲染，执行 hydration
  hydrateRoot(
    rootElement,
    <React.StrictMode>
      <App initialData={initialData} />
    </React.StrictMode>
  );
  console.log('🚀 React Hydration 完成');
} else {
  // 客户端渲染（开发模式或 CSR fallback）
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('🎨 React CSR 渲染完成');
}
