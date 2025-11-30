
import React, { useState, useEffect } from 'react';
import { getSystemConfig, updateSystemConfig } from '../services/backendSimulation';
import { SystemConfig } from '../types';
import { User } from '../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  activeTab: 'BLOG' | 'ADMIN';
  onTabChange: (tab: 'BLOG' | 'ADMIN') => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

const Layout: React.FC<Props> = ({ children, activeTab, onTabChange, user, onLogin, onLogout }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [sysConfig, setSysConfig] = useState<SystemConfig>(getSystemConfig());

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const toggleSysConfig = (key: keyof SystemConfig, val: any) => {
    updateSystemConfig({ [key]: val });
    setSysConfig({ ...getSystemConfig() });
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Dynamic Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300 dark:bg-purple-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-300 dark:bg-blue-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-300 dark:bg-pink-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Glass Navbar */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass shadow-sm py-2' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white shadow-lg transform group-hover:rotate-6 transition-transform">
              <span className="font-bold text-lg font-serif italic">F</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors font-serif">
                流影<span className="font-light">博客</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold">Flowing Shadow</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
             <nav className="hidden md:flex bg-gray-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-full border border-gray-200/50 dark:border-white/5">
              <button 
                onClick={() => onTabChange('BLOG')}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'BLOG' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm scale-105' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                探索
              </button>
               <button 
                onClick={() => onTabChange('ADMIN')}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'ADMIN' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm scale-105' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                后台
              </button>
            </nav>

            {/* 用户认证区域 */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden md:flex items-center space-x-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">欢迎,</span>
                    <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
                    {user.role === 'admin' && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full font-medium">
                        管理员
                      </span>
                    )}
                  </div>
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 rounded-lg shadow-lg shadow-brand-500/30 transition-all"
                >
                  登录
                </button>
              )}

              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 transition-all border border-gray-200/50 dark:border-white/10 shadow-sm"
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? '🌙' : '🌞'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 z-10">
        {children}
      </main>

      {/* System DevTools Toggle */}
      <div className="fixed bottom-6 left-6 z-50">
        <button 
          onClick={() => setShowDevTools(!showDevTools)}
          className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all ${showDevTools ? 'bg-gray-900 text-white rotate-90' : 'bg-white dark:bg-slate-800 text-gray-500'}`}
        >
          ⚙️
        </button>
        {showDevTools && (
          <div className="absolute bottom-14 left-0 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl text-xs text-gray-300 animate-slide-up">
            <h3 className="font-bold text-white mb-3 border-b border-white/10 pb-2">系统仿真控制台 (SSR Simulation)</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <span>Redis (L2 Cache)</span>
                 <button onClick={() => toggleSysConfig('redisOnline', !sysConfig.redisOnline)} className={`px-2 py-0.5 rounded ${sysConfig.redisOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                   {sysConfig.redisOnline ? 'Online' : 'Offline'}
                 </button>
              </div>
              <div className="flex justify-between items-center">
                 <span>MySQL (L4 DB)</span>
                 <button onClick={() => toggleSysConfig('dbOnline', !sysConfig.dbOnline)} className={`px-2 py-0.5 rounded ${sysConfig.dbOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                   {sysConfig.dbOnline ? 'Online' : 'Crashed'}
                 </button>
              </div>
               <div className="space-y-1">
                 <span className="block text-gray-500">模拟用户 (混合渲染策略)</span>
                 <div className="grid grid-cols-3 gap-1">
                   {['BOT', 'USER_FAST', 'USER_SLOW'].map(type => (
                     <button 
                      key={type}
                      onClick={() => toggleSysConfig('userType', type)}
                      className={`px-1 py-1 rounded text-[10px] text-center ${sysConfig.userType === type ? 'bg-brand-600 text-white' : 'bg-gray-800'}`}
                     >
                       {type.replace('USER_', '')}
                     </button>
                   ))}
                 </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-gray-500">
               {sysConfig.userType === 'BOT' && '策略: 全量 SSR (SEO优先)'}
               {sysConfig.userType === 'USER_FAST' && '策略: Shell + CSR (交互优先)'}
               {sysConfig.userType === 'USER_SLOW' && '策略: 全量 SSR (弱网优化)'}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md py-12 z-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © 2025 Flowing Shadow Blog. Powered by simulated SSR & ByteDance Doubao (Volcengine).
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
