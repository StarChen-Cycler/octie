/**
 * TaskGraphStore Structure Tests
 *
 * Tests for TaskGraphStore class including:
 * - Add node tests
 * - Remove node tests
 * - Add edge tests
 * - Remove edge tests
 * - Get node tests (O(1) verification)
 * - Get outgoing edges tests
 * - Get incoming edges tests
 * - Duplicate edge prevention tests
 * - Root tasks detection
 * - Orphan tasks detection
 * - Leaf tasks detection
 * - Serialization/deserialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { TaskGraphStore } from '../../../../src/core/graph/index.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';
import { ValidationError, TaskNotFoundError } from '../../../../src/types/index.js';

describe('TaskGraphStore', () => {
  let graph: TaskGraphStore;
  let taskA: TaskNode;
  let taskB: TaskNode;
  let taskC: TaskNode;

  beforeEach(() => {
    graph = new TaskGraphStore();

    // Create test tasks
    taskA = new TaskNode({
      title: 'Implement login endpoint',
      description: 'Create POST /auth/login endpoint that validates credentials and returns JWT token. The endpoint should use bcrypt for password hashing and return a 200 status with valid JWT on correct credentials.',
      success_criteria: [
        { id: uuidv4(), text: 'Endpoint returns 200', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'src/api/auth/login.ts', completed: false },
      ],
    });

    taskB = new TaskNode({
      title: 'Write user service',
      description: 'Create user service with CRUD operations for managing user accounts in the system. The service should handle user creation, updates, deletion, and retrieval with proper error handling.',
      success_criteria: [
        { id: uuidv4(), text: 'Service has CRUD methods', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'src/services/user.service.ts', completed: false },
      ],
    });

    taskC = new TaskNode({
      title: 'Add unit tests',
      description: 'Write comprehensive unit tests for all service methods to ensure code quality and catch bugs early. Tests should cover happy paths and edge cases.',
      success_criteria: [
        { id: uuidv4(), text: 'All methods have tests', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'tests/services/user.service.test.ts', completed: false },
      ],
    });
  });

  describe('constructor', () => {
    it('should create empty graph', () => {
      expect(graph.size).toBe(0);
      expect(graph.getAllTaskIds()).toEqual([]);
      expect(graph.getAllTasks()).toEqual([]);
    });

    it('should create graph with default metadata', () => {
      const metadata = graph.metadata;
      expect(metadata.project_name).toBe('Untitled Project');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.created_at).toBeDefined();
      expect(metadata.updated_at).toBeDefined();
    });

    it('should create graph with custom metadata', () => {
      const customGraph = new TaskGraphStore({
        project_name: 'Custom Project',
        version: '2.0.0',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      expect(customGraph.metadata.project_name).toBe('Custom Project');
      expect(customGraph.metadata.version).toBe('2.0.0');
    });
  });

  describe('add node', () => {
    it('should add node to graph', () => {
      graph.addNode(taskA);

      expect(graph.size).toBe(1);
      expect(graph.hasNode(taskA.id)).toBe(true);
      expect(graph.getNode(taskA.id)).toBe(taskA);
    });

    it('should throw ValidationError if node ID already exists', () => {
      graph.addNode(taskA);

      expect(() => {
        graph.addNode(taskA);
      }).toThrow(ValidationError);
      expect(() => {
        graph.addNode(taskA);
      }).toThrow('already exists');
    });

    it('should initialize edge maps for new node', () => {
      graph.addNode(taskA);

      expect(graph.getOutgoingEdges(taskA.id)).toEqual([]);
      expect(graph.getIncomingEdges(taskA.id)).toEqual([]);
    });

    it('should initialize edge maps from node edges', () => {
      // Add edges to taskA before adding to graph
      taskA.addEdge(taskB.id);
      taskA.addEdge(taskC.id);

      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);

      expect(graph.getOutgoingEdges(taskA.id)).toEqual([taskB.id, taskC.id]);
      expect(graph.getIncomingEdges(taskB.id)).toEqual([taskA.id]);
      expect(graph.getIncomingEdges(taskC.id)).toEqual([taskA.id]);
    });

    it('should update metadata timestamp on add', async () => {
      graph.addNode(taskA);
      const beforeUpdate = graph.metadata.updated_at;

      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      graph.addNode(taskB);
      const afterUpdate = graph.metadata.updated_at;

      expect(afterUpdate).not.toBe(beforeUpdate);
    });
  });

  describe('remove node', () => {
    it('should remove node from graph', () => {
      graph.addNode(taskA);
      graph.addNode(taskB);

      graph.removeNode(taskA.id);

      expect(graph.size).toBe(1);
      expect(graph.hasNode(taskA.id)).toBe(false);
      expect(graph.getNode(taskA.id)).toBeUndefined();
    });

    it('should throw TaskNotFoundError if node does not exist', () => {
      expect(() => {
        graph.removeNode('non-existent-id');
      }).toThrow(TaskNotFoundError);
    });

    it('should remove all outgoing edges from node', () => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);

      graph.addEdge(taskA.id, taskB.id);
      graph.addEdge(taskA.id, taskC.id);

      graph.removeNode(taskA.id);

      expect(graph.getIncomingEdges(taskB.id)).toEqual([]);
      expect(graph.getIncomingEdges(taskC.id)).toEqual([]);
    });

    it('should remove all incoming edges to node', () => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);

      graph.addEdge(taskA.id, taskC.id);
      graph.addEdge(taskB.id, taskC.id);

      graph.removeNode(taskC.id);

      expect(graph.getOutgoingEdges(taskA.id)).toEqual([]);
      expect(graph.getOutgoingEdges(taskB.id)).toEqual([]);
    });

    it('should update metadata timestamp on remove', async () => {
      graph.addNode(taskA);
      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      const beforeUpdate = graph.metadata.updated_at;

      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      graph.removeNode(taskA.id);
      const afterUpdate = graph.metadata.updated_at;

      expect(afterUpdate).not.toBe(beforeUpdate);
    });
  });

  describe('update node', () => {
    it('should update existing node', () => {
      graph.addNode(taskA);

      taskA.setTitle('Updated title');
      graph.updateNode(taskA);

      const updated = graph.getNode(taskA.id);
      expect(updated?.title).toBe('Updated title');
    });

    it('should throw TaskNotFoundError if node does not exist', () => {
      expect(() => {
        graph.updateNode(taskA);
      }).toThrow(TaskNotFoundError);
    });

    it('should update metadata timestamp', async () => {
      graph.addNode(taskA);
      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      const beforeUpdate = graph.metadata.updated_at;

      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      taskA.setTitle('Updated');
      graph.updateNode(taskA);

      const afterUpdate = graph.metadata.updated_at;
      expect(afterUpdate).not.toBe(beforeUpdate);
    });
  });

  describe('get node', () => {
    it('should return node by ID', () => {
      graph.addNode(taskA);

      const node = graph.getNode(taskA.id);
      expect(node).toBe(taskA);
      expect(node?.id).toBe(taskA.id);
    });

    it('should return undefined for non-existent node', () => {
      const node = graph.getNode('non-existent-id');
      expect(node).toBeUndefined();
    });

    it('should throw getNodeOrThrow for non-existent node', () => {
      expect(() => {
        graph.getNodeOrThrow('non-existent-id');
      }).toThrow(TaskNotFoundError);
    });

    it('should return node with getNodeOrThrow', () => {
      graph.addNode(taskA);

      const node = graph.getNodeOrThrow(taskA.id);
      expect(node).toBe(taskA);
    });
  });

  describe('has node', () => {
    it('should return true for existing node', () => {
      graph.addNode(taskA);

      expect(graph.hasNode(taskA.id)).toBe(true);
    });

    it('should return false for non-existent node', () => {
      expect(graph.hasNode('non-existent-id')).toBe(false);
    });
  });

  describe('get all tasks', () => {
    it('should return empty array for empty graph', () => {
      expect(graph.getAllTasks()).toEqual([]);
      expect(graph.getAllTaskIds()).toEqual([]);
    });

    it('should return all task IDs', () => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);

      const ids = graph.getAllTaskIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain(taskA.id);
      expect(ids).toContain(taskB.id);
      expect(ids).toContain(taskC.id);
    });

    it('should return all task nodes', () => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);

      const tasks = graph.getAllTasks();
      expect(tasks).toHaveLength(3);
      expect(tasks).toContain(taskA);
      expect(tasks).toContain(taskB);
      expect(tasks).toContain(taskC);
    });
  });

  describe('add edge', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
    });

    it('should add edge between nodes', () => {
      graph.addEdge(taskA.id, taskB.id);

      expect(graph.hasEdge(taskA.id, taskB.id)).toBe(true);
      expect(graph.getOutgoingEdges(taskA.id)).toEqual([taskB.id]);
      expect(graph.getIncomingEdges(taskB.id)).toEqual([taskA.id]);
    });

    it('should update node edges list', () => {
      graph.addEdge(taskA.id, taskB.id);

      expect(taskA.edges).toContain(taskB.id);
    });

    it('should throw TaskNotFoundError if source node does not exist', () => {
      expect(() => {
        graph.addEdge('non-existent-id', taskB.id);
      }).toThrow(TaskNotFoundError);
    });

    it('should throw TaskNotFoundError if target node does not exist', () => {
      expect(() => {
        graph.addEdge(taskA.id, 'non-existent-id');
      }).toThrow(TaskNotFoundError);
    });

    it('should throw ValidationError if edge already exists', () => {
      graph.addEdge(taskA.id, taskB.id);

      expect(() => {
        graph.addEdge(taskA.id, taskB.id);
      }).toThrow(ValidationError);
      expect(() => {
        graph.addEdge(taskA.id, taskB.id);
      }).toThrow('already exists');
    });

    it('should allow multiple edges from same source', () => {
      graph.addEdge(taskA.id, taskB.id);
      graph.addEdge(taskA.id, taskC.id);

      expect(graph.getOutgoingEdges(taskA.id)).toHaveLength(2);
      expect(graph.getOutgoingEdges(taskA.id)).toContain(taskB.id);
      expect(graph.getOutgoingEdges(taskA.id)).toContain(taskC.id);
    });

    it('should allow multiple edges to same target', () => {
      graph.addEdge(taskA.id, taskC.id);
      graph.addEdge(taskB.id, taskC.id);

      expect(graph.getIncomingEdges(taskC.id)).toHaveLength(2);
      expect(graph.getIncomingEdges(taskC.id)).toContain(taskA.id);
      expect(graph.getIncomingEdges(taskC.id)).toContain(taskB.id);
    });

    it('should update metadata timestamp', async () => {
      const beforeUpdate = graph.metadata.updated_at;

      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      graph.addEdge(taskA.id, taskB.id);
      const afterUpdate = graph.metadata.updated_at;

      expect(afterUpdate).not.toBe(beforeUpdate);
    });
  });

  describe('remove edge', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addEdge(taskA.id, taskB.id);
      graph.addEdge(taskA.id, taskC.id);
    });

    it('should remove edge between nodes', () => {
      graph.removeEdge(taskA.id, taskB.id);

      expect(graph.hasEdge(taskA.id, taskB.id)).toBe(false);
      expect(graph.getOutgoingEdges(taskA.id)).toEqual([taskC.id]);
      expect(graph.getIncomingEdges(taskB.id)).toEqual([]);
    });

    it('should update node edges list', () => {
      graph.removeEdge(taskA.id, taskB.id);

      expect(taskA.edges).not.toContain(taskB.id);
      expect(taskA.edges).toContain(taskC.id);
    });

    it('should throw TaskNotFoundError if source node does not exist', () => {
      expect(() => {
        graph.removeEdge('non-existent-id', taskB.id);
      }).toThrow(TaskNotFoundError);
    });

    it('should throw TaskNotFoundError if target node does not exist', () => {
      expect(() => {
        graph.removeEdge(taskA.id, 'non-existent-id');
      }).toThrow(TaskNotFoundError);
    });

    it('should throw ValidationError if edge does not exist', () => {
      expect(() => {
        graph.removeEdge(taskB.id, taskC.id);
      }).toThrow(ValidationError);
      expect(() => {
        graph.removeEdge(taskB.id, taskC.id);
      }).toThrow('does not exist');
    });

    it('should update metadata timestamp', async () => {
      const beforeUpdate = graph.metadata.updated_at;

      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      graph.removeEdge(taskA.id, taskB.id);
      const afterUpdate = graph.metadata.updated_at;

      expect(afterUpdate).not.toBe(beforeUpdate);
    });
  });

  describe('has edge', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
    });

    it('should return true for existing edge', () => {
      graph.addEdge(taskA.id, taskB.id);

      expect(graph.hasEdge(taskA.id, taskB.id)).toBe(true);
    });

    it('should return false for non-existing edge', () => {
      expect(graph.hasEdge(taskA.id, taskB.id)).toBe(false);
      expect(graph.hasEdge(taskB.id, taskA.id)).toBe(false);
      expect(graph.hasEdge('non-existent', taskB.id)).toBe(false);
    });

    it('should return false for non-existent nodes', () => {
      expect(graph.hasEdge('non-existent-1', 'non-existent-2')).toBe(false);
    });
  });

  describe('get outgoing edges', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
    });

    it('should return empty array for node with no outgoing edges', () => {
      expect(graph.getOutgoingEdges(taskA.id)).toEqual([]);
    });

    it('should return outgoing edges', () => {
      graph.addEdge(taskA.id, taskB.id);
      graph.addEdge(taskA.id, taskC.id);

      const edges = graph.getOutgoingEdges(taskA.id);
      expect(edges).toHaveLength(2);
      expect(edges).toContain(taskB.id);
      expect(edges).toContain(taskC.id);
    });

    it('should return empty array for non-existent node', () => {
      expect(graph.getOutgoingEdges('non-existent-id')).toEqual([]);
    });
  });

  describe('get incoming edges', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
    });

    it('should return empty array for node with no incoming edges', () => {
      expect(graph.getIncomingEdges(taskA.id)).toEqual([]);
    });

    it('should return incoming edges', () => {
      graph.addEdge(taskA.id, taskC.id);
      graph.addEdge(taskB.id, taskC.id);

      const edges = graph.getIncomingEdges(taskC.id);
      expect(edges).toHaveLength(2);
      expect(edges).toContain(taskA.id);
      expect(edges).toContain(taskB.id);
    });

    it('should return empty array for non-existent node', () => {
      expect(graph.getIncomingEdges('non-existent-id')).toEqual([]);
    });
  });

  describe('root tasks', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
    });

    it('should return all nodes as roots when no edges', () => {
      const roots = graph.getRootTasks();

      expect(roots).toHaveLength(3);
      expect(roots).toContain(taskA.id);
      expect(roots).toContain(taskB.id);
      expect(roots).toContain(taskC.id);
    });

    it('should return nodes with no incoming edges', () => {
      graph.addEdge(taskA.id, taskC.id);
      graph.addEdge(taskB.id, taskC.id);

      const roots = graph.getRootTasks();

      expect(roots).toHaveLength(2);
      expect(roots).toContain(taskA.id);
      expect(roots).toContain(taskB.id);
      expect(roots).not.toContain(taskC.id);
    });

    it('should return empty array when graph is empty', () => {
      const emptyGraph = new TaskGraphStore();
      expect(emptyGraph.getRootTasks()).toEqual([]);
    });
  });

  describe('orphan tasks', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
    });

    it('should return all nodes as orphans when no edges', () => {
      const orphans = graph.getOrphanTasks();

      expect(orphans).toHaveLength(3);
      expect(orphans).toContain(taskA.id);
      expect(orphans).toContain(taskB.id);
      expect(orphans).toContain(taskC.id);
    });

    it('should return nodes with no edges (neither incoming nor outgoing)', () => {
      graph.addEdge(taskA.id, taskB.id);
      // taskC has no edges

      const orphans = graph.getOrphanTasks();

      expect(orphans).toHaveLength(1);
      expect(orphans).toContain(taskC.id);
      expect(orphans).not.toContain(taskA.id);
      expect(orphans).not.toContain(taskB.id);
    });

    it('should return empty array when all nodes have edges', () => {
      graph.addEdge(taskA.id, taskB.id);
      graph.addEdge(taskB.id, taskC.id);

      const orphans = graph.getOrphanTasks();
      expect(orphans).toHaveLength(0);
    });
  });

  describe('leaf tasks', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
    });

    it('should return all nodes as leaves when no edges', () => {
      const leaves = graph.getLeafTasks();

      expect(leaves).toHaveLength(3);
      expect(leaves).toContain(taskA.id);
      expect(leaves).toContain(taskB.id);
      expect(leaves).toContain(taskC.id);
    });

    it('should return nodes with no outgoing edges', () => {
      graph.addEdge(taskA.id, taskC.id);
      graph.addEdge(taskB.id, taskC.id);

      const leaves = graph.getLeafTasks();

      expect(leaves).toHaveLength(1);
      expect(leaves).toContain(taskC.id);
      expect(leaves).not.toContain(taskA.id);
      expect(leaves).not.toContain(taskB.id);
    });

    it('should return empty array when graph is empty', () => {
      const emptyGraph = new TaskGraphStore();
      expect(emptyGraph.getLeafTasks()).toEqual([]);
    });
  });

  describe('metadata', () => {
    it('should get metadata', () => {
      const metadata = graph.metadata;

      expect(metadata.project_name).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.created_at).toBeDefined();
      expect(metadata.updated_at).toBeDefined();
    });

    it('should set metadata', () => {
      graph.setMetadata({
        project_name: 'Updated Project',
        version: '2.0.0',
      });

      expect(graph.metadata.project_name).toBe('Updated Project');
      expect(graph.metadata.version).toBe('2.0.0');
    });

    it('should auto-update updated_at on metadata change', async () => {
      const beforeUpdate = graph.metadata.updated_at;

      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      graph.setMetadata({ project_name: 'Updated' });

      expect(graph.metadata.updated_at).not.toBe(beforeUpdate);
    });

    it('should not mutate original metadata object', () => {
      const originalMetadata = graph.metadata;
      const originalName = originalMetadata.project_name;

      graph.setMetadata({ project_name: 'Changed' });

      expect(originalMetadata.project_name).toBe(originalName);
    });
  });

  describe('clear', () => {
    it('should clear all nodes and edges', () => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addEdge(taskA.id, taskB.id);

      graph.clear();

      expect(graph.size).toBe(0);
      expect(graph.getAllTaskIds()).toEqual([]);
      expect(graph.getOutgoingEdges(taskA.id)).toEqual([]);
      expect(graph.getIncomingEdges(taskB.id)).toEqual([]);
    });

    it('should keep metadata', () => {
      graph.addNode(taskA);
      const projectName = graph.metadata.project_name;

      graph.clear();

      expect(graph.metadata.project_name).toBe(projectName);
    });

    it('should update metadata timestamp', async () => {
      graph.addNode(taskA);
      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      const beforeUpdate = graph.metadata.updated_at;

      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      graph.clear();
      const afterUpdate = graph.metadata.updated_at;

      expect(afterUpdate).not.toBe(beforeUpdate);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addNode(taskC);
      graph.addEdge(taskA.id, taskB.id);
      graph.addEdge(taskB.id, taskC.id);
    });

    it('should serialize to JSON', () => {
      const json = graph.toJSON();

      expect(json.nodes).toBeDefined();
      expect(json.nodes[taskA.id]).toBeDefined();
      expect(json.outgoingEdges).toBeDefined();
      expect(json.outgoingEdges[taskA.id]).toContain(taskB.id);
      expect(json.incomingEdges).toBeDefined();
      expect(json.incomingEdges[taskB.id]).toContain(taskA.id);
      expect(json.metadata).toBeDefined();
    });

    it('should deserialize from JSON', () => {
      const json = graph.toJSON();
      const restored = TaskGraphStore.fromJSON(json);

      expect(restored.size).toBe(3);
      expect(restored.hasNode(taskA.id)).toBe(true);
      expect(restored.hasNode(taskB.id)).toBe(true);
      expect(restored.hasNode(taskC.id)).toBe(true);
      expect(restored.hasEdge(taskA.id, taskB.id)).toBe(true);
      expect(restored.hasEdge(taskB.id, taskC.id)).toBe(true);
    });

    it('should preserve metadata during serialization', () => {
      graph.setMetadata({ project_name: 'Test Project' });
      const json = graph.toJSON();
      const restored = TaskGraphStore.fromJSON(json);

      expect(restored.metadata.project_name).toBe('Test Project');
    });

    it('should convert to interface', () => {
      const graphInterface = graph.toInterface();

      expect(graphInterface.nodes.size).toBe(3);
      expect(graphInterface.nodes.get(taskA.id)).toBeDefined();
      expect(graphInterface.outgoingEdges.size).toBe(3);
      expect(graphInterface.incomingEdges.size).toBe(3);
      expect(graphInterface.metadata).toBeDefined();
    });

    it('should create from interface', () => {
      const graphInterface = graph.toInterface();
      const restored = TaskGraphStore.fromInterface(graphInterface);

      expect(restored.size).toBe(3);
      expect(restored.hasNode(taskA.id)).toBe(true);
      expect(restored.hasEdge(taskA.id, taskB.id)).toBe(true);
    });
  });

  describe('O(1) verification', () => {
    it('should perform O(1) node lookup', () => {
      // Add many nodes
      const tasks: TaskNode[] = [];
      for (let i = 0; i < 1000; i++) {
        const task = new TaskNode({
          title: `Implement task module ${i} with functionality`,
          description: 'Task description for testing O(1) lookup performance. This is a test task with sufficient description length for validation purposes.',
          success_criteria: [
            { id: uuidv4(), text: 'Module returns 200 status', completed: false },
          ],
          deliverables: [
            { id: uuidv4(), text: `src/task${i}.ts`, completed: false },
          ],
        });
        tasks.push(task);
        graph.addNode(task);
      }

      // Time lookups (should be very fast even with 1000 nodes)
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        graph.getNode(tasks[i].id);
      }
      const end = Date.now();

      // Should complete in less than 100ms even with 1000 lookups
      expect(end - start).toBeLessThan(100);
    });

    it('should perform O(1) edge existence check', () => {
      graph.addNode(taskA);
      graph.addNode(taskB);
      graph.addEdge(taskA.id, taskB.id);

      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        graph.hasEdge(taskA.id, taskB.id);
      }
      const end = Date.now();

      // Should complete in less than 100ms even with 10000 checks
      expect(end - start).toBeLessThan(100);
    });
  });
});
