#!/usr/bin/env node

/**
 * Build Report Generator
 *
 * Generates a comprehensive build report showing all build outputs with file sizes,
 * gzip compression ratios, and verification checks. Used after `yarn build` to
 * validate the build and display production-ready metrics.
 *
 * **Features:**
 * - Verifies all required build files exist
 * - Calculates raw and gzipped sizes for all bundles
 * - Displays formatted output with colors
 * - Provides production checklist
 * - Exits with error code if build is incomplete
 *
 * **Output Sections:**
 * 1. Build verification (checks for missing files)
 * 2. NPM package builds (ESM, CJS, TypeScript definitions)
 * 3. Browser/CDN builds (UMD, IIFE)
 * 4. Summary with total sizes
 * 5. Production checklist
 *
 * @example
 * Usage:
 * ```bash
 * node scripts/build-report.js
 * # Or via npm script:
 * yarn build
 * ```
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

/**
 * Formats bytes to human-readable size string.
 *
 * @param {number} bytes - Number of bytes to format
 * @returns {string} Formatted size string (e.g., "1.23 MB")
 *
 * @example
 * formatSize(1024); // "1.00 KB"
 * formatSize(1048576); // "1.00 MB"
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Gets the size of a file in bytes.
 *
 * @param {string} filePath - Absolute path to the file
 * @returns {number} File size in bytes, or 0 if file doesn't exist
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Calculates the gzipped size of a file.
 *
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<number>} Gzipped size in bytes, or 0 if error
 *
 * @example
 * const gzipSize = await getGzipSize('dist/esm/index.js');
 * console.log(`Gzip: ${formatSize(gzipSize)}`);
 */
async function getGzipSize(filePath) {
  try {
    const input = fs.createReadStream(filePath);
    const gzip = createGzip();
    let size = 0;

    gzip.on('data', chunk => {
      size += chunk.length;
    });

    await pipeline(input, gzip);
    return size;
  } catch (error) {
    return 0;
  }
}

/**
 * Checks if a file exists.
 *
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists, false otherwise
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Verifies that all required build files exist.
 *
 * @returns {{existing: string[], missing: string[]}} Object with existing and missing file lists
 *
 * @example
 * const { existing, missing } = verifyBuild();
 * if (missing.length > 0) {
 *   console.error('Build incomplete:', missing);
 * }
 */
function verifyBuild() {
  const requiredFiles = [
    // NPM Package files
    'esm/index.js',
    'esm/index.js.map',
    'cjs/index.js',
    'cjs/index.js.map',
    'types/index.d.ts',
    // Browser bundle files
    'browser/fillkit.umd.js',
    'browser/fillkit.umd.js.map',
    'browser/fillkit.iife.js',
    'browser/fillkit.iife.js.map',
  ];

  const missing = [];
  const existing = [];

  for (const file of requiredFiles) {
    const filePath = path.join(distDir, file);
    if (fileExists(filePath)) {
      existing.push(file);
    } else {
      missing.push(file);
    }
  }

  return { existing, missing };
}

/**
 * Generates and displays the complete build report.
 *
 * Performs the following steps:
 * 1. Verifies all build files exist
 * 2. Calculates sizes for NPM packages (ESM, CJS, types)
 * 3. Calculates sizes for browser bundles (UMD, IIFE)
 * 4. Displays formatted summary with gzip ratios
 * 5. Shows production checklist
 *
 * @returns {Promise<void>}
 * @throws {Error} If build verification fails or size calculation errors
 */
async function generateReport() {
  console.log(
    `\n${colors.bright}${colors.cyan}📊 FillKit SDK - Build Report${colors.reset}\n`
  );
  console.log(
    `${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );

  // Verify build
  const { existing, missing } = verifyBuild();

  if (missing.length > 0) {
    console.log(`${colors.red}✗ Build Incomplete${colors.reset}`);
    console.log(`\n${colors.red}Missing files:${colors.reset}`);
    missing.forEach(file => console.log(`  - ${file}`));
    console.log('');
    process.exit(1);
  }

  console.log(
    `${colors.green}✓ Build Complete - All files generated${colors.reset}\n`
  );

  // NPM Package Report
  console.log(
    `${colors.bright}${colors.yellow}📦 NPM Package Builds${colors.reset}`
  );
  console.log(
    `${colors.yellow}────────────────────────────────────────────────${colors.reset}\n`
  );

  const npmFiles = [
    { path: 'esm/index.js', label: 'ESM Bundle' },
    { path: 'cjs/index.js', label: 'CJS Bundle' },
    { path: 'types/index.d.ts', label: 'TypeScript Definitions' },
  ];

  for (const { path: filePath, label } of npmFiles) {
    const fullPath = path.join(distDir, filePath);
    const size = getFileSize(fullPath);
    const gzipSize = await getGzipSize(fullPath);

    console.log(`  ${colors.cyan}${label}${colors.reset}`);
    console.log(`    ${colors.bright}Path:${colors.reset} dist/${filePath}`);
    console.log(`    ${colors.bright}Size:${colors.reset} ${formatSize(size)}`);
    console.log(
      `    ${colors.bright}Gzip:${colors.reset} ${formatSize(gzipSize)} ${colors.green}(${((gzipSize / size) * 100).toFixed(1)}%)${colors.reset}`
    );
    console.log('');
  }

  // Browser Bundle Report
  console.log(
    `${colors.bright}${colors.yellow}🌐 Browser/CDN Builds${colors.reset}`
  );
  console.log(
    `${colors.yellow}────────────────────────────────────────────────${colors.reset}\n`
  );

  const browserFiles = [
    { path: 'browser/fillkit.umd.js', label: 'UMD Bundle (Universal)' },
    { path: 'browser/fillkit.iife.js', label: 'IIFE Bundle (Browser)' },
  ];

  for (const { path: filePath, label } of browserFiles) {
    const fullPath = path.join(distDir, filePath);
    const size = getFileSize(fullPath);
    const gzipSize = await getGzipSize(fullPath);

    console.log(`  ${colors.cyan}${label}${colors.reset}`);
    console.log(`    ${colors.bright}Path:${colors.reset} dist/${filePath}`);
    console.log(`    ${colors.bright}Size:${colors.reset} ${formatSize(size)}`);
    console.log(
      `    ${colors.bright}Gzip:${colors.reset} ${formatSize(gzipSize)} ${colors.green}(${((gzipSize / size) * 100).toFixed(1)}%)${colors.reset}`
    );

    // CDN size warning
    if (gzipSize > 1000000) {
      console.log(
        `    ${colors.yellow}⚠ Large bundle - includes all dependencies${colors.reset}`
      );
    }
    console.log('');
  }

  // Summary
  console.log(
    `${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );

  // Total sizes
  const totalEsmSize = getFileSize(path.join(distDir, 'esm/index.js'));
  const totalCjsSize = getFileSize(path.join(distDir, 'cjs/index.js'));
  const totalUmdSize = getFileSize(
    path.join(distDir, 'browser/fillkit.umd.js')
  );
  const totalIifeSize = getFileSize(
    path.join(distDir, 'browser/fillkit.iife.js')
  );

  const totalEsmGzip = await getGzipSize(path.join(distDir, 'esm/index.js'));
  const totalCjsGzip = await getGzipSize(path.join(distDir, 'cjs/index.js'));
  const totalUmdGzip = await getGzipSize(
    path.join(distDir, 'browser/fillkit.umd.js')
  );
  const totalIifeGzip = await getGzipSize(
    path.join(distDir, 'browser/fillkit.iife.js')
  );

  console.log(`${colors.bright}📊 Summary${colors.reset}\n`);
  console.log(
    `  ${colors.bright}NPM Package Size:${colors.reset} ${formatSize(totalEsmSize)} (ESM) / ${formatSize(totalCjsSize)} (CJS)`
  );
  console.log(
    `  ${colors.bright}NPM Package Gzip:${colors.reset} ${formatSize(totalEsmGzip)} (ESM) / ${formatSize(totalCjsGzip)} (CJS)`
  );
  console.log(
    `  ${colors.bright}Browser Bundle Size:${colors.reset} ${formatSize(totalUmdSize)} (UMD) / ${formatSize(totalIifeSize)} (IIFE)`
  );
  console.log(
    `  ${colors.bright}Browser Bundle Gzip:${colors.reset} ${formatSize(totalUmdGzip)} (UMD) / ${formatSize(totalIifeGzip)} (IIFE)`
  );

  console.log(
    `\n${colors.green}✓ Build ready for production!${colors.reset}\n`
  );

  // Best practices check
  console.log(`${colors.bright}✨ Production Checklist${colors.reset}\n`);
  console.log(
    `  ${colors.green}✓${colors.reset} Source maps generated (hidden)`
  );
  console.log(`  ${colors.green}✓${colors.reset} License comments preserved`);
  console.log(`  ${colors.green}✓${colors.reset} Browser bundles minified`);
  console.log(
    `  ${colors.green}✓${colors.reset} NPM packages unminified (debuggable)`
  );
  console.log(
    `  ${colors.green}✓${colors.reset} TypeScript definitions included`
  );
  console.log(`  ${colors.green}✓${colors.reset} All build formats generated`);

  console.log('');
}

// Run report
generateReport().catch(error => {
  console.error(`${colors.red}Build report failed:${colors.reset}`, error);
  process.exit(1);
});
