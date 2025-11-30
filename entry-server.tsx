/**
 * 服务端渲染入口
 * 使用 ReactDOMServer 将 React 组件渲染为 HTML 字符串
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

export interface SSRContext {
  initialData?: any;
  url?: string;
}

export function render(context: SSRContext = {}) {
  // 将初始数据注入到全局，供客户端 hydration 时使用
  const html = renderToString(
    React.createElement(React.StrictMode, null,
      React.createElement(App, { initialData: context.initialData })
    )
  );

  return { html };
}
