#!/usr/bin/env node

/**
 * Octie CLI - Graph-based task management system
 * Main entry point for all CLI commands
 */

import { Command, InvalidArgumentError } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { createCommand } from './commands/create.js';
import { listCommand } from './commands/list.js';
import { getCommand } from './commands/get.js';
import { updateCommand } from './commands/update.js';
import { deleteCommand } from './commands/delete.js';
import { mergeCommand } from './commands/merge.js';
import { graphCommand } from './commands/graph.js';
import { exportCommand } from './commands/export.js';
import { importCommand } from './commands/import.js';
import { serveCommand } from './commands/serve.js';

// Version from package.json
const VERSION = '1.0.0';

/**
 * Error handler middleware
 */
function handleError(error: unknown): void {
  if (error instanceof InvalidArgumentError) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.error(error.stack);
    }
    process.exit(1);
  }

  console.error(chalk.red('Unknown error occurred'));
  process.exit(1);
}

/**
 * Create and configure the CLI program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('octie')
    .description('Graph-based task management system')
    .version(VERSION, '-v, --version', 'Display version number')
    .configureOutput({
      writeErr: (str) => console.error(chalk.red(str)),
      writeOut: (str) => console.log(str),
    });

  // Global options
  program
    .option('-p, --project <path>', 'Path to Octie project directory')
    .option('--format <format>', 'Output format: json, md, table', 'table')
    .option('--verbose', 'Enable verbose output')
    .option('--quiet', 'Suppress non-error output')
    .configureHelp({
      sortSubcommands: true,
      showGlobalOptions: true,
    });

  // Error handling
  program.exitOverride(handleError);

  return program;
}

/**
 * Main entry point
 */
function main(): void {
  const program = createProgram();

  // Register commands
  program.addCommand(initCommand);
  program.addCommand(createCommand);
  program.addCommand(listCommand);
  program.addCommand(getCommand);
  program.addCommand(updateCommand);
  program.addCommand(deleteCommand);
  program.addCommand(mergeCommand);
  program.addCommand(graphCommand);
  program.addCommand(exportCommand);
  program.addCommand(importCommand);
  program.addCommand(serveCommand);

  // Parse arguments
  program.parse(process.argv);

  // Show help if no command provided
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

// Run CLI
main();
