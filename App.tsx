
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import ArticleCard from './components/ArticleCard';
import ArticleViewer from './components/ArticleViewer';
import Editor from './components/Editor';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { fetchArticles, fetchArticleById, saveArticle, deleteArticle } from './services/backendSimulation';
import { Article, SSRResponse } from './types';

// SSR 初始数据接口
interface InitialData {
  articles?: Article[];
  article?: Article;
  total?: number;
}

interface AppProps {
  initialData?: InitialData;
}

// --- SSR Debug HUD Component ---
const SSRHud = ({ info, loading }: { info: SSRResponse<any> | null, loading: boolean }) => {
  if (loading) return null;
  if (!info) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in group">
      <div className={`bg-gray-900/90 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl border ${info.degraded ? 'border-red-500/50' : 'border-white/10'} text-xs font-mono w-64 transition-all hover:scale-105`}>
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
          <span className={`font-bold ${info.degraded ? 'text-red-400' : 'text-brand-400'}`}>
            {info.degraded ? '⚠️ DEGRADED MODE' : 'SSR Performance'}
          </span>
          <div className="flex gap-1">
             <span className={`w-2 h-2 rounded-full ${info.degraded ? 'bg-red-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Strategy:</span>
            <span className="text-blue-300 font-bold">{info.renderStrategy}</span>
          </div>
           <div className="flex justify-between">
            <span className="text-gray-400">Layer:</span>
            <span className={`${info.source.includes('CACHE') ? 'text-green-400' : (info.source === 'L4_DB' ? 'text-yellow-400' : 'text-red-400')} font-bold`}>
              {info.source}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Latency:</span>
            <span>{info.latency}ms</span>
          </div>
          {info.error && (
             <div className="text-red-400 mt-2 pt-2 border-t border-white/10 italic">
               "{info.error}"
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC<AppProps> = ({ initialData }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'BLOG' | 'ADMIN'>('BLOG');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [view, setView] = useState<'LIST' | 'DETAIL' | 'EDIT'>('LIST');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Data State 
  const [articles, setArticles] = useState<Article[]>(initialData?.articles || []);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(initialData?.article || null);
  
  // UI State 
  const [loading, setLoading] = useState(!initialData?.articles);
  const [ssrMetrics, setSsrMetrics] = useState<SSRResponse<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Views Controller ---

  const loadList = useCallback(async (adminMode = false) => {
    setLoading(true);
    setSsrMetrics(null);
    setError(null);
    try {
      let response: SSRResponse<any>;
      
      if (adminMode && isAuthenticated) {
        // 获取用户的所有文章（包括草稿）
        response = await fetch('/api/my/articles', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json());
      } else {
        //只获取已发布文章
        response = await fetchArticles();
      }
      
      // Simulate Hybrid Rendering Delay if strategy says so
      if (response.renderStrategy === 'SSR_HYBRID') {
         
      }

      if (response.degraded && response.data?.articles.length === 0) {
        setError("系统正处于降级维护模式，暂无内容显示。");
      } else {
        setArticles(response.data?.articles || []);
      }
      setSsrMetrics(response);
    } catch (err) {
      setError("Critical System Failure");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setSsrMetrics(null);
    try {
      const response = await fetchArticleById(id);
      
      if (response.data) {
        setCurrentArticle(response.data);
        setView('DETAIL');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (response.degraded) {
        setError("内容暂时不可用（降级保护中）");
      }
      setSsrMetrics(response);
    } catch (err) {
      setError("Article not found.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = () => {
    setCurrentArticle(null);
    setView('EDIT');
  };

  const handleEdit = (article: Article) => {
    setCurrentArticle(article);
    setView('EDIT');
  };

  const handleDelete = async (id: string) => {
    if (confirm("确定要删除这篇文章吗？操作不可逆。")) {
      try {
        await deleteArticle(id);
        await loadList(activeTab === 'ADMIN'); // 删除后重新加载当前模式列表
      } catch (e) {
        alert("操作失败：数据库可能已离线");
      }
    }
  };

  const handleSave = async (data: Partial<Article>) => {
    try {
      // 尝试保存（若后端返回非 2xx 会抛错）
      await saveArticle({ ...data, id: currentArticle?.id }, user?.id);
    } catch (e: any) {
      // 显示后端错误信息（如果有），否则显示默认提示
      const msg = e?.message || '请先登录或检查权限';
      alert(`保存失败：${msg}`);
      return; // 不继续执行后续的流程
    }

    // 保存成功：切换到后台页面（管理员视图），不自动刷新文章列表。
    // 用户可以在后台手动刷新或切换到探索页以触发列表重载。
    setView('LIST');
    setActiveTab('ADMIN');

    setSaveNotice('文章已保存。若要查看，请手动刷新文章列表或切换到探索页。');
    // 自动关闭提示 6 秒
    setTimeout(() => setSaveNotice(null), 6000);
    // 保存后：尝试刷新后台列表（如果失败，提示但不回滚保存）
    try {
      await loadList(true);
    } catch (err) {
      console.error('后台列表刷新失败:', err);
      // 给用户温和提示，但不视为保存失败
      setSaveNotice('文章已保存，但刷新后台列表失败，请手动刷新。');
      setTimeout(() => setSaveNotice(null), 6000);
    }
  };

  const handleTabChange = (tab: 'BLOG' | 'ADMIN') => {
    if (tab === 'ADMIN' && !isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActiveTab(tab);
    setView('LIST');
    // 切换标签页时重新加载列表
    loadList(tab === 'ADMIN');
  };

  // Initial Load 
  useEffect(() => {
    if (!initialData?.articles || initialData.articles.length === 0) {
      loadList();
    }
  }, [loadList, initialData]);

  // 当用户登录后，像点击“探索”一样从后端拉取最新的文章列表（避免刷新时仍显示本地回退数据）
  const prevAuthRef = React.useRef<boolean>(false);
  useEffect(() => {
    // 只有在从未认证 -> 已认证 的变更时触发
    if (!prevAuthRef.current && isAuthenticated) {
      // 主动从后端重新加载探索列表
      loadList(false).catch(err => console.error('登录后刷新探索列表失败:', err));
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, loadList]);

  // --- Render Helpers ---

  const renderBlogList = () => (
    <div className="space-y-12 animate-slide-up">
      <div className="text-center mb-16 relative">
        <h1 className="text-5xl md:text-7xl font-serif font-black text-gray-900 dark:text-white mb-6 tracking-tight relative z-10">
          Flowing <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-accent-500">Shadow</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
          繁华之外，静观流影。
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 rounded-2xl text-center text-red-600 dark:text-red-400 animate-pulse">
          <h3 className="text-xl font-bold mb-2">系统服务降级中</h3>
          <p>{error}</p>
          <button onClick={loadList} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 rounded-lg hover:bg-red-200 transition-colors">刷新重试</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[400px] bg-white dark:bg-slate-800 rounded-2xl animate-pulse shadow-sm border border-gray-100 dark:border-white/5 flex flex-col p-6 space-y-4">
               <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-xl w-full"></div>
               <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
               <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
               <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {articles.map(article => (
            <ArticleCard 
              key={article.id} 
              article={article} 
              onClick={loadDetail} 
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderAdmin = () => (
    <div className="animate-slide-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">CMS 内容管理</h2>
          <p className="text-gray-500 text-sm mt-1">L4 数据库连接状态: {ssrMetrics?.degraded ? '离线 (Read Only)' : '正常'}</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-brand-500/30 font-medium transition-all hover:-translate-y-1 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          新建文章
        </button>
      </div>

      {view === 'EDIT' ? (
        <Editor 
          initialData={currentArticle || {}} 
          onSave={handleSave} 
          onCancel={() => { setView('LIST'); setCurrentArticle(null); }} 
        />
      ) : (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl border border-white/20 dark:border-white/5 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50/50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">文章</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">分类</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {articles.map(article => (
                <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                       {article.coverImage && (
                         <img src={article.coverImage} className="h-10 w-10 rounded-lg object-cover mr-4" alt="" />
                       )}
                       <div>
                         <div className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{article.title}</div>
                         <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(article.createdAt).toLocaleDateString()}</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full ${article.status === 'PUBLISHED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                      {article.status === 'PUBLISHED' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {article.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button onClick={() => handleEdit(article)} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 hover:underline">编辑</button>
                    <button onClick={() => handleDelete(article.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderArticleDetail = () => {
    if (!currentArticle) return null;
    
    // Calculate Neighbors
    const currentIndex = articles.findIndex(a => a.id === currentArticle.id);
    const nextArticle = currentIndex > 0 ? articles[currentIndex - 1] : undefined; // Newer
    const prevArticle = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : undefined; // Older

    return (
      <ArticleViewer 
        article={currentArticle} 
        onBack={() => setView('LIST')} 
        prevArticle={prevArticle}
        nextArticle={nextArticle}
        onNavigate={loadDetail}
      />
    );
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        user={user}
        onLogin={() => setShowAuthModal(true)}
        onLogout={logout}
      >
        {activeTab === 'BLOG' && view === 'LIST' && renderBlogList()}
        {activeTab === 'BLOG' && view === 'DETAIL' && renderArticleDetail()}
        {activeTab === 'ADMIN' && renderAdmin()}
      </Layout>
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      <SSRHud info={ssrMetrics} loading={loading} />
    </>
  );
};

const App: React.FC<AppProps> = (props) => {
  return (
    <AuthProvider>
      <AppContent {...props} />
    </AuthProvider>
  );
};

export default App;
