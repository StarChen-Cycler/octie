/**
 * Serve command - Start web UI server
 */

import { Command } from 'commander';
import { getProjectPath, info, error } from '../utils/helpers.js';

/**
 * Create the serve command
 */
export const serveCommand = new Command('serve')
  .description('Start web UI server for task visualization')
  .option('-p, --port <number>', 'Port to run server on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .option('--open', 'Open browser automatically')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (options) => {
    try {
      const projectPath = await getProjectPath(options.project);

      // TODO: Implement actual web server
      // For now, just show message

      info(`Starting web server for project at ${projectPath}`);
      info(`Server will run at http://${options.host}:${options.port}`);

      error('Web server not yet implemented');
      info('This feature will be available in a future release');

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to start server');
      }
      process.exit(1);
    }
  });
