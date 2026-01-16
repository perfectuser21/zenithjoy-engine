#!/usr/bin/env node
/**
 * Cecilia CLI
 * Entry point for N8N SSH calls
 *
 * Usage:
 *   cecilia -p ./prd.json -c CP-001
 *   cecilia -p notion:abc123 -c CP-002 -m claude-code
 *   cecilia --prd ./prd.json --all
 */

import { parseArgs } from 'util';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { PRD } from './types';
import { Executor } from './executor';

interface CLIArgs {
  prd: string;
  checkpoint?: string;
  model?: string;
  workdir?: string;
  all?: boolean;
  health?: boolean;
  help?: boolean;
}

function printHelp(): void {
  console.log(`
Cecilia - Multi-Model AI Code Executor

Usage:
  cecilia -p <prd> -c <checkpoint> [options]
  cecilia -p <prd> --all [options]
  cecilia --health

Options:
  -p, --prd <path>        PRD file path or Notion page ID (notion:xxx)
  -c, --checkpoint <id>   Checkpoint ID to execute (e.g., CP-001)
  -m, --model <name>      Force specific model (claude-code, codex, gemini)
  -w, --workdir <path>    Working directory (default: current directory)
  --all                   Run all pending checkpoints
  --health                Check health of all adapters
  -h, --help              Show this help message

Examples:
  cecilia -p ./prd.json -c CP-001
  cecilia -p ./prd.json -c CP-002 -m claude-code
  cecilia -p notion:abc123def --all
  cecilia --health
`);
}

function parseArguments(): CLIArgs {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      prd: { type: 'string', short: 'p' },
      checkpoint: { type: 'string', short: 'c' },
      model: { type: 'string', short: 'm' },
      workdir: { type: 'string', short: 'w' },
      all: { type: 'boolean' },
      health: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  return values as CLIArgs;
}

async function loadPRD(prdPath: string): Promise<PRD> {
  // Check if it's a Notion page ID
  if (prdPath.startsWith('notion:')) {
    const pageId = prdPath.slice(7);
    // TODO: Implement Notion loading
    throw new Error(`Notion loading not yet implemented: ${pageId}`);
  }

  // Load from file
  const fullPath = resolve(process.cwd(), prdPath);
  if (!existsSync(fullPath)) {
    throw new Error(`PRD file not found: ${fullPath}`);
  }

  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as PRD;
}

async function runHealthCheck(): Promise<void> {
  const executor = new Executor();
  const router = executor.getRouter();
  const results = await router.healthCheck();

  console.log('\nAdapter Health Check:');
  console.log('─'.repeat(40));

  for (const [name, healthy] of Object.entries(results)) {
    const status = healthy ? '✓ OK' : '✗ FAIL';
    const icon = healthy ? '🟢' : '🔴';
    console.log(`${icon} ${name.padEnd(15)} ${status}`);
  }

  const allHealthy = Object.values(results).every(Boolean);
  process.exit(allHealthy ? 0 : 1);
}

async function main(): Promise<void> {
  const args = parseArguments();

  // Help
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Health check
  if (args.health) {
    await runHealthCheck();
    return;
  }

  // Validate required args
  if (!args.prd) {
    console.error('Error: --prd is required');
    printHelp();
    process.exit(1);
  }

  if (!args.checkpoint && !args.all) {
    console.error('Error: --checkpoint or --all is required');
    printHelp();
    process.exit(1);
  }

  try {
    // Load PRD
    const prd = await loadPRD(args.prd);
    const workDir = args.workdir
      ? resolve(process.cwd(), args.workdir)
      : process.cwd();

    // Create executor
    const executor = new Executor();

    if (args.all) {
      // Run all checkpoints
      console.log(`Running all checkpoints in ${prd.meta.project}...`);
      const results = await executor.runAll(prd, {
        model: args.model,
        workDir,
      });

      // Output summary
      const summary = {
        total: results.size,
        success: [...results.values()].filter((r) => r.success).length,
        failed: [...results.values()].filter((r) => !r.success).length,
        results: Object.fromEntries(results),
      };

      console.log(JSON.stringify(summary, null, 2));

      const allSuccess = summary.failed === 0;
      process.exit(allSuccess ? 0 : 1);
    } else {
      // Run single checkpoint
      console.log(`Running checkpoint ${args.checkpoint}...`);
      const result = await executor.runCheckpoint(prd, args.checkpoint!, {
        model: args.model,
        workDir,
      });

      // Output JSON result for N8N parsing
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ success: false, error: errorMessage }));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
