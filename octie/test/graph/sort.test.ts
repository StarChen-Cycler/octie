/**
 * Unit tests for topological sort algorithms
 * @module test/graph/sort
 */

import { describe, it, beforeEach, expect } from 'vitest';

import { TaskGraphStore } from '../../src/core/graph/index.js';
import {
  topologicalSort,
  findCriticalPath,
  isValidDAG,
  getExecutionLevels,
  clearSortCache,
} from '../../src/core/graph/sort.js';
import type { TaskNode } from '../../src/types/index.js';

describe('topologicalSort', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    clearSortCache();
    graph = new TaskGraphStore();
  });

  it('should return empty array for empty graph', () => {
    const result = topologicalSort(graph);
    expect(result.sorted.length).toBe(0);
    expect(result.hasCycle).toBe(false);
    expect(result.cycleNodes.length).toBe(0);
  });

  it('should return single node for graph with one node', () => {
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

    const result = topologicalSort(graph);
    expect(result.sorted).toEqual(['a']);
    expect(result.hasCycle).toBe(false);
    expect(result.cycleNodes.length).toBe(0);
  });

  it('should correctly sort linear chain', () => {
    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Task A',
        description: 'First task',
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
        description: 'Second task',
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
        description: 'Third task',
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

    const result = topologicalSort(graph);
    expect(result.sorted).toEqual(['a', 'b', 'c']);
    expect(result.hasCycle).toBe(false);
  });

  it('should handle parallel branches', () => {
    const tasks: TaskNode[] = [
      {
        id: 'root',
        title: 'Root',
        description: 'Root task',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc1', text: 'Done', completed: false }],
        deliverables: [{ id: 'del1', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['left', 'right'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'left',
        title: 'Left',
        description: 'Left branch',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc2', text: 'Done', completed: false }],
        deliverables: [{ id: 'del2', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['merge'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'right',
        title: 'Right',
        description: 'Right branch',
        status: 'not_started',
        priority: 'later',
        success_criteria: [{ id: 'sc3', text: 'Done', completed: false }],
        deliverables: [{ id: 'del3', text: 'Output', completed: false }],
        blockers: [],
        dependencies: [],
        edges: ['merge'],
        sub_items: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      },
      {
        id: 'merge',
        title: 'Merge',
        description: 'Merge point',
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

    const result = topologicalSort(graph);
    expect(result.sorted[0]).toBe('root');
    expect(result.sorted[3]).toBe('merge');
    expect(result.hasCycle).toBe(false);

    // Left and right can be in either order
    const middle = result.sorted.slice(1, 3);
    expect(middle).toContain('left');
    expect(middle).toContain('right');
  });

  it('should detect cycle', () => {
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
        edges: ['a'], // Creates cycle: a -> b -> c -> a
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

    const result = topologicalSort(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodes.length).toBeGreaterThan(0);
  });

  it('should handle self-loop', () => {
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

    const result = topologicalSort(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodes).toContain('a');
  });

  it('should use cache for repeated calls', () => {
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

    const result1 = topologicalSort(graph);
    const result2 = topologicalSort(graph);
    expect(result1).toEqual(result2);
  });
});

describe('findCriticalPath', () => {
  let graph: TaskGraphStore;

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  it('should return critical path for simple DAG', () => {
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

    const result = findCriticalPath(graph);
    expect(result.path).toEqual(['a', 'b', 'c']);
    expect(result.duration).toBe(3);
  });

  it('should throw error for cyclic graph', () => {
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
        edges: ['a'], // Cycle
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

    expect(() => findCriticalPath(graph)).toThrow(/circular/i);
  });
});

describe('isValidDAG', () => {
  it('should return true for valid DAG', () => {
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

    expect(isValidDAG(graph)).toBe(true);
  });

  it('should return false for cyclic graph', () => {
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

    expect(isValidDAG(graph)).toBe(false);
  });
});

describe('getExecutionLevels', () => {
  it('should return correct parallelizable stages', () => {
    const graph = new TaskGraphStore();

    const tasks: TaskNode[] = [
      {
        id: 'a',
        title: 'Root',
        description: 'Root',
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
        title: 'B',
        description: 'B',
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
        title: 'C',
        description: 'C',
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
        title: 'D',
        description: 'D',
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

    const levels = getExecutionLevels(graph);
    expect(levels.length).toBe(3);
    expect(levels[0]).toEqual(['a']);
    expect(levels[1]).toContain('b');
    expect(levels[1]).toContain('c');
    expect(levels[2]).toEqual(['d']);
  });
});
