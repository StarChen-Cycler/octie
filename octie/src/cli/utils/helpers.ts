/**
 * CLI utility functions
 */

import chalk from 'chalk';
import path from 'node:path';
import { findProjectPath, TaskStorage } from '../../core/storage/file-store.js';
import type { TaskGraphStore } from '../../core/graph/index.js';

/**
 * Get the project path from options or auto-detect
 */
export async function getProjectPath(projectOption?: string): Promise<string> {
  if (projectOption) {
    return path.resolve(projectOption);
  }

  // Auto-detect project path
  const detectedPath = await findProjectPath();
  if (detectedPath) {
    return detectedPath;
  }

  throw new Error(
    'No Octie project found. Run `octie init` first or specify --project <path>'
  );
}

/**
 * Load the project graph
 */
export async function loadGraph(projectPath: string): Promise<TaskGraphStore> {
  const storage = new TaskStorage({ projectDir: projectPath });

  if (!(await storage.exists())) {
    throw new Error(`No Octie project found at ${projectPath}`);
  }

  return await storage.load();
}

/**
 * Save the project graph
 */
export async function saveGraph(projectPath: string, graph: TaskGraphStore): Promise<void> {
  const storage = new TaskStorage({ projectDir: projectPath });
  await storage.save(graph);
}

/**
 * Format success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Format error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Format warning message
 */
export function warning(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

/**
 * Format info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Format verbose message (only shown if --verbose flag is set)
 */
export function verbose(message: string, verbose: boolean): void {
  if (verbose) {
    console.log(chalk.gray(message));
  }
}

/**
 * Create a spinner for long-running operations
 */
export function createSpinner(message: string, enabled: boolean) {
  // Simple spinner implementation
  let dots = 0;
  let interval: NodeJS.Timeout | null = null;

  return {
    start: () => {
      if (!enabled) return;
      process.stdout.write(`\r${chalk.cyan('○')} ${message}`);
      interval = setInterval(() => {
        dots = (dots + 1) % 4;
        const dotStr = '.'.repeat(dots);
        process.stdout.write(`\r${chalk.cyan('○')} ${message}${dotStr}`);
      }, 100);
    },
    stop: (finalMessage: string) => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (enabled) {
        process.stdout.write(`\r${chalk.green('✓')} ${finalMessage}\n`);
      }
    },
    fail: (finalMessage: string) => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (enabled) {
        process.stdout.write(`\r${chalk.red('✗')} ${finalMessage}\n`);
      }
    },
  };
}

/**
 * Parse comma-separated list
 */
export function parseList(value: string): string[] {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Format task ID for display
 */
export function formatTaskId(id: string): string {
  return chalk.cyan(id);
}

/**
 * Format status for display
 */
export function formatStatus(status: string): string {
  const statusColors: Record<string, (msg: string) => string> = {
    not_started: chalk.gray,
    pending: chalk.yellow,
    in_progress: chalk.blue,
    completed: chalk.green,
    blocked: chalk.red,
  };

  const colorFn = statusColors[status] || chalk.white;
  return colorFn(status.replace('_', ' '));
}

/**
 * Format priority for display
 */
export function formatPriority(priority: string): string {
  const priorityColors: Record<string, (msg: string) => string> = {
    top: chalk.red,
    second: chalk.yellow,
    later: chalk.gray,
  };

  const colorFn = priorityColors[priority] || chalk.white;
  return colorFn(priority);
}

/**
 * Truncate text to fit width
 */
export function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.substring(0, maxWidth - 3) + '...';
}
