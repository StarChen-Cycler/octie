/**
 * Serve command - Start web UI server
 */

import { Command } from 'commander';
import { getProjectPath, info, error } from '../utils/helpers.js';
import { createServer } from '../../web/server.js';
import type { ServerOptions } from '../../web/server.js';

/**
 * Create the serve command
 */
export const serveCommand = new Command('serve')
  .description('Start web UI server for task visualization')
  .option('-p, --port <number>', 'Port to run server on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .option('--open', 'Open browser automatically')
  .option('--no-cors', 'Disable CORS')
  .option('--no-logging', 'Disable request logging')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (options) => {
    try {
      const projectPath = await getProjectPath(options.project);

      info(`Starting web server for project at ${projectPath}`);

      const serverOptions: ServerOptions = {
        port: parseInt(options.port, 10),
        host: options.host,
        open: options.open,
        cors: options.cors !== false,
        logging: options.logging !== false,
      };

      const server = await createServer(projectPath, serverOptions);

      // Keep process alive
      process.on('SIGTERM', async () => {
        info('Shutting down server...');
        await server.stop();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        info('\nShutting down server...');
        await server.stop();
        process.exit(0);
      });
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to start server');
      }
      process.exit(1);
    }
  });
