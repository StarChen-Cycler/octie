/**
 * Init command - Initialize a new Octie project
 */

import { Command } from 'commander';
import path from 'node:path';
import { TaskStorage } from '../../core/storage/file-store.js';
import { success, error, info } from '../utils/helpers.js';
import chalk from 'chalk';

/**
 * Create the init command
 */
export const initCommand = new Command('init')
  .description('Initialize a new Octie project')
  .option('-n, --name <name>', 'Project name', 'my-project')
  .action(async (options, command) => {
    try {
      // Get project path from parent's options (global --project option)
      const projectOption = command.parent?.opts().project;
      const projectPath = path.resolve(projectOption || process.cwd());
      // Validate project name - use default if empty
      let projectName = options.name?.trim() || 'my-project';
      if (!projectName) {
        projectName = 'my-project';
      }

      info(`Initializing Octie project at ${projectPath}`);

      // Create storage instance
      const storage = new TaskStorage({ projectDir: projectPath });

      // Check if project already exists
      if (await storage.exists()) {
        error('Octie project already exists at this location');
        info('Use --project <path> to specify a different location');
        process.exit(1);
      }

      // Create project
      await storage.createProject(projectName);

      success(`Octie project initialized`);
      info(`Project: ${projectName}`);
      info(`Location: ${projectPath}`);

      console.log('');
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  octie create --title "My first task" \\'));
      console.log(chalk.gray('    --description "Task description" \\'));
      console.log(chalk.gray('    --success-criterion "Criterion 1" \\'));
      console.log(chalk.gray('    --deliverable "Output 1"'));

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to initialize project');
      }
      process.exit(1);
    }
  });
