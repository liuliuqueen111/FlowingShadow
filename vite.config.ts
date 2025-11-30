import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // 豆包 (Doubao) AI 服务配置
        'process.env.ARK_API_KEY': JSON.stringify(env.ARK_API_KEY),
        'process.env.ARK_MODEL_ENDPOINT': JSON.stringify(env.ARK_MODEL_ENDPOINT)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          }
        }
      },
      ssr: {
        // 服务端 Node.js 依赖需要外部化
        external: ['dotenv', 'sequelize', 'mysql2', 'ioredis', 'react', 'react-dom'],
        // 确保这些包不被外部化，打包进 SSR bundle
        noExternal: []
      },
      optimizeDeps: {
        include: ['react', 'react-dom']
      }
    };
});
