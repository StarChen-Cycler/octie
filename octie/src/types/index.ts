/**
 * Core type definitions for Octie task management system
 *
 * This module defines all TypeScript interfaces and types used throughout the system.
 * @module types
 */

/**
 * Task status enumeration
 * Represents the current state of a task in the workflow
 */
export type TaskStatus = 'not_started' | 'pending' | 'in_progress' | 'completed' | 'blocked';

/**
 * Task priority enumeration
 * Indicates the importance and execution order priority
 */
export type TaskPriority = 'top' | 'second' | 'later';

/**
 * Edge type enumeration for graph relationships
 * Defines the nature of connections between tasks
 */
export type EdgeType = 'blocks' | 'depends_on' | 'parent_of' | 'related_to';

/**
 * Success criterion for task completion validation
 * Each task must have at least one quantitative success criterion
 */
export interface SuccessCriterion {
  /** Unique identifier for the criterion */
  id: string;
  /** Description of the success criterion (must be quantitative/measurable) */
  text: string;
  /** Whether the criterion has been completed */
  completed: boolean;
  /** ISO 8601 timestamp when criterion was marked complete */
  completed_at?: string;
}

/**
 * Deliverable expected from task completion
 * Each task must have at least one specific deliverable
 */
export interface Deliverable {
  /** Unique identifier for the deliverable */
  id: string;
  /** Description of the deliverable */
  text: string;
  /** Whether the deliverable has been completed */
  completed: boolean;
  /** Optional file path linking to the actual deliverable file */
  file_path?: string;
}

/**
 * C7 MCP library verification entry
 * Records external library best practice verifications
 */
export interface C7Verification {
  /** Context7 library ID (e.g., "/mongodb/docs") */
  library_id: string;
  /** ISO 8601 timestamp of verification */
  verified_at: string;
  /** Optional notes about the verification */
  notes?: string;
}

/**
 * Graph edge representing relationships between tasks
 */
export interface GraphEdge {
  /** Source task ID */
  from: string;
  /** Target task ID */
  to: string;
  /** Type of edge relationship */
  type: EdgeType;
}

/**
 * Complete task node data
 * Contains all task information excluding edges
 */
export interface TaskData {
  /** Unique identifier (UUID v4 format) */
  id: string;
  /** Short descriptive name (max 200 characters) */
  title: string;
  /** Detailed task explanation (markdown-supported, 50-10000 characters) */
  description: string;
  /** Current status of the task */
  status: TaskStatus;
  /** Priority level for execution ordering */
  priority: TaskPriority;
  /** Array of quantitative completion criteria (min 1, max 10) */
  success_criteria: SuccessCriterion[];
  /** Array of specific expected outputs (min 1, max 5) */
  deliverables: Deliverable[];
  /** Task IDs that must complete before this task can start */
  blockers: string[];
  /** Task IDs this depends on (informational, soft dependencies) */
  dependencies: string[];
  /** Child task IDs (sub-items) */
  sub_items: string[];
  /** File paths relevant to this task (relative to project root) */
  related_files: string[];
  /** Additional context or comments (markdown) */
  notes: string;
  /** C7 MCP library verification entries */
  c7_verified: C7Verification[];
  /** ISO 8601 timestamp - Auto-generated on creation, immutable */
  created_at: string;
  /** ISO 8601 timestamp - Auto-updated on any field change */
  updated_at: string;
  /** ISO 8601 timestamp or null - Auto-set when all criteria and deliverables complete */
  completed_at: string | null;
}

/**
 * Complete task node including edges
 * Main data structure for tasks in the graph
 */
export interface TaskNode extends TaskData {
  /** Outgoing edges (tasks that this task enables) */
  edges: string[];
}

/**
 * Task graph structure
 * Represents the complete task dependency graph
 */
export interface TaskGraph {
  /** Map of task ID to task node */
  nodes: Map<string, TaskNode>;
  /** Map of task ID to outgoing edges */
  outgoingEdges: Map<string, Set<string>>;
  /** Map of task ID to incoming edges */
  incomingEdges: Map<string, Set<string>>;
  /** Graph metadata */
  metadata: ProjectMetadata;
}

/**
 * Project metadata
 * Contains information about the project itself
 */
export interface ProjectMetadata {
  /** Project name */
  project_name: string;
  /** Project version */
  version: string;
  /** ISO 8601 timestamp when project was created */
  created_at: string;
  /** ISO 8601 timestamp when project was last updated */
  updated_at: string;
  /** Optional project description */
  description?: string;
}

/**
 * Project file structure for serialization
 * Format used when saving project to JSON file
 */
export interface ProjectFile {
  /** All tasks indexed by ID */
  tasks: Record<string, TaskNode>;
  /** Graph edges for serialization */
  edges: GraphEdge[];
  /** Project metadata */
  metadata: ProjectMetadata;
  /** Optional indexes for fast lookup */
  indexes?: ProjectIndexes;
  /** JSON schema reference */
  $schema?: string;
  /** File format version */
  version?: string;
  /** File format identifier */
  format?: string;
  /** Index signature for additional properties */
  [key: string]: unknown;
}

/**
 * Project indexes for efficient queries
 * Built and maintained by the IndexManager
 */
export interface ProjectIndexes {
  /** Tasks grouped by status */
  byStatus: Record<TaskStatus, string[]>;
  /** Tasks grouped by priority */
  byPriority: Record<TaskPriority, string[]>;
  /** Tasks with no incoming edges (starting points) */
  rootTasks: string[];
  /** Tasks with no edges (isolated) */
  orphanTasks: string[];
  /** Full-text search index (term -> task IDs) */
  searchText: Record<string, string[]>;
  /** File reference index (file path -> task IDs) */
  files: Record<string, string[]>;
}

/**
 * Custom error base class
 * All Octie-specific errors extend this class
 */
export class OctieError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'OctieError';
  }
}

/**
 * Error thrown when a task is not found
 */
export class TaskNotFoundError extends OctieError {
  constructor(taskId: string) {
    super(`Task with ID '${taskId}' not found`, 'TASK_NOT_FOUND');
    this.name = 'TaskNotFoundError';
  }
}

/**
 * Error thrown when a circular dependency is detected
 */
export class CircularDependencyError extends OctieError {
  constructor(public cycleNodes: string[]) {
    super(`Circular dependency detected: ${cycleNodes.join(' -> ')}`, 'CIRCULAR_DEPENDENCY');
    this.name = 'CircularDependencyError';
  }
}

/**
 * Error thrown when file operations fail
 */
export class FileOperationError extends OctieError {
  constructor(message: string, public filePath: string) {
    super(message, 'FILE_OPERATION_ERROR');
    this.name = 'FileOperationError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends OctieError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when atomic task validation fails
 */
export class AtomicTaskViolationError extends ValidationError {
  constructor(message: string, public violations: string[]) {
    super(message, 'ATOMIC_TASK_VIOLATION');
    this.name = 'AtomicTaskViolationError';
  }
}

/**
 * Topological sort result
 * Returned by graph topological sort operations
 */
export interface TopologicalSortResult {
  /** Linearly ordered task IDs */
  sorted: string[];
  /** Whether a cycle was detected */
  hasCycle: boolean;
  /** Nodes involved in cycle (if detected) */
  cycleNodes: string[];
}

/**
 * Cycle detection result
 * Returned by graph cycle detection operations
 */
export interface CycleDetectionResult {
  /** Whether cycles exist in the graph */
  hasCycle: boolean;
  /** Array of cycles (each cycle is an array of task IDs) */
  cycles: string[][];
}

/**
 * Task filter options
 * Used for querying and filtering tasks
 */
export interface TaskFilterOptions {
  /** Filter by status */
  status?: TaskStatus;
  /** Filter by priority */
  priority?: TaskPriority;
  /** Filter by related file */
  relatedFile?: string;
  /** Full-text search query */
  searchQuery?: string;
  /** Include completed tasks */
  includeCompleted?: boolean;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Task creation options
 * Parameters for creating a new task
 */
export interface TaskCreateOptions {
  /** Task title (required, 1-200 chars) */
  title: string;
  /** Task description (required, 50-10000 chars) */
  description: string;
  /** Success criteria (required, min 1, max 10) */
  successCriteria: string[];
  /** Deliverables (required, min 1, max 5) */
  deliverables: string[];
  /** Task priority (default: 'second') */
  priority?: TaskPriority;
  /** Blocking task IDs */
  blockers?: string[];
  /** Dependency task IDs */
  dependencies?: string[];
  /** Related file paths */
  relatedFiles?: string[];
  /** Additional notes */
  notes?: string;
  /** C7 verification entries */
  c7Verified?: C7Verification[];
}

/**
 * Task update options
 * Parameters for updating an existing task
 */
export interface TaskUpdateOptions {
  /** New status */
  status?: TaskStatus;
  /** New priority */
  priority?: TaskPriority;
  /** Success criterion to mark complete */
  completeCriterion?: string;
  /** Deliverable to mark complete */
  completeDeliverable?: string;
  /** Success criterion to add */
  addSuccessCriterion?: string;
  /** Deliverable to add */
  addDeliverable?: string;
  /** Task ID to block this task */
  block?: string;
  /** Task ID to unblock */
  unblock?: string;
  /** Task ID to depend on */
  addDependency?: string;
  /** Notes to append */
  notes?: string;
}

/**
 * Merge result
 * Returned by task merge operations
 */
export interface MergeResult {
  /** Merged task node */
  task: TaskNode;
  /** Tasks that were removed */
  removedTasks: string[];
  /** Tasks that were updated (reconnected) */
  updatedTasks: string[];
}

/**
 * Graph statistics
 * Aggregated information about the task graph
 */
export interface GraphStatistics {
  /** Total number of tasks */
  totalTasks: number;
  /** Tasks by status */
  tasksByStatus: Record<TaskStatus, number>;
  /** Tasks by priority */
  tasksByPriority: Record<TaskPriority, number>;
  /** Number of edges */
  totalEdges: number;
  /** Number of root tasks */
  rootTasks: number;
  /** Number of orphan tasks */
  orphanTasks: number;
  /** Whether graph has cycles */
  hasCycles: boolean;
  /** Longest path length (critical path) */
  criticalPathLength: number;
}

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
 * Standard response format for all API endpoints
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
 * API error response
 * Returned when an API request fails
 */
export interface ApiErrorResponse {
  /** Indicates failure */
  success: false;
  /** Error details */
  error: {
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
