/**
 * Web Server for Octie Task Management System
 *
 * Provides Express.js server with REST API for task operations.
 * Includes CORS, JSON parsing, error handling, request logging, and graceful shutdown.
 *
 * @module web/server
 */

import type { Request, RequestHandler, Response } from 'express';
import express from 'express';
import type { Server as HttpServer } from 'node:http';
import { createServer as httpCreateServer } from 'node:http';
import { TaskStorage } from '../core/storage/file-store.js';
import type { TaskGraphStore } from '../core/graph/index.js';

/**
 * Web server configuration options
 */
export interface ServerOptions {
  /** Port to run server on (default: 3000) */
  port?: number;
  /** Host to bind to (default: 'localhost') */
  host?: string;
  /** Open browser automatically (default: false) */
  open?: boolean;
  /** Enable CORS (default: true) */
  cors?: boolean;
  /** Enable request logging (default: true) */
  logging?: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Indicates success of the request */
  success: boolean;
  /** Response data on success */
  data?: T;
  /** Error details on failure */
  error?: {
    /** Error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: unknown;
  };
  /** ISO 8601 timestamp of response */
  timestamp: string;
}

/**
 * Web Server class
 *
 * Manages Express server lifecycle and middleware configuration.
 */
export class WebServer {
  private _app: express.Express;
  private _server: HttpServer | null = null;
  private _port: number;
  private _host: string;
  private _projectPath: string;
  private _storage: TaskStorage;
  private _graph: TaskGraphStore | null = null;
  private _shuttingDown = false;

  /**
   * Create a new WebServer instance
   * @param projectPath - Path to Octie project directory
   * @param options - Server configuration options
   */
  constructor(projectPath: string, options: ServerOptions = {}) {
    this._projectPath = projectPath;
    this._port = options.port ?? 3000;
    this._host = options.host ?? 'localhost';
    this._storage = new TaskStorage({ projectDir: projectPath });

    // Initialize Express app
    this._app = express();

    // Configure middleware
    this._configureMiddleware(options);

    // Configure routes
    this._configureRoutes();

    // Configure error handling
    this._configureErrorHandling();

    // Setup graceful shutdown handlers
    this._setupShutdownHandlers();
  }

  /**
   * Configure Express middleware
   */
  private _configureMiddleware(options: ServerOptions): void {
    // JSON body parser with size limit
    this._app.use(express.json({ limit: '10mb' }));

    // URL-encoded parser
    this._app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS middleware (enabled by default)
    if (options.cors !== false) {
      this._app.use(this._corsMiddleware());
    }

    // Request logging middleware (enabled by default)
    if (options.logging !== false) {
      this._app.use(this._requestLogger());
    }

    // Trust proxy for proper X-Forwarded-* headers
    this._app.set('trust proxy', true);
  }

  /**
   * CORS middleware
   */
  private _corsMiddleware(): RequestHandler {
    return (_req: Request, res: Response, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');

      if (_req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }

      next();
    };
  }

  /**
   * Request logger middleware
   */
  private _requestLogger(): RequestHandler {
    return (req: Request, res: Response, next) => {
      const start = Date.now();

      // Log request
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.path} ${statusColor}${res.statusCode}\x1b[0m ${duration}ms`
        );
      });

      next();
    };
  }

  /**
   * Configure API routes
   */
  private _configureRoutes(): void {
    // Health check endpoint
    this._app.get('/health', (_req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse);
    });

    // API info endpoint
    this._app.get('/api', (_req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          name: 'Octie API',
          version: '1.0.0',
          description: 'Graph-based task management system API',
          endpoints: {
            health: 'GET /health',
            tasks: 'GET /api/tasks, POST /api/tasks, GET /api/tasks/:id, PUT /api/tasks/:id, DELETE /api/tasks/:id',
            graph: 'GET /api/graph, GET /api/graph/topology, POST /api/graph/validate',
            stats: 'GET /api/stats',
          },
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse);
    });

    // Project metadata endpoint
    this._app.get('/api/project', async (_req: Request, res: Response) => {
      try {
        if (!this._graph) {
          this._graph = await this._storage.load();
        }

        const metadata = this._graph.metadata;
        res.json({
          success: true,
          data: metadata,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load project metadata';
        res.status(500).json({
          success: false,
          error: {
            code: 'PROJECT_LOAD_ERROR',
            message,
          },
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse);
      }
    });

    // 404 handler for unmatched routes
    this._app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint not found: ${req.method} ${req.path}`,
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse);
    });
  }

  /**
   * Configure error handling middleware
   */
  private _configureErrorHandling(): void {
    // Global error handler
    this._app.use((err: Error, _req: Request, res: Response, _next: unknown) => {
      console.error(`[${new Date().toISOString()}] Error:`, err);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse);
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private _setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this._shuttingDown) {
        console.log('Force shutdown detected, exiting immediately');
        process.exit(1);
      }

      this._shuttingDown = true;
      console.log(`\n${signal} received, shutting down gracefully...`);

      if (this._server) {
        // Stop accepting new connections
        this._server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
          console.error('Forced shutdown after timeout');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Start the server
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    // Verify project exists
    if (!(await this._storage.exists())) {
      throw new Error(`No Octie project found at ${this._projectPath}`);
    }

    // Load graph
    this._graph = await this._storage.load();

    // Create HTTP server
    this._server = httpCreateServer(this._app);

    // Start listening
    return new Promise((resolve, reject) => {
      if (!this._server) {
        reject(new Error('Server not initialized'));
        return;
      }

      this._server.once('error', (err: Error) => {
        reject(err);
      });

      this._server.listen(this._port, this._host, () => {
        const url = `http://${this._host}:${this._port}`;
        console.log(`\n🚀 Octie Web Server started`);
        console.log(`📍 Project: ${this._projectPath}`);
        console.log(`🔗 URL: ${url}`);
        console.log(`📊 API: ${url}/api`);
        console.log(`\nPress Ctrl+C to stop\n`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   * @returns Promise that resolves when server is closed
   */
  async stop(): Promise<void> {
    if (!this._server) {
      return;
    }

    return new Promise((resolve) => {
      if (!this._server) {
        resolve();
        return;
      }

      this._server.close(() => {
        this._server = null;
        console.log('Server stopped');
        resolve();
      });
    });
  }

  /**
   * Get the Express app instance (useful for testing)
   */
  get app(): express.Express {
    return this._app;
  }

  /**
   * Get the server URL
   */
  get url(): string {
    return `http://${this._host}:${this._port}`;
  }

  /**
   * Check if server is running
   */
  get isRunning(): boolean {
    return this._server !== null && this._server.listening;
  }
}

/**
 * Create and start a web server
 * @param projectPath - Path to Octie project directory
 * @param options - Server configuration options
 * @returns WebServer instance
 */
export async function createServer(
  projectPath: string,
  options: ServerOptions = {}
): Promise<WebServer> {
  const server = new WebServer(projectPath, options);
  await server.start();
  return server;
}
