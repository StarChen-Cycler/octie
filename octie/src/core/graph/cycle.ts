/**
 * Graph cycle detection algorithms
 *
 * Implements DFS-based cycle detection with three-color marking.
 * Detects all cycles and returns cycle paths for debugging.
 * Time complexity: O(V + E) where V = vertices, E = edges
 *
 * @module core/graph/cycle
 */

import type { TaskGraphStore } from './index.js';
import type { CycleDetectionResult } from '../../types/index.js';
import { CircularDependencyError } from '../../types/index.js';

/** Node visitation states for DFS cycle detection */
const enum VisitState {
  /** Node has not been visited */
  WHITE = 0,
  /** Node is currently being visited (in recursion stack) */
  GRAY = 1,
  /** Node and all descendants have been completely visited */
  BLACK = 2,
}

/**
 * Detect cycles using DFS with three-color marking
 *
 * Algorithm:
 * 1. Mark all nodes as WHITE (unvisited)
 * 2. For each WHITE node, start DFS traversal
 * 3. Mark node as GRAY when entering, BLACK when exiting
 * 4. If we encounter a GRAY node during traversal, we found a cycle
 * 5. Reconstruct cycle path using parent pointers
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V) for recursion stack and state tracking
 *
 * @param graph - Task graph store
 * @returns Cycle detection result with all detected cycles
 *
 * @example
 * ```ts
 * const result = detectCycle(graph);
 * if (result.hasCycle) {
 *   console.error('Found cycles:', result.cycles);
 *   for (const cycle of result.cycles) {
 *     console.error('Cycle:', cycle.join(' -> '));
 *   }
 * }
 * ```
 */
export function detectCycle(graph: TaskGraphStore): CycleDetectionResult {
  const cycles: string[][] = [];
  const color = new Map<string, VisitState>();
  const parent = new Map<string, string | null>();

  // Initialize all nodes as WHITE
  for (const taskId of graph.getAllTaskIds()) {
    color.set(taskId, VisitState.WHITE);
    parent.set(taskId, null);
  }

  /**
   * DFS traversal to detect cycles
   * @param nodeId - Current node being visited
   * @returns true if a cycle was found (can continue to find more)
   */
  function dfs(nodeId: string): boolean {
    // Mark current node as being visited
    color.set(nodeId, VisitState.GRAY);

    // Visit all neighbors
    const neighbors = graph.getOutgoingEdges(nodeId);
    for (const neighbor of neighbors) {
      const neighborState = color.get(neighbor) ?? VisitState.WHITE;

      if (neighborState === VisitState.GRAY) {
        // Found a cycle - reconstruct the path
        const cycle: string[] = [neighbor];

        // Backtrack from current node to the neighbor
        let current: string | null = nodeId;
        while (current && current !== neighbor) {
          cycle.unshift(current);
          current = parent.get(current) || null;
        }

        // Add neighbor at start to complete the cycle
        cycle.unshift(neighbor);

        cycles.push(cycle);
        return true; // Continue to find more cycles
      }

      if (neighborState === VisitState.WHITE) {
        // Set parent and continue DFS
        parent.set(neighbor, nodeId);
        if (dfs(neighbor)) {
          return true; // Continue searching
        }
      }
      // BLACK nodes are already processed, skip them
    }

    // Mark node as completely visited
    color.set(nodeId, VisitState.BLACK);
    return false;
  }

  // Start DFS from all unvisited nodes
  for (const taskId of graph.getAllTaskIds()) {
    if ((color.get(taskId) ?? VisitState.WHITE) === VisitState.WHITE) {
      dfs(taskId);
    }
  }

  return {
    hasCycle: cycles.length > 0,
    cycles,
  };
}

/**
 * Check if a graph contains any cycles
 * Convenience function that returns a boolean
 *
 * @param graph - Task graph store
 * @returns true if graph contains at least one cycle
 */
export function hasCycle(graph: TaskGraphStore): boolean {
  const result = detectCycle(graph);
  return result.hasCycle;
}

/**
 * Get all nodes involved in cycles
 *
 * @param graph - Task graph store
 * @returns Set of task IDs that are part of at least one cycle
 */
export function getCyclicNodes(graph: TaskGraphStore): Set<string> {
  const result = detectCycle(graph);
  const cyclicNodes = new Set<string>();

  for (const cycle of result.cycles) {
    for (const nodeId of cycle) {
      cyclicNodes.add(nodeId);
    }
  }

  return cyclicNodes;
}

/**
 * Find the shortest cycle in the graph
 * Useful for identifying the most critical circular dependency
 *
 * @param graph - Task graph store
 * @returns Shortest cycle array, or empty array if no cycles
 */
export function findShortestCycle(graph: TaskGraphStore): string[] {
  const result = detectCycle(graph);

  if (result.cycles.length === 0) {
    return [];
  }

  return result.cycles.reduce((shortest, current) =>
    current.length < shortest.length ? current : shortest
  );
}

/**
 * Find all cycles involving a specific task
 *
 * @param graph - Task graph store
 * @param taskId - Task ID to find cycles for
 * @returns Array of cycles that include the specified task
 */
export function findCyclesForTask(graph: TaskGraphStore, taskId: string): string[][] {
  const result = detectCycle(graph);

  return result.cycles.filter(cycle => cycle.includes(taskId));
}

/**
 * Validate that a graph is acyclic (DAG)
 * Throws an error if cycles are detected
 *
 * @param graph - Task graph store
 * @throws {CircularDependencyError} If graph contains cycles
 */
export function validateAcyclic(graph: TaskGraphStore): void {
  const result = detectCycle(graph);

  if (result.hasCycle) {
    // Use the first cycle found for the error
    const firstCycle = result.cycles[0];
    if (firstCycle) {
      throw new CircularDependencyError(firstCycle);
    }
  }
}

/**
 * Get cycle statistics
 *
 * @param graph - Task graph store
 * @returns Object with cycle count and nodes in cycles
 */
export function getCycleStatistics(graph: TaskGraphStore): {
  cycleCount: number;
  nodesInCycles: number;
  totalNodes: number;
  cyclesByLength: Record<number, number>;
} {
  const result = detectCycle(graph);
  const cyclicNodes = getCyclicNodes(graph);

  const cyclesByLength: Record<number, number> = {};
  for (const cycle of result.cycles) {
    const len = cycle.length;
    cyclesByLength[len] = (cyclesByLength[len] || 0) + 1;
  }

  return {
    cycleCount: result.cycles.length,
    nodesInCycles: cyclicNodes.size,
    totalNodes: graph.size,
    cyclesByLength,
  };
}
