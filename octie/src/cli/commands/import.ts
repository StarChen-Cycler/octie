/**
 * Import command - Import project data from file
 */

import { Command } from 'commander';
import { TaskStorage } from '../../core/storage/file-store.js';
import { getProjectPath, success, error, warning } from '../utils/helpers.js';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'node:fs';
import { TaskGraphStore } from '../../core/graph/index.js';
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

  // Check for required fields in project file format
  if (data.version && data.format && data.tasks) {
    // Full project file format
    if (!data.tasks || typeof data.tasks !== 'object') {
      throw new Error('Invalid project file: missing or invalid tasks object');
    }
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
 * Create the import command
 */
export const importCommand = new Command('import')
  .description('Import tasks from file')
  .argument('<file>', 'File path to import')
  .option('--format <format>', 'Import format: json (auto-detect if not specified)')
  .option('--merge', 'Merge with existing tasks instead of replacing')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (file, options) => {
    try {
      const projectPath = await getProjectPath(options.project);
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
      if (await storage.exists()) {
        warning('Project already exists. Creating backup before import...');
        await storage.createProject(projectPath); // This creates backup
      }

      // Import data
      let store: TaskGraphStore;

      if (options.merge && await storage.exists()) {
        // Merge mode: load existing and merge
        warning('Merging with existing tasks...');
        const existing = await storage.load();

        // Merge tasks
        // For now, we'll use fromJSON which creates a new store
        // A true merge would need to iterate and add tasks one by one
        store = TaskGraphStore.fromJSON(data);

        // Add tasks from existing that aren't in import
        for (const task of existing.getAllTasks()) {
          if (!store.getNode(task.id)) {
            store.addNode(task);
          }
        }
      } else {
        // Replace mode (default)
        if (!(await storage.exists())) {
          await storage.createProject('imported-project');
        }
        store = TaskGraphStore.fromJSON(data);
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
