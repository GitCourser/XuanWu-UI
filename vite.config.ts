import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import path from 'path'

export default defineConfig({
  plugins: [
    solidPlugin()
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4165',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('solid-js') || id.includes('@solidjs/router')) {
            return 'solid';
          }
          if (id.includes('monaco-editor/esm/vs/base')) {
            return 'monaco-base';
          }
          if (id.includes('monaco-editor/esm/vs/editor/common')) {
            return 'monaco-editor';
          }
          if (id.includes('monaco-editor/esm/vs/basic-languages')) {
            return 'monaco-languages';
          }
          if (id.includes('solid-monaco')) {
            return 'solid-monaco';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  optimizeDeps: {
    include: ['solid-js'],
  }
})
