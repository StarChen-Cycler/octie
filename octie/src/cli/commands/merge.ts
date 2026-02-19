/**
 * Merge command - Merge two tasks into one
 */

import { Command } from 'commander';
import { getProjectPath, loadGraph, saveGraph, success, error, info, confirmPrompt } from '../utils/helpers.js';
import chalk from 'chalk';
import { mergeTasks } from '../../core/graph/operations.js';

/**
 * Create the merge command
 */
export const mergeCommand = new Command('merge')
  .description('Merge two tasks into one')
  .argument('<sourceId>', 'Source task ID (will be deleted)')
  .argument('<targetId>', 'Target task ID (will receive merged content)')
  .option('--force', 'Skip confirmation prompt')
  .action(async (sourceId, targetId, options, command) => {
    try {
      // Get global options
      const globalOpts = command.parent?.opts() || {};
      const projectPath = await getProjectPath(globalOpts.project);
      const graph = await loadGraph(projectPath);

      // Support short UUID prefix lookup
      const sourceTask = graph.getNodeByIdOrPrefix(sourceId);
      const targetTask = graph.getNodeByIdOrPrefix(targetId);

      if (!sourceTask) {
        error(`Source task not found: ${sourceId}`);
        process.exit(1);
      }

      if (!targetTask) {
        error(`Target task not found: ${targetId}`);
        process.exit(1);
      }

      // Use full IDs for all subsequent operations
      const fullSourceId = sourceTask.id;
      const fullTargetId = targetTask.id;

      if (fullSourceId === fullTargetId) {
        error('Cannot merge a task with itself');
        process.exit(1);
      }

      // Show preview
      console.log('');
      console.log(chalk.bold('Merge Preview:'));
      console.log('');

      console.log(chalk.gray('Source task (will be deleted):'));
      console.log(`  ${chalk.cyan(fullSourceId.substring(0, 8))} - ${sourceTask.title}`);
      console.log(`  Criteria: ${sourceTask.success_criteria.length}`);
      console.log(`  Deliverables: ${sourceTask.deliverables.length}`);
      console.log('');

      console.log(chalk.gray('Target task (will receive merged content):'));
      console.log(`  ${chalk.cyan(fullTargetId.substring(0, 8))} - ${targetTask.title}`);
      console.log(`  Criteria: ${targetTask.success_criteria.length}`);
      console.log(`  Deliverables: ${targetTask.deliverables.length}`);
      console.log('');

      console.log(chalk.yellow('After merge:'));
      console.log(`  Combined criteria: ${sourceTask.success_criteria.length + targetTask.success_criteria.length}`);
      console.log(`  Combined deliverables: ${sourceTask.deliverables.length + targetTask.deliverables.length}`);
      console.log('');

      // Confirm
      if (!options.force) {
        console.log(chalk.gray('(Use --force to skip confirmation)'));
        const confirmed = await confirmPrompt(chalk.yellow('Merge these tasks? (y/N)'));
        if (!confirmed) {
          info('Merge cancelled');
          process.exit(0);
        }
      }

      // Perform merge (ignore return value for now)
      mergeTasks(graph, fullSourceId, fullTargetId);

      // Save
      await saveGraph(projectPath, graph);

      success(`Tasks merged`);
      info(`Source deleted: ${chalk.cyan(fullSourceId.substring(0, 8))}`);
      info(`Target updated: ${chalk.cyan(fullTargetId.substring(0, 8))}`);

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to merge tasks');
      }
      process.exit(1);
    }
  });
