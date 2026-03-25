import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
);
const banner = `/*! FillKit SDK v${pkg.version} | MIT License | https://fillkit.dev */`;

/**
 * Vite Configuration for Browser/CDN Build
 *
 * Production-ready browser bundle following best practices:
 * - Includes ALL dependencies (including @faker-js/faker)
 * - Exposes FillKit as a global variable (window.FillKit)
 * - Can be used via <script> tag or CDN without a bundler
 * - UMD format for maximum compatibility
 * - IIFE format for modern browsers
 * - Minified with source maps for production
 * - Preserves license comments
 * - Optimized for CDN delivery
 */
export default defineConfig({
  build: {
    outDir: 'dist/browser',
    emptyOutDir: true, // Clear browser dist before building
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FillKit',
      fileName: format => `fillkit.${format}.js`,
    },
    rollupOptions: {
      // Don't externalize anything - bundle all dependencies
      external: [],
      output: [
        {
          format: 'umd',
          name: 'FillKit',
          entryFileNames: 'fillkit.umd.js',
          banner,
          // Compress output
          compact: true,
        },
        {
          format: 'iife',
          name: 'FillKit',
          entryFileNames: 'fillkit.iife.js',
          banner,
          // Compress output
          compact: true,
        },
      ],
    },
    // External source maps for CDN (no inline sourceMappingURL)
    sourcemap: 'hidden',
    // Minify for production CDN usage
    minify: 'esbuild',
    // Slightly older target for better browser compatibility
    target: 'es2020',
    // Don't copy public assets
    copyPublicDir: false,
    // Reporting
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000, // Higher limit for browser bundle (includes faker)
  },
  // Esbuild minification options
  esbuild: {
    legalComments: 'none', // Remove all comments except banner
    treeShaking: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  // Optimize all dependencies
  optimizeDeps: {
    include: ['@faker-js/faker'],
  },
});
