/**
 * Unit tests for graph traversal algorithms
 * @module test/graph/traversal
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { TaskGraphStore } from '../../src/core/graph/index.js';
import { TaskNotFoundError } from '../../src/types/index.js';
import {
  bfsTraversal,
  dfsFindPath,
  findAllPaths,
  findShortestPath,
  areConnected,
  getDistance,
  getConnectedComponents,
} from '../../src/core/graph/traversal.js';
import type { TaskNode } from '../../src/types/index.js';

describe('bfsTraversal', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  it('should return start node for isolated node', () => {
    const task: TaskNode = {
      id: 'a',
      title: 'Task A',
      description: 'Test task',
      status: 'not_started',
      priority: 'later',
      success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
      deliverables: [{ id: 'del1', text: 'Output', completed: false }],
      blockers: [],
      dependencies: [],
      edges: [],
      sub_items: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    graph.addNode(task);

    const result = bfsTraversal(graph, 'a', 'forward');
    assert.deepStrictEqual(result, ['a']);
  });

  it('should traverse forward (outgoing edges)', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['b', 'c'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'c',
        title: 'Task C',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'd',
        title: 'Task D',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc4', text: 'Done', completed: false }],
        deliverables: [{ id: 'del4', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const result = bfsTraversal(graph, 'a', 'forward');
    assert.ok(result.includes('a'));
    assert.ok(result.includes('b'));
    assert.ok(result.includes('c'));
    assert.ok(result.includes('d'));
    assert.strictEqual(result[0], 'a'); // Start node first
  });

  it('should traverse backward (incoming edges)', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'c',
        title: 'Task C',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'd',
        title: 'Task D',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc4', text: 'Done', completed: false }],
        deliverables: [{ id: 'del4', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const result = bfsTraversal(graph, 'd', 'backward');
    assert.ok(result.includes('a'));
    assert.ok(result.includes('b'));
    assert.ok(result.includes('c'));
    assert.ok(result.includes('d'));
    assert.strictEqual(result[0], 'd'); // Start node first
  });

  it('should throw error for non-existent start node', () => {
    assert.throws(
      () => bfsTraversal(graph, 'nonexistent', 'forward'),
      (err: Error) => err.name === 'TaskNotFoundError'
    );
  });
});

describe('dfsFindPath', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  it('should return path when path exists', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['b'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['c'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'c',
        title: 'Task C',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const path = dfsFindPath(graph, 'a', 'c');
    assert.ok(path);
    assert.deepStrictEqual(path, ['a', 'b', 'c']);
  });

  it('should return null when no path exists', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const path = dfsFindPath(graph, 'a', 'b');
    assert.strictEqual(path, null);
  });

  it('should return single-node path when start equals end', () => {
    const task: TaskNode = {
      id: 'a',
      title: 'Task A',
      description: 'Test task',
      status: 'not_started',
      priority: 'later',
      success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
      deliverables: [{ id: 'del1', text: 'Output', completed: false }],
      blockers: [],
      dependencies: [],
      edges: [],
      sub_items: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    graph.addNode(task);

    const path = dfsFindPath(graph, 'a', 'a');
    assert.deepStrictEqual(path, ['a']);
  });
});

describe('findAllPaths', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  it('should find all paths between nodes', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['b', 'c'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'c',
        title: 'Task C',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'd',
        title: 'Task D',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc4', text: 'Done', completed: false }],
        deliverables: [{ id: 'del4', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const paths = findAllPaths(graph, 'a', 'd');
    assert.ok(paths.length >= 2);
    assert.ok(paths.some(p => p.join(',') === 'a,b,d'));
    assert.ok(paths.some(p => p.join(',') === 'a,c,d'));
  });

  it('should return empty array when no path exists', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const paths = findAllPaths(graph, 'a', 'b');
    assert.deepStrictEqual(paths, []);
  });
});

describe('findShortestPath', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  it('should find shortest path using BFS', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['b', 'c'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'c',
        title: 'Task C',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['d'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'd',
        title: 'Task D',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc4', text: 'Done', completed: false }],
        deliverables: [{ id: 'del4', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    // Both paths have length 3
    const path = findShortestPath(graph, 'a', 'd');
    assert.ok(path);
    assert.strictEqual(path.length, 3);
  });

  it('should return null when no path exists', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const path = findShortestPath(graph, 'a', 'b');
    assert.strictEqual(path, null);
  });

  it('should return single-node path when start equals end', () => {
    const task: TaskNode = {
      id: 'a',
      title: 'Task A',
      description: 'Test task',
      status: 'not_started',
      priority: 'later',
      success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
      deliverables: [{ id: 'del1', text: 'Output', completed: false }],
      blockers: [],
      dependencies: [],
      edges: [],
      sub_items: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    graph.addNode(task);

    const path = findShortestPath(graph, 'a', 'a');
    assert.deepStrictEqual(path, ['a']);
  });
});

describe('areConnected', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  it('should return true when path exists', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['b'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    assert.strictEqual(areConnected(graph, 'a', 'b'), true);
  });

  it('should return false when no path exists', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    assert.strictEqual(areConnected(graph, 'a', 'b'), false);
  });
});

describe('getDistance', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  it('should return number of edges in shortest path', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['b'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['c'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'c',
        title: 'Task C',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    assert.strictEqual(getDistance(graph, 'a', 'c'), 2); // a -> b -> c
    assert.strictEqual(getDistance(graph, 'a', 'b'), 1); // a -> b
    assert.strictEqual(getDistance(graph, 'a', 'a'), 0); // Same node
  });

  it('should return -1 when no path exists', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    assert.strictEqual(getDistance(graph, 'a', 'b'), -1);
  });
});

describe('getConnectedComponents', () => {
  it('should find connected components', () => {
    const graph = new TaskGraphStore();

    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['b'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'c',
        title: 'Task C',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const components = getConnectedComponents(graph);
    // Should have 2 components: {a, b} and {c}
    assert.strictEqual(components.length, 2);

    const flatComponents = components.flat();
    assert.ok(flatComponents.includes('a'));
    assert.ok(flatComponents.includes('b'));
    assert.ok(flatComponents.includes('c'));
  });

  it('should return single component for fully connected graph', () => {
    const graph = new TaskGraphStore();

    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['b'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'b',
        title: 'Task B',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['c'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'c',
        title: 'Task C',
        description: 'Test task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: [],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
    ];

    for (const task of tasks) {
      graph.addNode(task);
    }

    const components = getConnectedComponents(graph);
    assert.strictEqual(components.length, 1);
    assert.deepStrictEqual(components[0].sort(), ['a', 'b', 'c']);
  });
});
