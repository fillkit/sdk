import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite Configuration for NPM Library Builds (ESM + CJS)
 *
 * Production-ready configuration:
 * - Unminified code for debugging and inspection
 * - External source maps without bloating package
 * - Tree-shakeable ES modules
 * - CommonJS for legacy compatibility
 * - Preserves license comments
 */
export default defineConfig(() => {
  return {
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.ts'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false, // Don't clear dist (types built separately)
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'FillKit',
        fileName: format => {
          const formatDir = format === 'es' ? 'esm' : 'cjs';
          return `${formatDir}/index.js`;
        },
      },
      rollupOptions: {
        external: ['@faker-js/faker'],
        output: [
          {
            format: 'es',
            dir: 'dist/esm',
            entryFileNames: 'index.js',
            preserveModules: false,
            exports: 'named',
            banner: '/*! FillKit SDK | MIT License | https://fillkit.dev */',
          },
          {
            format: 'cjs',
            dir: 'dist/cjs',
            entryFileNames: 'index.js',
            preserveModules: false,
            exports: 'named',
            banner: '/*! FillKit SDK | MIT License | https://fillkit.dev */',
          },
        ],
      },
      // External source maps (separate .map files)
      sourcemap: 'hidden',
      // Keep unminified for npm packages (industry standard)
      minify: false,
      // Modern ES2022 for optimal performance
      target: 'es2022',
      // Don't copy public assets for library builds
      copyPublicDir: false,
      // Reporting
      reportCompressedSize: true,
      chunkSizeWarningLimit: 500,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'production'
      ),
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['@faker-js/faker'],
    },
  };
});
