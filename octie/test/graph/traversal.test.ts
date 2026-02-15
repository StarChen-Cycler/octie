/**
 * Unit tests for graph traversal algorithms
 * @module test/graph/traversal
 */

import { describe, it, beforeEach, expect } from 'vitest';

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
    expect(result).toEqual(['a']);
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
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toContain('c');
    expect(result).toContain('d');
    expect(result[0]).toBe('a'); // Start node first
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
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toContain('c');
    expect(result).toContain('d');
    expect(result[0]).toBe('d'); // Start node first
  });

  it('should throw error for non-existent start node', () => {
    expect(() => bfsTraversal(graph, 'nonexistent', 'forward')).toThrow(/task.*not found/i);
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
    expect(path).toBeTruthy();
    expect(path).toEqual(['a', 'b', 'c']);
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
    expect(path).toBeNull();
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
    expect(path).toEqual(['a']);
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
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths.some(p => p.join(',') === 'a,b,d')).toBe(true);
    expect(paths.some(p => p.join(',') === 'a,c,d')).toBe(true);
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
    expect(paths).toEqual([]);
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
    expect(path).toBeTruthy();
    expect(path?.length).toBe(3);
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
    expect(path).toBeNull();
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
    expect(path).toEqual(['a']);
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

    expect(areConnected(graph, 'a', 'b')).toBe(true);
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

    expect(areConnected(graph, 'a', 'b')).toBe(false);
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

    expect(getDistance(graph, 'a', 'c')).toBe(2); // a -> b -> c
    expect(getDistance(graph, 'a', 'b')).toBe(1); // a -> b
    expect(getDistance(graph, 'a', 'a')).toBe(0); // Same node
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

    expect(getDistance(graph, 'a', 'b')).toBe(-1);
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
    expect(components.length).toBe(2);

    const flatComponents = components.flat();
    expect(flatComponents).toContain('a');
    expect(flatComponents).toContain('b');
    expect(flatComponents).toContain('c');
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
    expect(components.length).toBe(1);
    expect(components[0].sort()).toEqual(['a', 'b', 'c']);
  });
});
