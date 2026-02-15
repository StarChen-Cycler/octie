/**
 * Update command - Update an existing task
 */

import { Command } from 'commander';
import { getProjectPath, loadGraph, saveGraph, success, error } from '../utils/helpers.js';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';

/**
 * Create the update command
 */
export const updateCommand = new Command('update')
  .description('Update an existing task')
  .argument('<id>', 'Task ID to update')
  .option('--status <status>', 'Task status')
  .option('--priority <priority>', 'Task priority')
  .option('--add-deliverable <text>', 'Add a deliverable')
  .option('--complete-deliverable <id>', 'Mark deliverable as complete')
  .option('--add-success-criterion <text>', 'Add a success criterion')
  .option('--complete-criterion <id>', 'Mark success criterion as complete')
  .option('--block <id>', 'Add a blocker')
  .option('--unblock <id>', 'Remove a blocker')
  .option('--add-dependency <id>', 'Add a dependency')
  .option('--notes <text>', 'Append to notes')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (id, options) => {
    try {
      const projectPath = await getProjectPath(options.project);
      const graph = await loadGraph(projectPath);

      const task = graph.getNode(id);
      if (!task) {
        error(`Task not found: ${id}`);
        process.exit(1);
      }

      let updated = false;

      // Update status
      if (options.status) {
        task.setStatus(options.status);
        updated = true;
      }

      // Update priority
      if (options.priority) {
        task.setPriority(options.priority);
        updated = true;
      }

      // Add deliverable
      if (options.addDeliverable) {
        task.addDeliverable({
          id: randomUUID(),
          text: options.addDeliverable,
          completed: false,
        });
        updated = true;
      }

      // Complete deliverable
      if (options.completeDeliverable) {
        task.completeDeliverable(options.completeDeliverable);
        updated = true;
      }

      // Add success criterion
      if (options.addSuccessCriterion) {
        task.addSuccessCriterion({
          id: randomUUID(),
          text: options.addSuccessCriterion,
          completed: false,
        });
        updated = true;
      }

      // Complete criterion
      if (options.completeCriterion) {
        task.completeCriterion(options.completeCriterion);
        updated = true;
      }

      // Add blocker
      if (options.block) {
        task.addBlocker(options.block);
        graph.addEdge(options.block, id);
        updated = true;
      }

      // Remove blocker
      if (options.unblock) {
        task.removeBlocker(options.unblock);
        graph.removeEdge(options.unblock, id);
        updated = true;
      }

      // Add dependency
      if (options.addDependency) {
        task.addDependency(options.addDependency);
        updated = true;
      }

      // Append notes
      if (options.notes) {
        task.appendNotes(options.notes);
        updated = true;
      }

      if (!updated) {
        error('No updates specified');
        process.exit(1);
      }

      // Update in graph
      graph.updateNode(task);

      // Save
      await saveGraph(projectPath, graph);

      success(`Task updated: ${chalk.cyan(id)}`);

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to update task');
      }
      process.exit(1);
    }
  });
