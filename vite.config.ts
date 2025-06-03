// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteLoggerPlugin from './vite-plugin-logger';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteLoggerPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
      // Fix pour date-fns - assurez-vous que tous les imports sont résolus correctement
      'date-fns': path.resolve(__dirname, 'node_modules/date-fns')
    },
  },
  optimizeDeps: {
    include: ['date-fns'],
    esbuildOptions: {
      // Fix pour l'import de date-fns
      preserveSymlinks: true,
      // Ajout de la configuration de format pour date-fns
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
      }
    }
  },
  build: {
    commonjsOptions: {
      include: [/date-fns/, /node_modules/],
      transformMixedEsModules: true // Important pour date-fns
    },
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Grouper les dépendances par package
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/api-docs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    },
  },
  // Configuration pour le logger frontend
  define: {
    __CLIENT_LOGGER_CONFIG__: JSON.stringify({
      minLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
      sendToServer: true,
      serverUrl: '/api/logs',
      batchSize: 10,
      sendInterval: 30000, // 30 secondes
    })
  }
});