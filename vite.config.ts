import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load các biến môi trường
  // Fix: Cast process to any to avoid TS error regarding missing cwd property in some environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'OpenLMS Education',
          short_name: 'OpenLMS',
          description: 'Hệ thống Quản lý Học tập và Thi cử thông minh',
          theme_color: '#4f46e5',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for precaching
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          skipWaiting: true,
          clientsClaim: true
        }
      })
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom', 'zustand'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-math': ['react-markdown', 'remark-math', 'rehype-katex'],
            'vendor-ui': ['lucide-react', 'react-hot-toast'],
            'vendor-office': ['xlsx', 'docx', 'mammoth', 'file-saver'],
            'vendor-pdf': ['jspdf', 'html2canvas'],
            'vendor-vision': ['@mediapipe/tasks-vision'],
            'vendor-ai': ['@google/genai']
          }
        }
      }
    },
    define: {
      // Inject API_KEY, OPENROUTER_API_KEY và Supabase keys vào process.env để code client có thể đọc được
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY),
      'process.env.OPENROUTER_MODEL': JSON.stringify(env.OPENROUTER_MODEL || env.VITE_OPENROUTER_MODEL),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    },
    resolve: {
      alias: {
        '@': '.',
      },
    },
  };
});