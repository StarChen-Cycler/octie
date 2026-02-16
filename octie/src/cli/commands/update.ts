/**
 * Update command - Update an existing task
 */

import { Command } from 'commander';
import { getProjectPath, loadGraph, saveGraph, success, error } from '../utils/helpers.js';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
  .option('--remove-deliverable <id>', 'Remove a deliverable by ID')
  .option('--add-success-criterion <text>', 'Add a success criterion')
  .option('--complete-criterion <id>', 'Mark success criterion as complete')
  .option('--remove-criterion <id>', 'Remove a success criterion by ID')
  .option('--block <id>', 'Add a blocker')
  .option('--unblock <id>', 'Remove a blocker')
  .option('--add-dependency <id>', 'Add a dependency')
  .option('--remove-dependency <id>', 'Remove a dependency')
  .option('--add-related-file <path>', 'Add a related file path')
  .option('--remove-related-file <path>', 'Remove a related file path')
  .option('--verify-c7 <library:notes>', 'Add C7 library verification (format: library-id or library-id:notes)')
  .option('--remove-c7-verified <library>', 'Remove a C7 verification by library ID')
  .option('--notes <text>', 'Append to notes')
  .option('--notes-file <path>', 'Read notes from file and append (multi-line notes support)')
  .action(async (id, options, command) => {
    try {
      // Get global options
      const globalOpts = command.parent?.opts() || {};
      const projectPath = await getProjectPath(globalOpts.project);
      const graph = await loadGraph(projectPath);

      const task = graph.getNodeByIdOrPrefix(id);
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

      // Remove deliverable
      if (options.removeDeliverable) {
        task.removeDeliverable(options.removeDeliverable);
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

      // Remove criterion
      if (options.removeCriterion) {
        task.removeSuccessCriterion(options.removeCriterion);
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

      // Remove dependency
      if (options.removeDependency) {
        task.removeDependency(options.removeDependency);
        updated = true;
      }

      // Add related file
      if (options.addRelatedFile) {
        task.addRelatedFile(options.addRelatedFile);
        updated = true;
      }

      // Remove related file
      if (options.removeRelatedFile) {
        task.removeRelatedFile(options.removeRelatedFile);
        updated = true;
      }

      // Add C7 verification
      if (options.verifyC7) {
        const entry = options.verifyC7 as string;
        // Handle Windows Git Bash path conversion: "/path" becomes "C:/Program Files/Git/path"
        // Detect and strip the Git Bash prefix
        let cleanEntry = entry;
        const gitBashPrefix = /^[A-Za-z]:\/(\/)?Program Files\/Git\//;
        if (gitBashPrefix.test(entry)) {
          // Extract the original Unix path after "Program Files/Git/"
          const match = entry.match(/Program Files\/Git\/(.*)$/);
          if (match) {
            cleanEntry = '/' + match[1];
          }
        }

        // Now parse the library-id:notes format
        const colonIndex = cleanEntry.indexOf(':');
        if (colonIndex === -1) {
          task.addC7Verification({
            library_id: cleanEntry.trim(),
            verified_at: new Date().toISOString(),
          });
        } else {
          task.addC7Verification({
            library_id: cleanEntry.substring(0, colonIndex).trim(),
            verified_at: new Date().toISOString(),
            notes: cleanEntry.substring(colonIndex + 1).trim(),
          });
        }
        updated = true;
      }

      // Remove C7 verification
      if (options.removeC7Verified) {
        // Handle Windows Git Bash path conversion: "/path" becomes "C:/Program Files/Git/path"
        let libraryId = options.removeC7Verified as string;
        const gitBashPrefix = /^[A-Za-z]:\/(\/)?Program Files\/Git\//;
        if (gitBashPrefix.test(libraryId)) {
          const match = libraryId.match(/Program Files\/Git\/(.*)$/);
          if (match) {
            libraryId = '/' + match[1];
          }
        }
        task.removeC7Verification(libraryId);
        updated = true;
      }

      // Append notes
      if (options.notes) {
        task.appendNotes(options.notes);
        updated = true;
      }

      // Append notes from file
      if (options.notesFile) {
        const notesPath = resolve(options.notesFile);
        if (!existsSync(notesPath)) {
          error(`Notes file not found: ${notesPath}`);
          process.exit(1);
        }
        try {
          const fileContent = readFileSync(notesPath, 'utf-8').trim();
          task.appendNotes(fileContent);
          updated = true;
        } catch (err) {
          error(`Failed to read notes file: ${err instanceof Error ? err.message : 'Unknown error'}`);
          process.exit(1);
        }
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
