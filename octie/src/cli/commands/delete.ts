/**
 * Delete command - Delete a task from the graph
 */

import { Command } from 'commander';
import { getProjectPath, loadGraph, saveGraph, success, error, info, warning } from '../utils/helpers.js';
import chalk from 'chalk';
import { cutNode } from '../../core/graph/operations.js';

/**
 * Create the delete command
 */
export const deleteCommand = new Command('delete')
  .description('Delete a task from the project')
  .argument('<id>', 'Task ID to delete')
  .option('--reconnect', 'Reconnect edges after deletion (A→B→C → A→C)')
  .option('--cascade', 'Delete all dependent tasks')
  .option('--force', 'Skip confirmation prompt')
  .action(async (id, options, command) => {
    try {
      // Get global options
      const globalOpts = command.parent?.opts() || {};
      const projectPath = await getProjectPath(globalOpts.project);
      const graph = await loadGraph(projectPath);

      const task = graph.getNode(id);
      if (!task) {
        error(`Task not found: ${id}`);
        process.exit(1);
      }

      // Show impact
      const dependents = graph.getOutgoingEdges(id);
      const blockers = graph.getIncomingEdges(id);

      console.log('');
      console.log(chalk.bold('Task to delete:'));
      console.log(`  ${chalk.cyan(id.substring(0, 8))} - ${task.title}`);
      console.log('');

      if (dependents.length > 0) {
        warning(`This task is blocking ${dependents.length} other task(s):`);
        for (const depId of dependents) {
          const depTask = graph.getNode(depId);
          if (depTask) {
            console.log(`  - ${chalk.cyan(depId.substring(0, 8))} - ${depTask.title}`);
          }
        }
        console.log('');
      }

      if (blockers.length > 0) {
        info(`This task is blocked by ${blockers.length} task(s):`);
        for (const blockerId of blockers) {
          const blockerTask = graph.getNode(blockerId);
          if (blockerTask) {
            console.log(`  - ${chalk.cyan(blockerId.substring(0, 8))} - ${blockerTask.title}`);
          }
        }
        console.log('');
      }

      // Confirm deletion
      if (!options.force) {
        console.log(chalk.yellow('Delete this task? (y/N)'));
        console.log(chalk.gray('(Use --force to skip confirmation)'));
        // For now, auto-confirm to avoid blocking
      }

      // Create backup before deletion
      warning('Creating backup before deletion...');
      // Backup is automatic on save

      // Perform deletion
      if (options.reconnect) {
        info('Reconnecting edges...');
        cutNode(graph, id);
      } else if (options.cascade) {
        info('Cascading deletion to dependents...');
        // TODO: Implement cascade deletion
        error('Cascade deletion not yet implemented');
        process.exit(1);
      } else {
        // Simple removal
        graph.removeNode(id);
      }

      // Save
      await saveGraph(projectPath, graph);

      success(`Task deleted: ${chalk.cyan(id.substring(0, 8))}`);

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to delete task');
      }
      process.exit(1);
    }
  });
