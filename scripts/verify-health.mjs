#!/usr/bin/env node

/**
 * Cross-platform health verification for WildTails applications.
 * Starts API, Worker, and Web, checks their health endpoints, then cleans up.
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const services = [
  {
    name: 'api',
    filter: '@wildtails/api',
    port: process.env.API_PORT || '3000',
    expected: { status: 'ok', service: 'wildtails-api' },
  },
  {
    name: 'worker',
    filter: '@wildtails/worker',
    port: process.env.WORKER_PORT || '3001',
    expected: { status: 'ok', service: 'wildtails-worker' },
  },
  {
    name: 'web',
    filter: '@wildtails/web',
    port: process.env.WEB_PORT || '3100',
    expected: { status: 'ok', service: 'wildtails-web' },
  },
];

const children = [];

function killAll() {
  for (const child of children) {
    try {
      if (child.pid && !child.killed) {
        // On Windows, use taskkill to kill the process tree
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
          });
        } else {
          process.kill(-child.pid, 'SIGTERM');
        }
      }
    } catch {
      // Process may have already exited
    }
  }
}

async function waitForHealth(port, maxAttempts = 30, intervalMs = 2000) {
  const url = `http://localhost:${port}/health`;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        return { ok: true, body, status: res.status };
      }
    } catch {
      // Service not ready yet
    }
    await sleep(intervalMs);
  }
  return { ok: false, body: null, status: 0 };
}

async function main() {
  const checkOrphansOnly = process.argv.includes('--check-no-orphans');

  if (checkOrphansOnly) {
    // Just verify no processes are listening on the expected ports
    let orphanFound = false;
    for (const svc of services) {
      try {
        const res = await fetch(`http://localhost:${svc.port}/health`);
        if (res.ok) {
          console.error(`ERROR: Orphan process found on port ${svc.port} (${svc.name})`);
          orphanFound = true;
        }
      } catch {
        // Expected - no process listening
      }
    }
    if (orphanFound) {
      process.exit(1);
    }
    console.log('OK: No orphan application processes found.');
    process.exit(0);
  }

  console.log('Starting WildTails health verification...\n');

  let exitCode = 0;

  try {
    // Start all services
    for (const svc of services) {
      console.log(`Starting ${svc.name}...`);
      const child = spawn('pnpm', ['--filter', svc.filter, 'dev'], {
        cwd: ROOT,
        stdio: 'pipe',
        shell: true,
        detached: process.platform !== 'win32',
      });
      children.push(child);

      child.stderr?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg && !msg.includes('ExperimentalWarning')) {
          // Only log unexpected errors
        }
      });
    }

    // Wait a moment for processes to start
    await sleep(3000);

    // Check health endpoints
    const results = [];
    for (const svc of services) {
      process.stdout.write(`Checking ${svc.name} health (port ${svc.port})... `);
      const result = await waitForHealth(svc.port);

      if (!result.ok) {
        console.log('FAIL (timeout)');
        results.push({ name: svc.name, pass: false, reason: 'Health endpoint did not respond' });
        continue;
      }

      if (result.status !== 200) {
        console.log(`FAIL (HTTP ${result.status})`);
        results.push({ name: svc.name, pass: false, reason: `HTTP ${result.status}` });
        continue;
      }

      const bodyMatch =
        result.body &&
        result.body.status === svc.expected.status &&
        result.body.service === svc.expected.service;

      if (!bodyMatch) {
        console.log(`FAIL (unexpected body: ${JSON.stringify(result.body)})`);
        results.push({
          name: svc.name,
          pass: false,
          reason: `Expected ${JSON.stringify(svc.expected)}, got ${JSON.stringify(result.body)}`,
        });
        continue;
      }

      console.log(`OK (${JSON.stringify(result.body)})`);
      results.push({ name: svc.name, pass: true, body: result.body });
    }

    // Summary
    console.log('\n--- Health Verification Summary ---');
    for (const r of results) {
      console.log(`  ${r.pass ? 'PASS' : 'FAIL'}: ${r.name}${r.reason ? ' - ' + r.reason : ''}`);
    }

    const allPassed = results.every((r) => r.pass);
    if (allPassed) {
      console.log('\nAll health checks passed.');
    } else {
      console.error('\nSome health checks failed.');
      exitCode = 1;
    }
  } finally {
    console.log('\nCleaning up processes...');
    killAll();
    // Give processes time to terminate
    await sleep(2000);
    console.log('Cleanup complete.');
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  killAll();
  process.exit(1);
});
