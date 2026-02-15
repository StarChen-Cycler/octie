/**
 * Unit tests for topological sort algorithms
 * @module test/graph/sort
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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
    assert.strictEqual(result.sorted.length, 0);
    assert.strictEqual(result.hasCycle, false);
    assert.strictEqual(result.cycleNodes.length, 0);
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
    assert.deepStrictEqual(result.sorted, ['a']);
    assert.strictEqual(result.hasCycle, false);
    assert.strictEqual(result.cycleNodes.length, 0);
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
    assert.deepStrictEqual(result.sorted, ['a', 'b', 'c']);
    assert.strictEqual(result.hasCycle, false);
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
    assert.strictEqual(result.sorted[0], 'root');
    assert.strictEqual(result.sorted[3], 'merge');
    assert.strictEqual(result.hasCycle, false);

    // Left and right can be in either order
    const middle = result.sorted.slice(1, 3);
    assert.ok(middle.includes('left'));
    assert.ok(middle.includes('right'));
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
    assert.strictEqual(result.hasCycle, true);
    assert.ok(result.cycleNodes.length > 0);
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
    assert.strictEqual(result.hasCycle, true);
    assert.ok(result.cycleNodes.includes('a'));
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
    assert.deepStrictEqual(result1, result2);
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
    assert.deepStrictEqual(result.path, ['a', 'b', 'c']);
    assert.strictEqual(result.duration, 3);
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

    assert.throws(
      () => findCriticalPath(graph),
      (err: Error) => err.name === 'CircularDependencyError'
    );
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

    assert.strictEqual(isValidDAG(graph), true);
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

    assert.strictEqual(isValidDAG(graph), false);
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
    assert.strictEqual(levels.length, 3);
    assert.deepStrictEqual(levels[0], ['a']);
    assert.ok(levels[1].includes('b'));
    assert.ok(levels[1].includes('c'));
    assert.deepStrictEqual(levels[2], ['d']);
  });
});
