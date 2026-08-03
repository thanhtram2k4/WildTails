#!/usr/bin/env node

/**
 * Cross-platform secret scanner for WildTails working tree.
 * Scans tracked files, modified unstaged files, and untracked non-ignored files
 * for potential secrets. Excludes known placeholder values.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PLACEHOLDER_PATTERNS = [
  'wildtails_local_dev',
  'wildtails',
  'changeme',
  'your_',
  'placeholder',
  'example',
  'xxx',
  'TODO',
  'REPLACE_ME',
];

const SECRET_KEY_PATTERN =
  /(?:password|secret|token|api[_-]?key|private[_-]?key|credentials?|auth[_-]?token)\s*[:=]\s*["']([^"']{8,})["']/gi;

const SCAN_DIRS = ['apps', 'packages', 'infra', '.github'];
const SCAN_ROOT_EXTENSIONS = ['.json', '.yml', '.yaml', '.ts', '.js', '.mjs', '.env.example'];

const EXCLUDE_DIRS = ['node_modules', 'dist', '.next', 'coverage', '.git'];
const EXCLUDE_FILES = ['pnpm-lock.yaml'];

let findings = [];

function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    EXCLUDE_DIRS.some((d) => normalized.includes(`/${d}/`) || normalized.startsWith(`${d}/`)) ||
    EXCLUDE_FILES.some((f) => normalized.endsWith(f))
  );
}

function isPlaceholder(value) {
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function scanFile(filePath) {
  try {
    const fullPath = path.resolve(ROOT, filePath);
    if (!existsSync(fullPath)) return;
    const stat = statSync(fullPath);
    if (stat.isDirectory() || stat.size > 1024 * 1024) return; // Skip dirs and large files

    const content = readFileSync(fullPath, 'utf-8');
    let match;
    SECRET_KEY_PATTERN.lastIndex = 0;
    while ((match = SECRET_KEY_PATTERN.exec(content)) !== null) {
      const value = match[1];
      if (value && !isPlaceholder(value)) {
        findings.push({
          file: filePath,
          key: match[0].substring(0, 60),
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }
  } catch {
    // Skip unreadable files
  }
}

function getFilesToScan() {
  const files = new Set();

  // 1. Tracked files in scan directories
  try {
    const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' }).trim().split('\n');
    for (const f of tracked) {
      if (f && !isExcluded(f)) {
        const inScanDir = SCAN_DIRS.some((d) => f.startsWith(d + '/') || f.startsWith(d + '\\'));
        const isRootFile =
          !f.includes('/') &&
          !f.includes('\\') &&
          SCAN_ROOT_EXTENSIONS.some((ext) => f.endsWith(ext));
        if (inScanDir || isRootFile) {
          files.add(f);
        }
      }
    }
  } catch {
    console.error('WARNING: Could not list tracked files');
  }

  // 2. Modified unstaged files
  try {
    const modified = execSync('git diff --name-only', { cwd: ROOT, encoding: 'utf-8' })
      .trim()
      .split('\n');
    for (const f of modified) {
      if (f && !isExcluded(f)) files.add(f);
    }
  } catch {
    // No modifications
  }

  // 3. Untracked non-ignored files
  try {
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd: ROOT,
      encoding: 'utf-8',
    })
      .trim()
      .split('\n');
    for (const f of untracked) {
      if (f && !isExcluded(f)) {
        // Flag .env files (but not .env.example)
        if (f.match(/\.env($|\.)/) && !f.includes('example')) {
          findings.push({
            file: f,
            key: 'UNTRACKED_ENV_FILE',
            line: 0,
          });
        }
        // Flag credential files (exclude known scripts like check-secrets.mjs)
        if (f.match(/credentials?|secret/i) && !f.match(/\.(mjs|js|ts|sh)$/)) {
          findings.push({
            file: f,
            key: 'UNTRACKED_SECRET_FILE',
            line: 0,
          });
        }
      }
    }
  } catch {
    // No untracked files
  }

  // 4. Check for tracked .env files (excluding .env.example)
  try {
    const trackedEnv = execSync('git ls-files *.env', { cwd: ROOT, encoding: 'utf-8' }).trim();
    if (trackedEnv) {
      const envFiles = trackedEnv.split('\n').filter((f) => f && !f.includes('example'));
      for (const f of envFiles) {
        findings.push({
          file: f,
          key: 'TRACKED_ENV_FILE',
          line: 0,
        });
      }
    }
  } catch {
    // No .env files tracked
  }

  return files;
}

// Main
console.log('WildTails Secret Scanner');
console.log('========================\n');

const files = getFilesToScan();
console.log(`Scanning ${files.size} files...\n`);

for (const file of files) {
  scanFile(file);
}

if (findings.length === 0) {
  console.log('OK: No potential secrets found.');
  console.log('\nScan complete. Working tree is clean.');
  process.exit(0);
} else {
  console.error(`ALERT: Found ${findings.length} potential secret(s):\n`);
  for (const f of findings) {
    if (f.line > 0) {
      console.error(`  ${f.file}:${f.line} - ${f.key}`);
    } else {
      console.error(`  ${f.file} - ${f.key}`);
    }
  }
  console.error('\nPlease review and remove any real secrets before committing.');
  process.exit(1);
}
