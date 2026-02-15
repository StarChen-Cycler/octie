/**
 * Unit tests for cycle detection algorithms
 * @module test/graph/cycle
 */

import { describe, it, beforeEach, expect } from 'vitest';

import { TaskGraphStore } from '../../src/core/graph/index.js';
import {
  detectCycle,
  hasCycle,
  getCyclicNodes,
  findShortestCycle,
  findCyclesForTask,
  validateAcyclic,
  getCycleStatistics,
} from '../../src/core/graph/cycle.js';
import type { TaskNode } from '../../src/types/index.js';

describe('detectCycle', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  it('should return no cycles for empty graph', () => {
    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(false);
    expect(result.cycles.length).toBe(0);
  });

  it('should return no cycles for graph with no edges', () => {
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

    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(false);
    expect(result.cycles.length).toBe(0);
  });

  it('should detect self-loop', () => {
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
      edges: ['a'], // Self-loop
      sub_items: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    graph.addNode(task);

    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycles.length).toBe(1);
    expect(result.cycles[0]).toEqual(['a', 'a']);
  });

  it('should detect simple cycle of two nodes', () => {
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
        edges: ['a'], // Cycle: a -> b -> a
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

    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycles.length).toBeGreaterThan(0);
    expect(result.cycles.some(cycle => cycle.includes('a') && cycle.includes('b'))).toBe(true);
  });

  it('should detect three-node cycle', () => {
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
        edges: ['a'], // Cycle: a -> b -> c -> a
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

    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycles.some(cycle =>
      cycle.includes('a') && cycle.includes('b') && cycle.includes('c')
    )).toBe(true);
  });

  it('should detect multiple cycles', () => {
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
        edges: ['a', 'c'], // Creates cycle with a, and edge to c
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
        edges: ['b'], // Creates another cycle: b -> c -> b
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

    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycles.length).toBeGreaterThanOrEqual(2);
  });

  it('should not detect cycles in valid DAG', () => {
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

    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(false);
    expect(result.cycles.length).toBe(0);
  });
});

describe('hasCycle', () => {
  it('should return true for cyclic graph', () => {
    const graph = new TaskGraphStore();
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
      edges: ['a'],
      sub_items: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    graph.addNode(task);

    expect(hasCycle(graph)).toBe(true);
  });

  it('should return false for acyclic graph', () => {
    const graph = new TaskGraphStore();
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

    expect(hasCycle(graph)).toBe(false);
  });
});

describe('getCyclicNodes', () => {
  it('should return set of nodes in cycles', () => {
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
        edges: ['a'],
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
        description: 'Test task (not in cycle)',
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

    const cyclicNodes = getCyclicNodes(graph);
    expect(cyclicNodes.size).toBe(2);
    expect(cyclicNodes.has('a')).toBe(true);
    expect(cyclicNodes.has('b')).toBe(true);
    expect(cyclicNodes.has('c')).toBe(false);
  });
});

describe('findShortestCycle', () => {
  it('should return shortest cycle', () => {
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
        edges: ['a'], // Short cycle: a -> b -> a (length 2)
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
        edges: ['a'], // Longer cycle: a -> c -> d -> a (length 3)
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

    const shortest = findShortestCycle(graph);
    expect(shortest.length).toBeGreaterThan(0);
    // Should find the a -> b -> a cycle
  });

  it('should return empty array for acyclic graph', () => {
    const graph = new TaskGraphStore();
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

    const shortest = findShortestCycle(graph);
    expect(shortest).toEqual([]);
  });
});

describe('findCyclesForTask', () => {
  it('should return cycles containing specific task', () => {
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
        edges: ['a'],
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
        description: 'Test task (not in cycle)',
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

    const cyclesForA = findCyclesForTask(graph, 'a');
    expect(cyclesForA.length).toBeGreaterThan(0);

    const cyclesForC = findCyclesForTask(graph, 'c');
    expect(cyclesForC.length).toBe(0);
  });
});

describe('validateAcyclic', () => {
  it('should not throw for valid DAG', () => {
    const graph = new TaskGraphStore();
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

    expect(() => validateAcyclic(graph)).not.toThrow();
  });

  it('should throw for cyclic graph', () => {
    const graph = new TaskGraphStore();
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
      edges: ['a'],
      sub_items: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    graph.addNode(task);

    expect(() => validateAcyclic(graph)).toThrow(/circular dependency/i);
  });
});

describe('getCycleStatistics', () => {
  it('should return correct statistics', () => {
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
        edges: ['a'],
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
        description: 'Test task (not in cycle)',
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

    const stats = getCycleStatistics(graph);
    expect(stats.totalNodes).toBe(3);
    expect(stats.cycleCount).toBeGreaterThan(0);
    expect(stats.nodesInCycles).toBe(2);
    expect('3' in stats.cyclesByLength).toBe(true); // 3 in cycle array (a -> b -> a)
  });
});
