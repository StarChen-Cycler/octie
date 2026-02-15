/**
 * Tests for graph manipulation operations
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { TaskGraphStore } from '../../src/core/graph/index.js';
import { TaskNode } from '../../src/core/models/task-node.js';
import {
  cutNode,
  insertNodeBetween,
  moveSubtree,
  mergeTasks,
  getDescendants,
  getAncestors,
  isValidSubtreeMove,
} from '../../src/core/graph/operations.js';
import { TaskNotFoundError, ValidationError } from '../../src/types/index.js';

describe('graph operations', () => {
  let graph: TaskGraphStore;

  function createTask(id: string, title: string, description?: string): TaskNode {
    // Generate atomic task compliant title and description
    const atomicTitle = `Implement ${title} feature with full validation`;
    const defaultDescription = `This task implements the ${title} feature with comprehensive validation and error handling. It includes all necessary unit tests and integration tests.`;
    return new TaskNode({
      id,
      title: atomicTitle,
      description: description || defaultDescription,
      status: 'not_started',
      priority: 'later',
      success_criteria: [{ id: `${id}-sc1`, text: 'Implementation passes all unit tests with 100% code coverage', completed: false }],
      deliverables: [{ id: `${id}-del1`, text: `Source code file for ${title} implementation`, completed: false }],
    });
  }

  beforeEach(() => {
    graph = new TaskGraphStore();
  });

  describe('cutNode', () => {
    it('should cut node and reconnect edges in linear chain', () => {
      // Graph: A -> B -> C
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');

      // Cut B
      cutNode(graph, 'b');

      // Result: A -> C, B removed
      assert.strictEqual(graph.size, 2);
      assert.ok(graph.hasNode('a'));
      assert.ok(graph.hasNode('c'));
      assert.ok(!graph.hasNode('b'));
      assert.ok(graph.hasEdge('a', 'c'));
      assert.ok(!graph.hasEdge('a', 'b'));
      assert.ok(!graph.hasEdge('b', 'c'));
    });

    it('should reconnect multiple incoming to multiple outgoing', () => {
      // Graph: A -> B, X -> B, B -> C, B -> Y
      const taskA = createTask('a', 'Task A');
      const taskX = createTask('x', 'Task X');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');
      const taskY = createTask('y', 'Task Y');

      graph.addNode(taskA);
      graph.addNode(taskX);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addNode(taskY);
      graph.addEdge('a', 'b');
      graph.addEdge('x', 'b');
      graph.addEdge('b', 'c');
      graph.addEdge('b', 'y');

      // Cut B
      cutNode(graph, 'b');

      // Result: A -> C, A -> Y, X -> C, X -> Y
      assert.ok(graph.hasEdge('a', 'c'));
      assert.ok(graph.hasEdge('a', 'y'));
      assert.ok(graph.hasEdge('x', 'c'));
      assert.ok(graph.hasEdge('x', 'y'));
      assert.ok(!graph.hasNode('b'));
    });

    it('should handle node with no incoming edges', () => {
      // Graph: A -> B, B has no incoming
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addEdge('a', 'b');

      // Cut A (has no incoming)
      cutNode(graph, 'a');

      assert.strictEqual(graph.size, 1);
      assert.ok(graph.hasNode('b'));
      assert.ok(!graph.hasNode('a'));
    });

    it('should handle node with no outgoing edges', () => {
      // Graph: A -> B, B has no outgoing
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addEdge('a', 'b');

      // Cut B (has no outgoing)
      cutNode(graph, 'b');

      assert.strictEqual(graph.size, 1);
      assert.ok(graph.hasNode('a'));
      assert.ok(!graph.hasNode('b'));
    });

    it('should throw error if node not found', () => {
      assert.throws(
        () => cutNode(graph, 'nonexistent'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });

    it('should not create duplicate edges', () => {
      // Graph: A -> B -> C, A -> C (edge already exists)
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');
      graph.addEdge('a', 'c');

      // Cut B (A -> C already exists, should not throw)
      cutNode(graph, 'b');

      assert.ok(graph.hasEdge('a', 'c'));
      assert.strictEqual(graph.getOutgoingEdges('a').length, 1);
    });
  });

  describe('insertNodeBetween', () => {
    it('should insert node between two connected nodes', () => {
      // Graph: A -> C
      const taskA = createTask('a', 'Task A');
      const taskC = createTask('c', 'Task C');
      const taskB = createTask('b', 'Task B');

      graph.addNode(taskA);
      graph.addNode(taskC);
      graph.addEdge('a', 'c');

      // Insert B between A and C
      insertNodeBetween(graph, taskB, 'a', 'c');

      // Result: A -> B -> C
      assert.ok(graph.hasNode('b'));
      assert.ok(graph.hasEdge('a', 'b'));
      assert.ok(graph.hasEdge('b', 'c'));
      assert.ok(!graph.hasEdge('a', 'c'));
    });

    it('should throw error if source node not found', () => {
      const taskC = createTask('c', 'Task C');
      const taskB = createTask('b', 'Task B');

      graph.addNode(taskC);

      assert.throws(
        () => insertNodeBetween(graph, taskB, 'a', 'c'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });

    it('should throw error if target node not found', () => {
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');

      graph.addNode(taskA);

      assert.throws(
        () => insertNodeBetween(graph, taskB, 'a', 'c'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });

    it('should throw error if edge does not exist', () => {
      const taskA = createTask('a', 'Task A');
      const taskC = createTask('c', 'Task C');
      const taskB = createTask('b', 'Task B');

      graph.addNode(taskA);
      graph.addNode(taskC);
      // No edge from A to C

      assert.throws(
        () => insertNodeBetween(graph, taskB, 'a', 'c'),
        (err: Error) => err instanceof ValidationError
      );
    });
  });

  describe('moveSubtree', () => {
    it('should move subtree to new parent', () => {
      // Graph: A -> X, B -> Y
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskX = createTask('x', 'Task X');
      const taskY = createTask('y', 'Task Y');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskX);
      graph.addNode(taskY);
      graph.addEdge('a', 'x');
      graph.addEdge('b', 'y');

      // Move Y to be under X
      moveSubtree(graph, 'y', 'x');

      // Result: A -> X -> Y, B (with Y moved)
      assert.ok(graph.hasEdge('x', 'y'));
      assert.ok(!graph.hasEdge('b', 'y'));
    });

    it('should remove from all current parents', () => {
      // Graph: A -> Y, B -> Y, C -> Y
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');
      const taskY = createTask('y', 'Task Y');
      const taskX = createTask('x', 'Task X');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addNode(taskY);
      graph.addNode(taskX);
      graph.addEdge('a', 'y');
      graph.addEdge('b', 'y');
      graph.addEdge('c', 'y');

      // Move Y to be under X
      moveSubtree(graph, 'y', 'x');

      // Result: X -> Y, A, B, C (all edges from old parents removed)
      assert.ok(graph.hasEdge('x', 'y'));
      assert.ok(!graph.hasEdge('a', 'y'));
      assert.ok(!graph.hasEdge('b', 'y'));
      assert.ok(!graph.hasEdge('c', 'y'));
    });

    it('should throw error for self-loop', () => {
      const taskY = createTask('y', 'Task Y');
      graph.addNode(taskY);

      assert.throws(
        () => moveSubtree(graph, 'y', 'y'),
        (err: Error) => err instanceof ValidationError
      );
    });

    it('should throw error if edge already exists', () => {
      // Graph: A -> Y, B -> Y
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskY = createTask('y', 'Task Y');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskY);
      graph.addEdge('a', 'y');
      graph.addEdge('b', 'y');

      // Try to move Y to A (edge already exists)
      assert.throws(
        () => moveSubtree(graph, 'y', 'a'),
        (err: Error) => err instanceof ValidationError
      );
    });

    it('should throw error if subtree not found', () => {
      const taskX = createTask('x', 'Task X');
      graph.addNode(taskX);

      assert.throws(
        () => moveSubtree(graph, 'y', 'x'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });

    it('should throw error if new parent not found', () => {
      const taskY = createTask('y', 'Task Y');
      graph.addNode(taskY);

      assert.throws(
        () => moveSubtree(graph, 'y', 'x'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });
  });

  describe('mergeTasks', () => {
    it('should merge two tasks', () => {
      // Graph: A -> source -> C, B -> target -> D
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');
      const taskD = createTask('d', 'Task D');

      const source = createTask('source', 'Source Task');
      source.description = 'Source description';
      source.success_criteria = [
        { id: 'sc1', text: 'Source criterion 1', completed: false },
        { id: 'sc2', text: 'Source criterion 2', completed: true },
      ];
      source.deliverables = [
        { id: 'del1', text: 'Source deliverable 1', completed: false },
      ];
      source.related_files = ['file1.ts', 'file2.ts'];
      source.notes = 'Source notes';
      source.c7_verified = [{ library_id: '/test/lib', verified_at: '2024-01-01T00:00:00Z' }];

      const target = createTask('target', 'Target Task');
      target.description = 'Target description';
      target.success_criteria = [
        { id: 'sc3', text: 'Target criterion 1', completed: false },
      ];
      target.deliverables = [
        { id: 'del2', text: 'Target deliverable 1', completed: false },
      ];
      target.related_files = ['file3.ts'];
      target.notes = 'Target notes';

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addNode(taskD);
      graph.addNode(source);
      graph.addNode(target);
      graph.addEdge('a', 'source');
      graph.addEdge('source', 'c');
      graph.addEdge('b', 'target');
      graph.addEdge('target', 'd');

      // Merge source into target
      const result = mergeTasks(graph, 'source', 'target');

      // Verify merge result
      assert.strictEqual(result.task.id, 'target');
      assert.strictEqual(result.removedTasks.length, 1);
      assert.strictEqual(result.removedTasks[0], 'source');
      assert.ok(result.updatedTasks.includes('target'));

      // Verify merged properties
      assert.ok(result.task.description.includes('Source description'));
      assert.ok(result.task.description.includes('Target description'));
      assert.strictEqual(result.task.success_criteria.length, 3); // 2 source + 1 target
      assert.strictEqual(result.task.deliverables.length, 2); // 1 source + 1 target
      assert.strictEqual(result.task.related_files.length, 3); // 2 source + 1 target
      assert.ok(result.task.notes.includes('Source notes'));
      assert.ok(result.task.notes.includes('Target notes'));

      // Verify source removed
      assert.ok(!graph.hasNode('source'));

      // Verify edges reconnected
      assert.ok(graph.hasEdge('a', 'target')); // A now points to target
      assert.ok(graph.hasEdge('target', 'c')); // target now points to C
      assert.ok(graph.hasEdge('b', 'target')); // B still points to target
      assert.ok(graph.hasEdge('target', 'd')); // target still points to D
    });

    it('should deduplicate success criteria by ID', () => {
      const source = createTask('source', 'Source Task');
      const target = createTask('target', 'Target Task');

      source.success_criteria = [
        { id: 'sc1', text: 'Source criterion 1', completed: false },
        { id: 'sc2', text: 'Source criterion 2', completed: false },
      ];
      target.success_criteria = [
        { id: 'sc1', text: 'Target criterion 1 (same ID)', completed: true },
        { id: 'sc3', text: 'Target criterion 3', completed: false },
      ];

      graph.addNode(source);
      graph.addNode(target);

      const result = mergeTasks(graph, 'source', 'target');

      // Should have 3 unique criteria (sc1 not duplicated)
      assert.strictEqual(result.task.success_criteria.length, 3);
      assert.ok(result.task.success_criteria.some(sc => sc.id === 'sc1'));
      assert.ok(result.task.success_criteria.some(sc => sc.id === 'sc2'));
      assert.ok(result.task.success_criteria.some(sc => sc.id === 'sc3'));
    });

    it('should deduplicate deliverables by ID', () => {
      const source = createTask('source', 'Source Task');
      const target = createTask('target', 'Target Task');

      source.deliverables = [
        { id: 'del1', text: 'Source deliverable 1', completed: false },
        { id: 'del2', text: 'Source deliverable 2', completed: false },
      ];
      target.deliverables = [
        { id: 'del1', text: 'Target deliverable 1 (same ID)', completed: true },
        { id: 'del3', text: 'Target deliverable 3', completed: false },
      ];

      graph.addNode(source);
      graph.addNode(target);

      const result = mergeTasks(graph, 'source', 'target');

      // Should have 3 unique deliverables (del1 not duplicated)
      assert.strictEqual(result.task.deliverables.length, 3);
    });

    it('should throw error for same task', () => {
      const taskA = createTask('a', 'Task A');
      graph.addNode(taskA);

      assert.throws(
        () => mergeTasks(graph, 'a', 'a'),
        (err: Error) => err instanceof ValidationError
      );
    });

    it('should throw error if source not found', () => {
      const target = createTask('target', 'Target Task');
      graph.addNode(target);

      assert.throws(
        () => mergeTasks(graph, 'source', 'target'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });

    it('should throw error if target not found', () => {
      const source = createTask('source', 'Source Task');
      graph.addNode(source);

      assert.throws(
        () => mergeTasks(graph, 'source', 'target'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });

    it('should filter out source from target blockers', () => {
      const source = createTask('source', 'Source Task');
      const target = createTask('target', 'Target Task');
      target.blockers = ['source', 'other'];

      graph.addNode(source);
      graph.addNode(target);

      const result = mergeTasks(graph, 'source', 'target');

      assert.ok(!result.task.blockers.includes('source'));
      assert.ok(result.task.blockers.includes('other'));
    });

    it('should filter out source from target dependencies', () => {
      const source = createTask('source', 'Source Task');
      const target = createTask('target', 'Target Task');
      target.dependencies = ['source', 'other'];

      graph.addNode(source);
      graph.addNode(target);

      const result = mergeTasks(graph, 'source', 'target');

      assert.ok(!result.task.dependencies.includes('source'));
      assert.ok(result.task.dependencies.includes('other'));
    });

    it('should not create duplicate edges during reconnection', () => {
      // Graph: A -> source, A -> target, source -> C, target -> C
      const taskA = createTask('a', 'Task A');
      const taskC = createTask('c', 'Task C');
      const source = createTask('source', 'Source Task');
      const target = createTask('target', 'Target Task');

      graph.addNode(taskA);
      graph.addNode(taskC);
      graph.addNode(source);
      graph.addNode(target);
      graph.addEdge('a', 'source');
      graph.addEdge('a', 'target'); // A already points to target
      graph.addEdge('source', 'c');
      graph.addEdge('target', 'c'); // target already points to C

      // Merge source into target
      mergeTasks(graph, 'source', 'target');

      // Should not throw error about duplicate edges
      // A should still only have one edge to target
      assert.strictEqual(graph.getOutgoingEdges('a').length, 1);
      assert.ok(graph.hasEdge('a', 'target'));

      // target should still only have one edge to C
      assert.strictEqual(graph.getOutgoingEdges('target').length, 1);
      assert.ok(graph.hasEdge('target', 'c'));
    });
  });

  describe('getDescendants', () => {
    it('should return all descendants', () => {
      // Graph: A -> B -> C -> D
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');
      const taskD = createTask('d', 'Task D');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addNode(taskD);
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');
      graph.addEdge('c', 'd');

      const descendants = getDescendants(graph, 'a');

      assert.ok(descendants.has('a'));
      assert.ok(descendants.has('b'));
      assert.ok(descendants.has('c'));
      assert.ok(descendants.has('d'));
      assert.strictEqual(descendants.size, 4);
    });

    it('should handle branching', () => {
      // Graph: A -> B, A -> C, B -> D, C -> E
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');
      const taskD = createTask('d', 'Task D');
      const taskE = createTask('e', 'Task E');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addNode(taskD);
      graph.addNode(taskE);
      graph.addEdge('a', 'b');
      graph.addEdge('a', 'c');
      graph.addEdge('b', 'd');
      graph.addEdge('c', 'e');

      const descendants = getDescendants(graph, 'a');

      assert.strictEqual(descendants.size, 5);
      assert.ok(descendants.has('a'));
      assert.ok(descendants.has('b'));
      assert.ok(descendants.has('c'));
      assert.ok(descendants.has('d'));
      assert.ok(descendants.has('e'));
    });

    it('should return only the node for leaf', () => {
      const taskA = createTask('a', 'Task A');
      graph.addNode(taskA);

      const descendants = getDescendants(graph, 'a');

      assert.strictEqual(descendants.size, 1);
      assert.ok(descendants.has('a'));
    });

    it('should throw error if node not found', () => {
      assert.throws(
        () => getDescendants(graph, 'nonexistent'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });
  });

  describe('getAncestors', () => {
    it('should return all ancestors', () => {
      // Graph: A -> B -> C -> D
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');
      const taskD = createTask('d', 'Task D');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addNode(taskD);
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');
      graph.addEdge('c', 'd');

      const ancestors = getAncestors(graph, 'd');

      assert.ok(ancestors.has('d'));
      assert.ok(ancestors.has('c'));
      assert.ok(ancestors.has('b'));
      assert.ok(ancestors.has('a'));
      assert.strictEqual(ancestors.size, 4);
    });

    it('should handle multiple parents', () => {
      // Graph: A -> C, B -> C
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addEdge('a', 'c');
      graph.addEdge('b', 'c');

      const ancestors = getAncestors(graph, 'c');

      assert.strictEqual(ancestors.size, 3);
      assert.ok(ancestors.has('c'));
      assert.ok(ancestors.has('a'));
      assert.ok(ancestors.has('b'));
    });

    it('should return only the node for root', () => {
      const taskA = createTask('a', 'Task A');
      graph.addNode(taskA);

      const ancestors = getAncestors(graph, 'a');

      assert.strictEqual(ancestors.size, 1);
      assert.ok(ancestors.has('a'));
    });

    it('should throw error if node not found', () => {
      assert.throws(
        () => getAncestors(graph, 'nonexistent'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });
  });

  describe('isValidSubtreeMove', () => {
    it('should return true for valid move', () => {
      // Graph: A -> B -> C
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');

      // Moving C to A is valid (won't create cycle)
      assert.strictEqual(isValidSubtreeMove(graph, 'c', 'a'), true);
    });

    it('should return false for move that would create cycle', () => {
      // Graph: A -> B -> C
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');

      // Moving A to C would create cycle: A -> B -> C -> A
      assert.strictEqual(isValidSubtreeMove(graph, 'a', 'c'), false);
    });

    it('should return false for move to descendant', () => {
      // Graph: A -> B -> C -> D
      const taskA = createTask('a', 'Task A');
      const taskB = createTask('b', 'Task B');
      const taskC = createTask('c', 'Task C');
      const taskD = createTask('d', 'Task D');

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addNode(taskD);
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');
      graph.addEdge('c', 'd');

      // Moving A to any descendant would create cycle
      assert.strictEqual(isValidSubtreeMove(graph, 'a', 'b'), false);
      assert.strictEqual(isValidSubtreeMove(graph, 'a', 'c'), false);
      assert.strictEqual(isValidSubtreeMove(graph, 'a', 'd'), false);
    });

    it('should throw error if subtree not found', () => {
      const taskX = createTask('x', 'Task X');
      graph.addNode(taskX);

      assert.throws(
        () => isValidSubtreeMove(graph, 'y', 'x'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });

    it('should throw error if new parent not found', () => {
      const taskY = createTask('y', 'Task Y');
      graph.addNode(taskY);

      assert.throws(
        () => isValidSubtreeMove(graph, 'y', 'x'),
        (err: Error) => err instanceof TaskNotFoundError
      );
    });
  });
});
