/**
 * Task Routes - RESTful CRUD endpoints for task management
 *
 * Provides complete CRUD operations for tasks via REST API.
 * All endpoints use Zod validation and proper HTTP status codes.
 *
 * @module web/routes/tasks
 */

import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import type { TaskGraphStore } from '../../core/graph/index.js';
import { TaskNotFoundError, CircularDependencyError, ValidationError, AtomicTaskViolationError } from '../../types/index.js';
import { TaskNode } from '../../core/models/task-node.js';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse } from '../server.js';

/**
 * Zod schema for task creation validation
 */
const TaskCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .refine(val => val.trim().length > 0, 'Title cannot be empty or whitespace'),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(10000, 'Description must be 10000 characters or less')
    .refine(val => val.trim().length > 0, 'Description cannot be empty or whitespace'),
  successCriteria: z.array(z.object({
    id: z.string().uuid().optional(),
    text: z.string().min(1, 'Criterion text cannot be empty'),
    completed: z.boolean().default(false),
  })).min(1, 'At least one success criterion is required')
    .max(10, 'Cannot have more than 10 success criteria'),
  deliverables: z.array(z.object({
    id: z.string().uuid().optional(),
    text: z.string().min(1, 'Deliverable text cannot be empty'),
    completed: z.boolean().default(false),
    file_path: z.string().optional(),
  })).min(1, 'At least one deliverable is required')
    .max(5, 'Cannot have more than 5 deliverables'),
  priority: z.enum(['top', 'second', 'later']).optional().default('second'),
  status: z.enum(['not_started', 'pending', 'in_progress', 'completed', 'blocked']).optional().default('not_started'),
  blockers: z.array(z.string().uuid()).default([]),
  dependencies: z.array(z.string().uuid()).default([]),
  relatedFiles: z.array(z.string()).default([]),
  notes: z.string().default(''),
  c7Verified: z.array(z.object({
    library_id: z.string(),
    verified_at: z.string(),
    notes: z.string().optional(),
  })).default([]),
});

/**
 * Zod schema for task update validation (partial updates)
 */
const TaskUpdateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(10000, 'Description must be 10000 characters or less')
    .optional(),
  status: z.enum(['not_started', 'pending', 'in_progress', 'completed', 'blocked']).optional(),
  priority: z.enum(['top', 'second', 'later']).optional(),
  addSuccessCriterion: z.string().optional(),
  completeCriterion: z.string().uuid().optional(),
  addDeliverable: z.string().optional(),
  completeDeliverable: z.string().uuid().optional(),
  block: z.string().uuid().optional(),
  unblock: z.string().uuid().optional(),
  addDependency: z.string().uuid().optional(),
  notes: z.string().optional(),
});

/**
 * Zod schema for task merge validation
 */
const TaskMergeSchema = z.object({
  targetId: z.string().uuid('Target ID must be a valid UUID'),
});

/**
 * Zod schema for query parameter validation
 */
const TaskQuerySchema = z.object({
  status: z.enum(['not_started', 'pending', 'in_progress', 'completed', 'blocked']).optional(),
  priority: z.enum(['top', 'second', 'later']).optional(),
  search: z.string().optional(),
  limit: z.string().transform(val => val ? parseInt(val, 10) : undefined).pipe(
    z.number().int().positive().max(1000).optional()
  ).optional(),
  offset: z.string().transform(val => val ? parseInt(val, 10) : undefined).pipe(
    z.number().int().nonnegative().optional()
  ).optional(),
});

/**
 * Async error handler wrapper
 * Catches async errors and passes them to Express error handling
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: (err?: Error) => void) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/**
 * Send successful API response
 */
function sendSuccess<T>(res: Response, data: T, status: number = 200): void {
  res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse<T>);
}

/**
 * Send error API response
 */
function sendError(res: Response, code: string, message: string, status: number = 400, details?: unknown): void {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
}

/**
 * Register task routes
 * @param router - Express Router instance
 * @param getGraph - Function to get the current graph instance
 */
export function registerTaskRoutes(
  router: Router,
  getGraph: () => TaskGraphStore | null
): void {
  /**
   * GET /api/tasks
   * List all tasks with optional filtering
   */
  router.get('/api/tasks', asyncHandler(async (req: Request, res: Response) => {
    const graph = getGraph();
    if (!graph) {
      return sendError(res, 'GRAPH_NOT_LOADED', 'Graph not loaded', 500);
    }

    // Validate query parameters
    const queryResult = TaskQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return sendError(res, 'INVALID_QUERY', 'Invalid query parameters', 400, queryResult.error.issues);
    }

    const { status, priority, search, limit, offset } = queryResult.data;

    // Get all tasks
    let tasks = Array.from(graph.getAllTasks());

    // Apply filters
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    if (priority) {
      tasks = tasks.filter(task => task.priority === priority);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      tasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.notes.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const total = tasks.length;
    if (offset) {
      tasks = tasks.slice(offset);
    }
    if (limit) {
      tasks = tasks.slice(0, limit);
    }

    return sendSuccess(res, {
      tasks,
      total,
      returned: tasks.length,
      limit,
      offset,
    });
  }));

  /**
   * GET /api/tasks/:id
   * Get a specific task by ID
   */
  router.get('/api/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
    const graph = getGraph();
    if (!graph) {
      return sendError(res, 'GRAPH_NOT_LOADED', 'Graph not loaded', 500);
    }

    const { id } = req.params;
    if (!id) {
      return sendError(res, 'INVALID_ID', 'Task ID is required', 400);
    }

    try {
      const task = graph.getNodeOrThrow(id);
      return sendSuccess(res, task);
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return sendError(res, 'TASK_NOT_FOUND', err.message, 404);
      }
      throw err;
    }
  }));

  /**
   * POST /api/tasks
   * Create a new task
   */
  router.post('/api/tasks', asyncHandler(async (req: Request, res: Response) => {
    const graph = getGraph();
    if (!graph) {
      return sendError(res, 'GRAPH_NOT_LOADED', 'Graph not loaded', 500);
    }

    // Validate request body
    const bodyResult = TaskCreateSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid request body', 400, bodyResult.error.issues);
    }

    const data = bodyResult.data;

    try {
      // Generate UUID for new task
      const taskId = uuidv4();

      // Create success criteria with IDs
      const successCriteria = data.successCriteria.map(sc => ({
        id: sc.id || uuidv4(),
        text: sc.text,
        completed: sc.completed,
      }));

      // Create deliverables with IDs
      const deliverables = data.deliverables.map(d => ({
        id: d.id || uuidv4(),
        text: d.text,
        completed: d.completed,
        file_path: d.file_path,
      }));

      // Validate blockers and dependencies exist
      for (const blockerId of data.blockers) {
        if (!graph.hasNode(blockerId)) {
          return sendError(res, 'BLOCKER_NOT_FOUND', `Blocker task '${blockerId}' not found`, 400);
        }
      }

      for (const depId of data.dependencies) {
        if (!graph.hasNode(depId)) {
          return sendError(res, 'DEPENDENCY_NOT_FOUND', `Dependency task '${depId}' not found`, 400);
        }
      }

      // Create TaskNode instance (includes atomic validation)
      const taskNode = new TaskNode({
        id: taskId,
        title: data.title,
        description: data.description,
        success_criteria: successCriteria,
        deliverables: deliverables,
        priority: data.priority,
        status: data.status,
        blockers: data.blockers,
        dependencies: data.dependencies,
        related_files: data.relatedFiles,
        notes: data.notes,
        c7_verified: data.c7Verified,
      });

      // Add to graph
      graph.addNode(taskNode);

      // Add edges for blockers
      for (const blockerId of data.blockers) {
        graph.addEdge(blockerId, taskId);
      }

      // Return created task
      return sendSuccess(res, graph.getNodeOrThrow(taskId), 201);
    } catch (err) {
      if (err instanceof AtomicTaskViolationError) {
        return sendError(res, 'ATOMIC_TASK_VIOLATION', err.message, 400);
      }
      if (err instanceof ValidationError) {
        return sendError(res, 'VALIDATION_ERROR', err.message, 400);
      }
      if (err instanceof CircularDependencyError) {
        return sendError(res, 'CIRCULAR_DEPENDENCY', err.message, 400);
      }
      throw err;
    }
  }));

  /**
   * PUT /api/tasks/:id
   * Update an existing task
   */
  router.put('/api/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
    const graph = getGraph();
    if (!graph) {
      return sendError(res, 'GRAPH_NOT_LOADED', 'Graph not loaded', 500);
    }

    const { id } = req.params;
    if (!id) {
      return sendError(res, 'INVALID_ID', 'Task ID is required', 400);
    }

    // Validate request body
    const bodyResult = TaskUpdateSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid request body', 400, bodyResult.error.issues);
    }

    const data = bodyResult.data;

    try {
      const task = graph.getNodeOrThrow(id);

      // Apply updates
      if (data.title !== undefined) {
        task.setTitle(data.title);
      }
      if (data.description !== undefined) {
        task.setDescription(data.description);
      }
      if (data.status !== undefined) {
        task.setStatus(data.status);
      }
      if (data.priority !== undefined) {
        task.setPriority(data.priority);
      }
      if (data.addSuccessCriterion !== undefined) {
        task.addSuccessCriterion({
          id: uuidv4(),
          text: data.addSuccessCriterion,
          completed: false,
        });
      }
      if (data.completeCriterion !== undefined) {
        task.completeCriterion(data.completeCriterion);
      }
      if (data.addDeliverable !== undefined) {
        task.addDeliverable({
          id: uuidv4(),
          text: data.addDeliverable,
          completed: false,
        });
      }
      if (data.completeDeliverable !== undefined) {
        task.completeDeliverable(data.completeDeliverable);
      }
      if (data.block !== undefined) {
        if (!graph.hasNode(data.block)) {
          return sendError(res, 'BLOCKER_NOT_FOUND', `Blocker task '${data.block}' not found`, 400);
        }
        task.addBlocker(data.block);
        graph.addEdge(data.block, id);
      }
      if (data.unblock !== undefined) {
        task.removeBlocker(data.unblock);
        graph.removeEdge(data.unblock, id);
      }
      if (data.addDependency !== undefined) {
        if (!graph.hasNode(data.addDependency)) {
          return sendError(res, 'DEPENDENCY_NOT_FOUND', `Dependency task '${data.addDependency}' not found`, 400);
        }
        task.addDependency(data.addDependency);
      }
      if (data.notes !== undefined) {
        task.appendNotes(data.notes);
      }

      // Update node in graph
      graph.updateNode(task);

      // Return updated task
      return sendSuccess(res, graph.getNodeOrThrow(id));
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return sendError(res, 'TASK_NOT_FOUND', err.message, 404);
      }
      if (err instanceof ValidationError) {
        return sendError(res, 'VALIDATION_ERROR', err.message, 400);
      }
      if (err instanceof CircularDependencyError) {
        return sendError(res, 'CIRCULAR_DEPENDENCY', err.message, 400);
      }
      throw err;
    }
  }));

  /**
   * DELETE /api/tasks/:id
   * Delete a task
   */
  router.delete('/api/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
    const graph = getGraph();
    if (!graph) {
      return sendError(res, 'GRAPH_NOT_LOADED', 'Graph not loaded', 500);
    }

    const { id } = req.params;
    if (!id) {
      return sendError(res, 'INVALID_ID', 'Task ID is required', 400);
    }
    const reconnect = req.query.reconnect === 'true';

    try {
      // Check if task exists
      const task = graph.getNodeOrThrow(id);

      // Get affected tasks
      const incoming = graph.getIncomingEdges(id);
      const outgoing = graph.getOutgoingEdges(id);

      // Remove the task
      graph.removeNode(id);

      // Reconnect edges if requested
      if (reconnect) {
        for (const fromId of incoming) {
          for (const toId of outgoing) {
            try {
              graph.addEdge(fromId, toId);
            } catch {
              // Ignore if edge already exists
            }
          }
        }
      }

      // Return success with deleted task info
      return sendSuccess(res, {
        deletedTask: task,
        reconnected: reconnect,
        incomingBeforeDelete: incoming,
        outgoingBeforeDelete: outgoing,
      });
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return sendError(res, 'TASK_NOT_FOUND', err.message, 404);
      }
      throw err;
    }
  }));

  /**
   * POST /api/tasks/:id/merge
   * Merge this task into another task
   */
  router.post('/api/tasks/:id/merge', asyncHandler(async (req: Request, res: Response) => {
    const graph = getGraph();
    if (!graph) {
      return sendError(res, 'GRAPH_NOT_LOADED', 'Graph not loaded', 500);
    }

    const { id } = req.params;
    if (!id) {
      return sendError(res, 'INVALID_ID', 'Task ID is required', 400);
    }

    // Validate request body
    const bodyResult = TaskMergeSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid request body', 400, bodyResult.error.issues);
    }

    const { targetId } = bodyResult.data;

    try {
      // Import mergeTasks from operations module
      const { mergeTasks } = await import('../../core/graph/operations.js');

      // Perform merge
      const mergedTask = mergeTasks(graph, id, targetId);

      // Return merged task
      return sendSuccess(res, mergedTask);
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return sendError(res, 'TASK_NOT_FOUND', err.message, 404);
      }
      if (err instanceof CircularDependencyError) {
        return sendError(res, 'CIRCULAR_DEPENDENCY', err.message, 400);
      }
      if (err instanceof Error) {
        return sendError(res, 'MERGE_ERROR', err.message, 400);
      }
      throw err;
    }
  }));
}
