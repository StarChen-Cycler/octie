/**
 * JSON output formatters for tasks and projects
 */

import { TaskNode } from '../../core/models/task-node.js';
import type { TaskGraphStore } from '../../core/graph/index.js';

/**
 * Schema reference for Octie project files
 */
const OCTIE_SCHEMA = 'https://octie.dev/schemas/project-v1.json';

/**
 * Format a single task as JSON
 * Pretty-printed with 2-space indentation
 */
export function formatTaskJSON(task: TaskNode): string {
  return JSON.stringify(task, null, 2);
}

/**
 * Format entire project as JSON for storage
 * Includes all task fields, edges array, indexes, metadata, and schema reference
 */
export function formatProjectJSON(graph: TaskGraphStore): string {
  const projectData = graph.toJSON();

  // Add schema reference
  const dataWithSchema = {
    $schema: OCTIE_SCHEMA,
    ...projectData
  };

  return JSON.stringify(dataWithSchema, null, 2);
}
