import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      server: {
        port: 3099,
        host: '0.0.0.0',
      },
      plugins: [react()],
      css: {
        postcss: './postcss.config.js',
      },
      define: {
        // AI Keys are now strictly handled by serverless functions.
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Chunk splitting para reducir el bundle inicial
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'charts': ['recharts'],
            }
          }
        },
        // Comprimir assets
        cssCodeSplit: true,
        assetsInlineLimit: 4096,
      }
    };
});
