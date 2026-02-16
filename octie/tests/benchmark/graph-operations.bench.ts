/**
 * Performance benchmarks for graph operations
 *
 * Validates performance targets:
 * - Single task lookup: <10ms for 1000 tasks
 * - Topological sort: <50ms for 1000 tasks
 * - Cycle detection: <50ms for 1000 tasks
 * - Graph traversal: <30ms for 1000 tasks
 *
 * @module tests/benchmark/graph-operations
 */

import { bench, describe, beforeAll } from 'vitest';
import { TaskGraphStore } from '../../src/core/graph/index.js';
import { TaskNode } from '../../src/core/models/task-node.js';
import { topologicalSort, clearSortCache } from '../../src/core/graph/sort.js';
import { detectCycle, hasCycle } from '../../src/core/graph/cycle.js';
import { bfsTraversal } from '../../src/core/graph/traversal.js';
import { getDescendants, getAncestors } from '../../src/core/graph/operations.js';

/**
 * Helper to create a valid task for testing
 */
function createTestTask(id: string, index: number): TaskNode {
  return new TaskNode({
    id,
    title: `Implement feature ${index}`,
    description: `This is a detailed description for task ${index}. It provides comprehensive information about what needs to be implemented and how to verify the implementation is correct.`,
    status: index % 5 === 0 ? 'completed' : index % 3 === 0 ? 'in_progress' : 'pending',
    priority: index % 10 === 0 ? 'top' : index % 5 === 0 ? 'second' : 'later',
    success_criteria: [
      { id: `${id}-sc1`, text: 'Unit tests pass with 100% coverage', completed: index % 5 === 0 },
      { id: `${id}-sc2`, text: 'Code review approved by maintainer', completed: index % 5 === 0 },
    ],
    deliverables: [
      { id: `${id}-d1`, text: `src/features/feature-${index}.ts`, completed: index % 5 === 0 },
    ],
    related_files: [`src/features/feature-${index}.ts`],
    notes: `Implementation notes for task ${index}`,
  });
}

/**
 * Create a linear graph: task0 -> task1 -> task2 -> ... -> taskN
 */
function createLinearGraph(size: number): TaskGraphStore {
  const graph = new TaskGraphStore();

  for (let i = 0; i < size; i++) {
    const task = createTestTask(`task-${i}`, i);
    graph.addNode(task);

    // Create linear chain
    if (i > 0) {
      graph.addEdge(`task-${i - 1}`, `task-${i}`);
    }
  }

  return graph;
}

/**
 * Create a tree graph with branching factor
 */
function createTreeGraph(depth: number, branchingFactor: number): TaskGraphStore {
  const graph = new TaskGraphStore();
  let taskIndex = 0;

  function addLevel(parentId: string | null, currentDepth: number): void {
    if (currentDepth >= depth) return;

    for (let i = 0; i < branchingFactor; i++) {
      const taskId = `task-${taskIndex++}`;
      const task = createTestTask(taskId, taskIndex);
      graph.addNode(task);

      if (parentId) {
        graph.addEdge(parentId, taskId);
      }

      addLevel(taskId, currentDepth + 1);
    }
  }

  // Create root
  const rootTask = createTestTask('root', 0);
  graph.addNode(rootTask);
  addLevel('root', 0);

  return graph;
}

/**
 * Create a graph with parallel branches
 */
function createParallelGraph(branches: number, depth: number): TaskGraphStore {
  const graph = new TaskGraphStore();

  // Create root
  const rootTask = createTestTask('root', 0);
  graph.addNode(rootTask);

  let taskIndex = 1;

  // Create parallel branches
  for (let b = 0; b < branches; b++) {
    let parentId = 'root';

    for (let d = 0; d < depth; d++) {
      const taskId = `branch-${b}-depth-${d}`;
      const task = createTestTask(taskId, taskIndex++);
      graph.addNode(task);
      graph.addEdge(parentId, taskId);
      parentId = taskId;
    }
  }

  return graph;
}

// Test data sizes
const SMALL_SIZE = 100;
const MEDIUM_SIZE = 500;
const LARGE_SIZE = 1000;

// Shared graphs for benchmarks
let smallGraph: TaskGraphStore;
let mediumGraph: TaskGraphStore;
let largeGraph: TaskGraphStore;
let largeTreeGraph: TaskGraphStore;
let largeParallelGraph: TaskGraphStore;

describe('Graph Operations - Lookup', () => {
  beforeAll(() => {
    smallGraph = createLinearGraph(SMALL_SIZE);
    mediumGraph = createLinearGraph(MEDIUM_SIZE);
    largeGraph = createLinearGraph(LARGE_SIZE);
  });

  bench('getNode - 100 tasks', () => {
    for (let i = 0; i < SMALL_SIZE; i++) {
      smallGraph.getNode(`task-${i}`);
    }
  });

  bench('getNode - 500 tasks', () => {
    for (let i = 0; i < MEDIUM_SIZE; i++) {
      mediumGraph.getNode(`task-${i}`);
    }
  });

  bench('getNode - 1000 tasks', () => {
    for (let i = 0; i < LARGE_SIZE; i++) {
      largeGraph.getNode(`task-${i}`);
    }
  });
});

describe('Graph Operations - Edge Traversal', () => {
  beforeAll(() => {
    largeGraph = createLinearGraph(LARGE_SIZE);
    largeTreeGraph = createTreeGraph(4, 4); // ~85 nodes
    largeParallelGraph = createParallelGraph(10, 10); // ~101 nodes
  });

  bench('getOutgoingEdges - linear graph 1000 tasks', () => {
    for (let i = 0; i < LARGE_SIZE; i++) {
      largeGraph.getOutgoingEdges(`task-${i}`);
    }
  });

  bench('getIncomingEdges - linear graph 1000 tasks', () => {
    for (let i = 0; i < LARGE_SIZE; i++) {
      largeGraph.getIncomingEdges(`task-${i}`);
    }
  });

  bench('getOutgoingEdges - tree graph', () => {
    const taskIds = largeTreeGraph.getAllTaskIds();
    for (const id of taskIds) {
      largeTreeGraph.getOutgoingEdges(id);
    }
  });

  bench('getIncomingEdges - tree graph', () => {
    const taskIds = largeTreeGraph.getAllTaskIds();
    for (const id of taskIds) {
      largeTreeGraph.getIncomingEdges(id);
    }
  });
});

describe('Graph Operations - Topological Sort', () => {
  beforeAll(() => {
    smallGraph = createLinearGraph(SMALL_SIZE);
    mediumGraph = createLinearGraph(MEDIUM_SIZE);
    largeGraph = createLinearGraph(LARGE_SIZE);
    largeParallelGraph = createParallelGraph(10, 10);
  });

  bench('topologicalSort - 100 tasks (no cache)', () => {
    clearSortCache();
    topologicalSort(smallGraph, false);
  });

  bench('topologicalSort - 500 tasks (no cache)', () => {
    clearSortCache();
    topologicalSort(mediumGraph, false);
  });

  bench('topologicalSort - 1000 tasks (no cache)', () => {
    clearSortCache();
    topologicalSort(largeGraph, false);
  });

  bench('topologicalSort - parallel graph (no cache)', () => {
    clearSortCache();
    topologicalSort(largeParallelGraph, false);
  });

  bench('topologicalSort - 1000 tasks (with cache)', () => {
    topologicalSort(largeGraph, true);
  });
});

describe('Graph Operations - Cycle Detection', () => {
  beforeAll(() => {
    smallGraph = createLinearGraph(SMALL_SIZE);
    mediumGraph = createLinearGraph(MEDIUM_SIZE);
    largeGraph = createLinearGraph(LARGE_SIZE);
    largeParallelGraph = createParallelGraph(10, 10);
  });

  bench('detectCycle - 100 tasks', () => {
    detectCycle(smallGraph);
  });

  bench('detectCycle - 500 tasks', () => {
    detectCycle(mediumGraph);
  });

  bench('detectCycle - 1000 tasks', () => {
    detectCycle(largeGraph);
  });

  bench('detectCycle - parallel graph', () => {
    detectCycle(largeParallelGraph);
  });

  bench('hasCycle - 1000 tasks', () => {
    hasCycle(largeGraph);
  });
});

describe('Graph Operations - Traversal', () => {
  beforeAll(() => {
    largeGraph = createLinearGraph(LARGE_SIZE);
    largeTreeGraph = createTreeGraph(4, 4);
    largeParallelGraph = createParallelGraph(10, 10);
  });

  bench('bfsTraversal - linear graph from root', () => {
    bfsTraversal(largeGraph, 'task-0', 'forward');
  });

  bench('bfsTraversal - tree graph from root', () => {
    bfsTraversal(largeTreeGraph, 'root', 'forward');
  });

  bench('bfsTraversal - parallel graph from root', () => {
    bfsTraversal(largeParallelGraph, 'root', 'forward');
  });

  bench('getDescendants - linear graph', () => {
    getDescendants(largeGraph, 'task-0');
  });

  bench('getDescendants - tree graph from root', () => {
    getDescendants(largeTreeGraph, 'root');
  });

  bench('getAncestors - linear graph (last node)', () => {
    getAncestors(largeGraph, `task-${LARGE_SIZE - 1}`);
  });
});

describe('Graph Operations - Node Management', () => {
  bench('addNode - 100 tasks', () => {
    const graph = new TaskGraphStore();
    for (let i = 0; i < SMALL_SIZE; i++) {
      const task = createTestTask(`new-task-${i}`, i);
      graph.addNode(task);
    }
  });

  bench('addNode with edges - 100 tasks', () => {
    const graph = new TaskGraphStore();
    for (let i = 0; i < SMALL_SIZE; i++) {
      const task = createTestTask(`new-task-${i}`, i);
      graph.addNode(task);
      if (i > 0) {
        graph.addEdge(`new-task-${i - 1}`, `new-task-${i}`);
      }
    }
  });

  bench('getAllTaskIds - 1000 tasks', () => {
    largeGraph.getAllTaskIds();
  });

  bench('getAllTasks - 1000 tasks', () => {
    largeGraph.getAllTasks();
  });
});

describe('Graph Operations - Serialization', () => {
  beforeAll(() => {
    smallGraph = createLinearGraph(SMALL_SIZE);
    mediumGraph = createLinearGraph(MEDIUM_SIZE);
    largeGraph = createLinearGraph(LARGE_SIZE);
  });

  bench('toJSON - 100 tasks', () => {
    smallGraph.toJSON();
  });

  bench('toJSON - 500 tasks', () => {
    mediumGraph.toJSON();
  });

  bench('toJSON - 1000 tasks', () => {
    largeGraph.toJSON();
  });

  bench('fromInterface - 100 tasks', () => {
    const data = smallGraph.toInterface();
    TaskGraphStore.fromInterface(data);
  });

  bench('fromInterface - 1000 tasks', () => {
    const data = largeGraph.toInterface();
    TaskGraphStore.fromInterface(data);
  });
});
