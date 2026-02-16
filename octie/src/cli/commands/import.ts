/**
 * Import command - Import project data from file
 */

import { Command } from 'commander';
import { TaskStorage } from '../../core/storage/file-store.js';
import { getProjectPath, success, error, warning } from '../utils/helpers.js';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'node:fs';
import { TaskGraphStore } from '../../core/graph/index.js';
import { TaskNode } from '../../core/models/task-node.js';
import { resolve } from 'node:path';

/**
 * Auto-detect format from file extension
 */
function detectFormat(filePath: string): 'json' | null {
  const ext = filePath.toLowerCase().split('.').pop();
  if (ext === 'json') return 'json';
  return null;
}

/**
 * Validate imported data structure
 */
function validateImportData(data: any): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: must be an object');
  }

  // Check for tasks format (from project file export)
  if (data.version && data.format && data.tasks) {
    // Full project file format
    if (!data.tasks || typeof data.tasks !== 'object') {
      throw new Error('Invalid project file: missing or invalid tasks object');
    }
    return;
  }

  // Check for nodes format (from toJSON() export)
  if (data.nodes && typeof data.nodes === 'object') {
    return;
  }

  // Check for simple task array format
  if (Array.isArray(data)) {
    for (const task of data) {
      if (!task.id || !task.title) {
        throw new Error('Invalid task data: missing id or title');
      }
    }
    return;
  }

  // Single task format
  if (data.id && data.title) {
    return;
  }

  throw new Error('Unrecognized data format. Expected project file, task array, or single task.');
}

/**
 * Create TaskGraphStore from various import formats
 */
function createGraphFromImportData(data: any): TaskGraphStore {
  // Handle nodes format (from toJSON() export)
  if (data.nodes && data.outgoingEdges !== undefined && data.incomingEdges !== undefined) {
    return TaskGraphStore.fromJSON(data);
  }

  // Handle tasks format (from project file export)
  if (data.tasks && typeof data.tasks === 'object') {
    const metadata = data.metadata || {
      project_name: 'imported-project',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_count: Object.keys(data.tasks || {}).length,
    };

    const store = new TaskGraphStore(metadata);

    // Add tasks
    for (const [, taskData] of Object.entries(data.tasks)) {
      const node = TaskNode.fromJSON(taskData as any);
      store.addNode(node);
    }

    return store;
  }

  // Handle task array format
  if (Array.isArray(data)) {
    const metadata = {
      project_name: 'imported-project',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_count: data.length,
    };

    const store = new TaskGraphStore(metadata);

    for (const taskData of data) {
      const node = TaskNode.fromJSON(taskData);
      store.addNode(node);
    }

    return store;
  }

  // Handle single task format
  if (data.id && data.title) {
    const metadata = {
      project_name: 'imported-project',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_count: 1,
    };

    const store = new TaskGraphStore(metadata);
    const node = TaskNode.fromJSON(data);
    store.addNode(node);

    return store;
  }

  throw new Error('Could not convert import data to graph format');
}

/**
 * Create the import command
 */
export const importCommand = new Command('import')
  .description('Import tasks from file')
  .argument('<file>', 'File path to import')
  .option('--format <format>', 'Import format: json (auto-detect if not specified)')
  .option('--merge', 'Merge with existing tasks instead of replacing')
  .action(async (file, options, command) => {
    try {
      // Get global options
      const globalOpts = command.parent?.opts() || {};
      const projectPath = await getProjectPath(globalOpts.project);
      const storage = new TaskStorage({ projectDir: projectPath });

      // Resolve file path
      const filePath = resolve(file);

      // Check file exists
      if (!existsSync(filePath)) {
        error(`File not found: ${filePath}`);
        process.exit(1);
      }

      // Read file
      const content = readFileSync(filePath, 'utf-8');

      // Auto-detect format if not specified
      const format = options.format || detectFormat(filePath);
      if (!format) {
        error(`Cannot detect format. Please specify --format <format>`);
        process.exit(1);
      }

      let data: any;

      switch (format) {
        case 'json':
          try {
            data = JSON.parse(content);
          } catch (parseErr) {
            error(`Failed to parse JSON: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}`);
            process.exit(1);
          }
          break;

        default:
          error(`Unsupported format: ${format}`);
          process.exit(1);
      }

      // Validate imported data
      try {
        validateImportData(data);
      } catch (validationErr) {
        error(`Invalid data structure: ${validationErr instanceof Error ? validationErr.message : 'Unknown error'}`);
        process.exit(1);
      }

      // Create backup before import if project exists
      const projectExists = await storage.exists();
      if (projectExists) {
        warning('Project already exists. Creating backup before import...');
        // Load existing to preserve it for merge
      }

      // Import data
      let store: TaskGraphStore;

      if (options.merge && projectExists) {
        // Merge mode: load existing and merge
        warning('Merging with existing tasks...');
        const existing = await storage.load();

        // Create store from import data
        store = createGraphFromImportData(data);

        // Add tasks from existing that aren't in import
        for (const task of existing.getAllTasks()) {
          if (!store.getNode(task.id)) {
            store.addNode(task);
          }
        }
      } else {
        // Replace mode (default)
        store = createGraphFromImportData(data);
      }

      // Save with storage
      await storage.save(store);

      success(`Imported ${store.size} task(s) from ${chalk.cyan(filePath)}`);

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Import failed');
      }
      process.exit(1);
    }
  });
