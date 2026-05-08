import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',

  // Drop console.* and debugger statements in production bundles
  esbuild: {
    drop: ['console', 'debugger'],
  },

  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    proxy: (typeof process !== 'undefined' && process.env && process.env.VITE_DEV_PROXY_TARGET)
      ? {
          '/api': {
            target: process.env.VITE_DEV_PROXY_TARGET,
            changeOrigin: true,
            secure: false,
          },
          '/uploads': {
            target: process.env.VITE_DEV_PROXY_TARGET,
            changeOrigin: true,
            secure: false,
          },
        }
      : undefined,
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    // Split CSS per lazy chunk so each page only loads its own styles
    cssCodeSplit: true,

    // Raise warning threshold; we've already split chunks manually
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        /**
         * Manual chunk strategy:
         *  vendor-charts – recharts + its d3 sub-deps (heavy; lazy – only loaded
         *                  when the user navigates to the Dashboard page)
         *  vendor        – everything else in node_modules (react, react-dom,
         *                  react-router, lucide, axios, react-hot-toast, qrcode…)
         *
         * Keeping all non-chart deps in a single "vendor" chunk avoids the
         * circular-chunk warning that appears when react-hot-toast (vendor-misc)
         * imports react (vendor-react) and Rollup sees a cross-chunk cycle.
         *
         * All lazy page modules become their own async chunk automatically via
         * React.lazy() in App.jsx – no extra config needed here for them.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (
            id.includes('/recharts/') ||
            id.includes('\\recharts\\') ||
            id.includes('/d3-') ||
            id.includes('\\d3-')
          ) {
            return 'vendor-charts';
          }

          return 'vendor';
        },

        // Deterministic file name patterns (better long-term caching)
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
