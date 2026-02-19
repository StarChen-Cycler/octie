/**
 * Get command - Retrieve and display task details
 */

import { Command } from 'commander';
import { getProjectPath, loadGraph, error } from '../utils/helpers.js';
import { formatTaskMarkdown } from '../output/markdown.js';
import { formatTaskJSON } from '../output/json.js';
import { formatTaskDetailTable } from '../output/table.js';
import chalk from 'chalk';

/**
 * Create the get command
 */
export const getCommand = new Command('get')
  .description('Get task details')
  .argument('<id>', 'Task ID (full UUID or first 7-8 characters)')
  .addHelpText('after', `
Task ID Format:
  • Full UUID:  12345678-1234-1234-1234-123456789012
  • Short UUID: First 7-8 characters (e.g., 12345678)

Output Formats (use global --format option):
  table   - Formatted table view (default)
  json    - Full JSON representation
  md      - Markdown format for documentation

Examples:
  $ octie get abc12345
  $ octie get abc12345 --format json
  $ octie get abc12345 --format md

Global Options:
  --format <format>   Output format: table, json, md
  --project <path>    Project directory path
`)
  .action(async (id, _options, command) => {
    try {
      // Get global options
      const globalOpts = command.parent?.opts() || {};
      const format = globalOpts.format || 'table';

      // Load project
      const projectPath = await getProjectPath(globalOpts.project);
      const graph = await loadGraph(projectPath);

      // Find task (supports full UUID or short prefix)
      const task = graph.getNodeByIdOrPrefix(id);

      if (!task) {
        error(chalk.red(`Task not found: ${id}`));
        process.exit(1);
      }

      // Format output
      switch (format) {
        case 'json':
          console.log(formatTaskJSON(task));
          break;

        case 'md':
          console.log(formatTaskMarkdown(task));
          break;

        case 'table':
        default:
          console.log(formatTaskDetailTable(task));
          break;
      }

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        console.error(chalk.red(`Error: ${err.message}`));
      } else {
        console.error(chalk.red('Failed to get task'));
      }
      process.exit(1);
    }
  });
