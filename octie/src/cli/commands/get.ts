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
  .argument('<id>', 'Task ID')
  .option('-f, --format <format>', 'Output format: json, md, table', 'table')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (id, options) => {
    try {
      // Load project
      const projectPath = await getProjectPath(options.project);
      const graph = await loadGraph(projectPath);

      // Find task
      const task = graph.getNode(id);

      if (!task) {
        error(chalk.red(`Task not found: ${id}`));
        process.exit(1);
      }

      // Format output
      switch (options.format) {
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
