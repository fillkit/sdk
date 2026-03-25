#!/usr/bin/env node

/**
 * Prepares @fillkit/browser package for publishing.
 *
 * Copies browser bundles from dist/browser to packages/browser directory,
 * making them ready for npm publishing as a separate package.
 *
 * **Purpose:**
 * The @fillkit/browser package provides standalone browser bundles (UMD, IIFE)
 * that can be used via CDN without a build step. This script prepares the
 * package by copying the built bundles to the package directory.
 *
 * **Files Copied:**
 * - `fillkit.iife.js`: IIFE bundle for direct browser usage
 * - `fillkit.umd.js`: UMD bundle for universal module loading
 *
 * **Workflow:**
 * 1. Verify dist/browser directory exists
 * 2. Copy browser bundles to packages/browser
 * 3. Display success message with next steps
 *
 * **Usage:**
 * ```bash
 * node scripts/prepare-browser-package.js
 * # Or via npm script:
 * yarn prepare:browser
 * ```
 *
 * **Exit Codes:**
 * - 0: Success (all files copied)
 * - 1: Error (dist/browser not found, build required)
 */

import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const distBrowserDir = join(rootDir, 'dist', 'browser');
const browserPackageDir = join(rootDir, 'packages', 'browser');

const filesToCopy = ['fillkit.iife.js', 'fillkit.umd.js'];

console.log('📦 Preparing @fillkit/browser package...\n');

// Check if dist/browser exists
if (!existsSync(distBrowserDir)) {
  console.error('❌ Error: dist/browser directory not found.');
  console.error('   Please run "npm run build" first.\n');
  process.exit(1);
}

// Copy browser bundles
let copiedCount = 0;
for (const file of filesToCopy) {
  const srcPath = join(distBrowserDir, file);
  const destPath = join(browserPackageDir, file);

  if (!existsSync(srcPath)) {
    console.error(`❌ Error: ${file} not found in dist/browser`);
    continue;
  }

  try {
    copyFileSync(srcPath, destPath);
    console.log(`✓ Copied ${file}`);
    copiedCount++;
  } catch (error) {
    console.error(`❌ Error copying ${file}:`, error.message);
  }
}

console.log(
  `\n✅ Prepared @fillkit/browser package (${copiedCount}/${filesToCopy.length} files copied)`
);
console.log(`   Location: packages/browser/`);
console.log(`\nNext steps:`);
console.log(`   cd packages/browser`);
console.log(`   npm publish --access public\n`);
