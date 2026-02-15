/**
 * Import command - Import project data from file
 */

import { Command } from 'commander';
import { TaskStorage } from '../../core/storage/file-store.js';
import { getProjectPath, success, error } from '../utils/helpers.js';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { TaskGraphStore } from '../../core/graph/index.js';

/**
 * Create the import command
 */
export const importCommand = new Command('import')
  .description('Import tasks from file')
  .argument('<file>', 'File path to import')
  .option('--format <format>', 'Import format: json', 'json')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (file, options) => {
    try {
      const projectPath = await getProjectPath(options.project);
      const storage = new TaskStorage({ projectDir: projectPath });

      // Read file
      const content = readFileSync(file, 'utf-8');

      let data: any;

      switch (options.format) {
        case 'json':
          data = JSON.parse(content);
          break;

        default:
          error(`Unsupported format: ${options.format}`);
          process.exit(1);
      }

      // Load existing or create new
      if (await storage.exists()) {
        // Already exists, will overwrite
      } else {
        await storage.createProject('imported-project');
      }

      // Import data
      const store = TaskGraphStore.fromJSON(data);

      // Save with storage
      await storage.save(store);

      success(`Imported ${store.size} task(s) from ${chalk.cyan(file)}`);

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
