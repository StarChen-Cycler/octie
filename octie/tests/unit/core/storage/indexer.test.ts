/**
 * IndexManager Unit Tests
 *
 * Tests for IndexManager class including:
 * - Index update tests
 * - Index rebuild tests
 * - Search functionality tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { IndexManager } from '../../../../src/core/storage/indexer.js';
import { TaskGraphStore } from '../../../../src/core/graph/index.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';

describe('IndexManager', () => {
  let indexManager: IndexManager;
  let graph: TaskGraphStore;

  beforeEach(() => {
    indexManager = new IndexManager();
    graph = new TaskGraphStore();
  });

  describe('constructor', () => {
    it('should initialize with empty indexes', () => {
      const indexes = indexManager.getIndexes();

      expect(indexes.byStatus.ready).toEqual([]);
      expect(indexes.byStatus.in_progress).toEqual([]);
      expect(indexes.byStatus.in_review).toEqual([]);
      expect(indexes.byStatus.completed).toEqual([]);
      expect(indexes.byStatus.blocked).toEqual([]);

      expect(indexes.byPriority.top).toEqual([]);
      expect(indexes.byPriority.second).toEqual([]);
      expect(indexes.byPriority.later).toEqual([]);

      expect(indexes.rootTasks).toEqual([]);
      expect(indexes.orphanTasks).toEqual([]);
    });
  });

  describe('index update tests', () => {
    it('should add new task to indexes', () => {
      const task = new TaskNode({
        title: 'Test index management functionality',
        description: 'A test task to verify index management works correctly with proper updates.',
        success_criteria: [{ id: uuidv4(), text: 'Test returns 200 status code', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/test.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      graph.addNode(task);
      indexManager.updateTask(task, null, graph);

      const indexes = indexManager.getIndexes();
      expect(indexes.byStatus.ready).toContain(task.id);
      expect(indexes.byPriority.top).toContain(task.id);
    });

    it('should update task indexes when status changes', () => {
      const task = new TaskNode({
        title: 'Status change test task',
        description: 'A task to test status changes in the index system by modifying task states.',
        success_criteria: [{ id: uuidv4(), text: 'Status field changes to in_progress', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/status.ts', completed: false }],
        status: 'ready',
        priority: 'second',
      });

      graph.addNode(task);
      indexManager.updateTask(task, null, graph);

      // Change status
      const updatedTask = new TaskNode({
        ...task,
        status: 'in_progress',
      });

      indexManager.updateTask(updatedTask, task, graph);

      const indexes = indexManager.getIndexes();
      expect(indexes.byStatus.ready).not.toContain(task.id);
      expect(indexes.byStatus.in_progress).toContain(task.id);
    });

    it('should update task indexes when priority changes', () => {
      const task = new TaskNode({
        title: 'Priority change test task',
        description: 'A task to test priority changes in the index system by modifying priority levels.',
        success_criteria: [{ id: uuidv4(), text: 'Priority field changes to top', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/priority.ts', completed: false }],
        status: 'ready',
        priority: 'later',
      });

      graph.addNode(task);
      indexManager.updateTask(task, null, graph);

      // Change priority
      const updatedTask = new TaskNode({
        ...task,
        priority: 'top',
      });

      indexManager.updateTask(updatedTask, task, graph);

      const indexes = indexManager.getIndexes();
      expect(indexes.byPriority.later).not.toContain(task.id);
      expect(indexes.byPriority.top).toContain(task.id);
    });

    it('should remove task from indexes when deleted', () => {
      const task = new TaskNode({
        title: 'Deletion test task',
        description: 'A task to test deletion from the index system by removing task records.',
        success_criteria: [{ id: uuidv4(), text: 'Task ID removed from all indexes', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/delete.ts', completed: false }],
        status: 'completed',
        priority: 'top',
      });

      graph.addNode(task);
      indexManager.updateTask(task, null, graph);

      // Verify task is in indexes
      let indexes = indexManager.getIndexes();
      expect(indexes.byStatus.completed).toContain(task.id);
      expect(indexes.byPriority.top).toContain(task.id);

      // Remove task from graph
      graph.removeNode(task.id);

      // Clear and rebuild indexes (simulating deletion)
      indexManager.clear();
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      // Verify task is removed from indexes
      indexes = indexManager.getIndexes();
      expect(indexes.byStatus.completed).not.toContain(task.id);
      expect(indexes.byPriority.top).not.toContain(task.id);
    });

    it('should handle multiple tasks with same status', () => {
      const task1 = new TaskNode({
        title: 'Create first pending task',
        description: 'First task with pending status for testing index management.',
        success_criteria: [{ id: uuidv4(), text: 'First passes', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/first.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      const task2 = new TaskNode({
        title: 'Create second pending task',
        description: 'Second task with pending status for testing index management.',
        success_criteria: [{ id: uuidv4(), text: 'Second passes', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/second.ts', completed: false }],
        status: 'ready',
        priority: 'second',
      });

      graph.addNode(task1);
      graph.addNode(task2);
      indexManager.updateTask(task1, null, graph);
      indexManager.updateTask(task2, null, graph);

      const indexes = indexManager.getIndexes();
      expect(indexes.byStatus.ready).toHaveLength(2);
      expect(indexes.byStatus.ready).toContain(task1.id);
      expect(indexes.byStatus.ready).toContain(task2.id);
    });
  });

  describe('index rebuild tests', () => {
    it('should rebuild all indexes from graph', () => {
      const task1 = new TaskNode({
        title: 'Rebuild test task one',
        description: 'First task for rebuild testing with proper initialization.',
        success_criteria: [{ id: uuidv4(), text: 'First rebuild returns correct status', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/rebuild1.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      const task2 = new TaskNode({
        title: 'Rebuild test task two',
        description: 'Second task for rebuild testing with proper initialization.',
        success_criteria: [{ id: uuidv4(), text: 'Second rebuild returns correct status', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/rebuild2.ts', completed: false }],
        status: 'in_progress',
        priority: 'second',
      });

      const task3 = new TaskNode({
        title: 'Rebuild test task three',
        description: 'Third task for rebuild testing with proper initialization.',
        success_criteria: [{ id: uuidv4(), text: 'Third rebuild returns correct status', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/rebuild3.ts', completed: false }],
        status: 'completed',
        priority: 'later',
      });

      // Add edges to create dependencies
      graph.addNode(task1);
      graph.addNode(task2);
      graph.addNode(task3);
      graph.addEdge(task1.id, task2.id);
      graph.addEdge(task2.id, task3.id);

      // Rebuild indexes - pass the nodes map directly
      // @ts-ignore - accessing private property for testing
      indexManager.rebuildIndexes(graph['_nodes'], graph);

      const indexes = indexManager.getIndexes();
      expect(indexes.byStatus.ready).toContain(task1.id);
      expect(indexes.byStatus.in_progress).toContain(task2.id);
      expect(indexes.byStatus.completed).toContain(task3.id);

      expect(indexes.byPriority.top).toContain(task1.id);
      expect(indexes.byPriority.second).toContain(task2.id);
      expect(indexes.byPriority.later).toContain(task3.id);

      // task1 should be root (no incoming)
      expect(indexes.rootTasks).toContain(task1.id);
      expect(indexes.rootTasks).not.toContain(task2.id);
      expect(indexes.rootTasks).not.toContain(task3.id);
    });

    it('should identify orphan tasks correctly', () => {
      const task1 = new TaskNode({
        title: 'Orphan test task',
        description: 'A task with no connections to test orphan detection in the graph.',
        success_criteria: [{ id: uuidv4(), text: 'Orphan status detected correctly', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/orphan.ts', completed: false }],
        status: 'ready',
        priority: 'later',
      });

      graph.addNode(task1);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      const indexes = indexManager.getIndexes();
      expect(indexes.orphanTasks).toContain(task1.id);
    });

    it('should clear previous indexes on rebuild', () => {
      const task1 = new TaskNode({
        title: 'Create initial task',
        description: 'Task added before rebuild to verify incremental updates.',
        success_criteria: [{ id: uuidv4(), text: 'Initial index contains task ID', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/initial.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      graph.addNode(task1);
      indexManager.updateTask(task1, null, graph);

      // Add more tasks and rebuild
      const task2 = new TaskNode({
        title: 'Rebuild task',
        description: 'Task added during rebuild to verify full index rebuild.',
        success_criteria: [{ id: uuidv4(), text: 'Rebuild index contains task ID', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/rebuild.ts', completed: false }],
        status: 'completed',
        priority: 'second',
      });

      graph.addNode(task2);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      const indexes = indexManager.getIndexes();
      expect(indexes.byStatus.ready).toContain(task1.id);
      expect(indexes.byStatus.completed).toContain(task2.id);
    });
  });

  describe('search functionality tests', () => {
    it('should find tasks by status', () => {
      const task1 = new TaskNode({
        title: 'Search for pending task',
        description: 'A pending task to test status search functionality and filtering.',
        success_criteria: [{ id: uuidv4(), text: 'Pending search returns task ID', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/search-pending.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      const task2 = new TaskNode({
        title: 'Search for completed task',
        description: 'A completed task to test status search functionality and filtering.',
        success_criteria: [{ id: uuidv4(), text: 'Completed search returns task ID', completed: true }],
        deliverables: [{ id: uuidv4(), text: 'src/search-completed.ts', completed: true }],
        status: 'completed',
        priority: 'second',
      });

      graph.addNode(task1);
      graph.addNode(task2);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      const pendingTasks = indexManager.getByStatus('ready');
      const completedTasks = indexManager.getByStatus('completed');

      expect(pendingTasks).toEqual([task1.id]);
      expect(completedTasks).toEqual([task2.id]);
    });

    it('should find tasks by priority', () => {
      const task1 = new TaskNode({
        title: 'Create top priority task',
        description: 'A top priority task to test priority search and filtering.',
        success_criteria: [{ id: uuidv4(), text: 'Top priority search returns task ID', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/top.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      const task2 = new TaskNode({
        title: 'Create second priority task',
        description: 'A second priority task to test priority search and filtering.',
        success_criteria: [{ id: uuidv4(), text: 'Second priority search returns task ID', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/second.ts', completed: false }],
        status: 'ready',
        priority: 'second',
      });

      graph.addNode(task1);
      graph.addNode(task2);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      const topTasks = indexManager.getByPriority('top');
      const secondTasks = indexManager.getByPriority('second');

      expect(topTasks).toEqual([task1.id]);
      expect(secondTasks).toEqual([task2.id]);
    });

    it('should search tasks by text', () => {
      const task1 = new TaskNode({
        title: 'Implement authentication feature',
        description: 'Add login and signup functionality with JWT tokens for secure user access.',
        success_criteria: [{ id: uuidv4(), text: 'Authentication endpoint returns 200 status', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/auth/login.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      const task2 = new TaskNode({
        title: 'Create user profile page',
        description: 'Build profile management interface with settings and preferences.',
        success_criteria: [{ id: uuidv4(), text: 'Profile page renders in < 100ms', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/profile/page.tsx', completed: false }],
        status: 'ready',
        priority: 'second',
      });

      graph.addNode(task1);
      graph.addNode(task2);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      // Search for 'authentication'
      const authResults = indexManager.search('authentication');
      expect(authResults).toContain(task1.id);
      expect(authResults).not.toContain(task2.id);

      // Search for 'profile'
      const profileResults = indexManager.search('profile');
      expect(profileResults).toContain(task2.id);
      expect(profileResults).not.toContain(task1.id);
    });

    it('should find tasks by related files', () => {
      const task1 = new TaskNode({
        title: 'Add new fields to user model',
        description: 'Modify the user data model to include new fields for profile information.',
        success_criteria: [{ id: uuidv4(), text: 'User model has new fields added', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/models/user.ts', completed: false }],
        related_files: ['src/models/user.ts', 'src/types/user.ts'],
        status: 'ready',
        priority: 'top',
      });

      const task2 = new TaskNode({
        title: 'Add pricing to product model',
        description: 'Modify the product data model to include pricing information.',
        success_criteria: [{ id: uuidv4(), text: 'Product model has pricing fields added', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/models/product.ts', completed: false }],
        related_files: ['src/models/product.ts'],
        status: 'ready',
        priority: 'second',
      });

      graph.addNode(task1);
      graph.addNode(task2);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      // Find tasks by file
      const userTasks = indexManager.getByFile('src/models/user.ts');
      expect(userTasks).toContain(task1.id);
      expect(userTasks).not.toContain(task2.id);

      const productTasks = indexManager.getByFile('src/models/product.ts');
      expect(productTasks).toContain(task2.id);
      expect(productTasks).not.toContain(task1.id);
    });

    it('should return root tasks correctly', () => {
      const task1 = new TaskNode({
        title: 'Create root task',
        description: 'A task with no dependencies to test root task detection.',
        success_criteria: [{ id: uuidv4(), text: 'Root task has zero incoming edges', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/root.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      const task2 = new TaskNode({
        title: 'Create child task',
        description: 'A task that depends on the root task for dependency testing.',
        success_criteria: [{ id: uuidv4(), text: 'Child task has one incoming edge', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/child.ts', completed: false }],
        status: 'ready',
        priority: 'second',
      });

      graph.addNode(task1);
      graph.addNode(task2);
      graph.addEdge(task1.id, task2.id);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      const roots = indexManager.getRootTasks();
      expect(roots).toEqual([task1.id]);
      expect(roots).not.toContain(task2.id);
    });

    it('should return orphan tasks correctly', () => {
      const task1 = new TaskNode({
        title: 'Create orphan task',
        description: 'A task with no edges to test orphan detection in the graph.',
        success_criteria: [{ id: uuidv4(), text: 'Orphan task has zero edges total', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/orphan.ts', completed: false }],
        status: 'ready',
        priority: 'later',
      });

      graph.addNode(task1);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      const orphans = indexManager.getOrphanTasks();
      expect(orphans).toEqual([task1.id]);
    });
  });

  describe('stats tests', () => {
    it('should return correct statistics', () => {
      const task1 = new TaskNode({
        title: 'Stats test task one',
        description: 'First task for statistics testing with proper counters.',
        success_criteria: [{ id: uuidv4(), text: 'First statistics count matches', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/stats1.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      const task2 = new TaskNode({
        title: 'Stats test task two',
        description: 'Second task for statistics testing with proper counters.',
        success_criteria: [{ id: uuidv4(), text: 'Second statistics count matches', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/stats2.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      const task3 = new TaskNode({
        title: 'Stats test task three',
        description: 'Third task for statistics testing with proper counters.',
        success_criteria: [{ id: uuidv4(), text: 'Third statistics count matches', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/stats3.ts', completed: false }],
        status: 'completed',
        priority: 'second',
      });

      graph.addNode(task1);
      graph.addNode(task2);
      graph.addNode(task3);
      indexManager.rebuildIndexes(graph["_nodes"], graph); // @ts-ignore

      const stats = indexManager.getStats();

      expect(stats.statusCounts.ready).toBe(2);
      expect(stats.statusCounts.completed).toBe(1);
      expect(stats.statusCounts.in_review).toBe(0);
      expect(stats.statusCounts.in_progress).toBe(0);
      expect(stats.statusCounts.blocked).toBe(0);

      expect(stats.priorityCounts.top).toBe(2);
      expect(stats.priorityCounts.second).toBe(1);
      expect(stats.priorityCounts.later).toBe(0);
    });
  });

  describe('clear tests', () => {
    it('should clear all indexes', () => {
      const task = new TaskNode({
        title: 'Create clear test task',
        description: 'A task to test clearing the index system by removing all tracked data.',
        success_criteria: [{ id: uuidv4(), text: 'All indexes return empty arrays', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/clear.ts', completed: false }],
        status: 'ready',
        priority: 'top',
      });

      graph.addNode(task);
      indexManager.updateTask(task, null, graph);

      // Clear indexes
      indexManager.clear();

      const indexes = indexManager.getIndexes();
      expect(indexes.byStatus.ready).toEqual([]);
      expect(indexes.byPriority.top).toEqual([]);
      expect(indexes.rootTasks).toEqual([]);
      expect(indexes.orphanTasks).toEqual([]);
    });
  });
});
