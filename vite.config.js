import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import checker from 'vite-plugin-checker';

// ----------------------------------------------------------------------

export default defineConfig({
  plugins: [
    react(),
    checker({
      eslint: {
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
      },
      overlay: {
        initialIsOpen: false,
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), 'node_modules/$1'),
      },
      {
        find: /^src(.+)/,
        replacement: path.join(process.cwd(), 'src/$1'),
      },
    ],
  },
  server: {
    port: 3030,
  },
  preview: {
    port: 3030,
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        // jspdf pulls dompurify/html2canvas in as dynamic chunks. The workers and
        // the main bundle each emit them; with the same file name the worker copy
        // overwrites the main one and vite's import analysis crashes
        // ("Cannot read properties of undefined (reading 'forEach') at addDeps").
        entryFileNames: 'assets/worker/[name]-[hash].js',
        chunkFileNames: 'assets/worker/[name]-[hash].js',
        assetFileNames: 'assets/worker/[name]-[hash][extname]',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  }
});
