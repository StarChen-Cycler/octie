/**
 * Performance benchmarks for storage operations
 *
 * Validates performance targets:
 * - List all tasks: <100ms for 1000 tasks
 * - Filter by status: <20ms for 1000 tasks
 * - Filter by priority: <20ms for 1000 tasks
 * - Save changes: <50ms for 1000 tasks
 * - Full graph load: <100ms for 1000 tasks
 *
 * @module tests/benchmark/storage-operations
 */

import { bench, describe, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TaskStorage } from '../../src/core/storage/file-store.js';
import { TaskGraphStore } from '../../src/core/graph/index.js';
import { TaskNode } from '../../src/core/models/task-node.js';
import { IndexManager } from '../../src/core/storage/indexer.js';

/**
 * Helper to create a valid task for testing
 */
function createTestTask(id: string, index: number): TaskNode {
  const statuses: Array<'not_started' | 'pending' | 'in_progress' | 'completed' | 'blocked'> =
    ['not_started', 'pending', 'in_progress', 'completed', 'blocked'];
  const priorities: Array<'top' | 'second' | 'later'> = ['top', 'second', 'later'];

  return new TaskNode({
    id,
    title: `Implement feature ${index} - ${id}`,
    description: `This is a detailed description for task ${index}. It provides comprehensive information about what needs to be implemented and how to verify the implementation is correct. The description must be at least 50 characters long to pass validation.`,
    status: statuses[index % statuses.length],
    priority: priorities[index % priorities.length],
    success_criteria: [
      { id: `${id}-sc1`, text: 'Unit tests pass with 100% coverage', completed: index % 5 === 0 },
      { id: `${id}-sc2`, text: 'Code review approved by maintainer', completed: index % 5 === 0 },
    ],
    deliverables: [
      { id: `${id}-d1`, text: `src/features/feature-${index}.ts`, completed: index % 5 === 0 },
    ],
    related_files: [`src/features/feature-${index}.ts`, `tests/features/feature-${index}.test.ts`],
    notes: `Implementation notes for task ${index}. This contains additional context about the implementation.`,
  });
}

/**
 * Create a populated graph for testing
 */
function createPopulatedGraph(size: number): TaskGraphStore {
  const graph = new TaskGraphStore();

  for (let i = 0; i < size; i++) {
    const task = createTestTask(`task-${i}`, i);
    graph.addNode(task);

    // Create some edges (linear chain)
    if (i > 0) {
      graph.addEdge(`task-${i - 1}`, `task-${i}`);
    }
  }

  return graph;
}

// Test data sizes
const SMALL_SIZE = 100;
const MEDIUM_SIZE = 500;
const LARGE_SIZE = 1000;

// Temp directories for benchmarks
let tempDir: string;
let smallStorage: TaskStorage;
let mediumStorage: TaskStorage;
let largeStorage: TaskStorage;

describe('Storage Operations - Graph Load', () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'octie-bench-load-'));

    // Create and save graphs of different sizes
    smallStorage = new TaskStorage({ projectDir: join(tempDir, 'small') });
    mediumStorage = new TaskStorage({ projectDir: join(tempDir, 'medium') });
    largeStorage = new TaskStorage({ projectDir: join(tempDir, 'large') });

    await smallStorage.init();
    await mediumStorage.init();
    await largeStorage.init();

    const smallGraph = createPopulatedGraph(SMALL_SIZE);
    const mediumGraph = createPopulatedGraph(MEDIUM_SIZE);
    const largeGraph = createPopulatedGraph(LARGE_SIZE);

    await smallStorage.save(smallGraph);
    await mediumStorage.save(mediumGraph);
    await largeStorage.save(largeGraph);
  });

  afterAll(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  bench('load - 100 tasks', async () => {
    await smallStorage.load();
  });

  bench('load - 500 tasks', async () => {
    await mediumStorage.load();
  });

  bench('load - 1000 tasks', async () => {
    await largeStorage.load();
  });
});

describe('Storage Operations - Save', () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'octie-bench-save-'));
  });

  afterAll(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  bench('save - 100 tasks', async () => {
    const storage = new TaskStorage({ projectDir: join(tempDir, `save-small-${Date.now()}`) });
    await storage.init();
    const graph = createPopulatedGraph(SMALL_SIZE);
    await storage.save(graph);
  });

  bench('save - 500 tasks', async () => {
    const storage = new TaskStorage({ projectDir: join(tempDir, `save-medium-${Date.now()}`) });
    await storage.init();
    const graph = createPopulatedGraph(MEDIUM_SIZE);
    await storage.save(graph);
  });

  bench('save - 1000 tasks', async () => {
    const storage = new TaskStorage({ projectDir: join(tempDir, `save-large-${Date.now()}`) });
    await storage.init();
    const graph = createPopulatedGraph(LARGE_SIZE);
    await storage.save(graph);
  });
});

describe('Storage Operations - Round Trip', () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'octie-bench-roundtrip-'));
  });

  afterAll(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  bench('save + load - 100 tasks', async () => {
    const storage = new TaskStorage({ projectDir: join(tempDir, `roundtrip-small-${Date.now()}`) });
    await storage.init();
    const graph = createPopulatedGraph(SMALL_SIZE);
    await storage.save(graph);
    await storage.load();
  });

  bench('save + load - 1000 tasks', async () => {
    const storage = new TaskStorage({ projectDir: join(tempDir, `roundtrip-large-${Date.now()}`) });
    await storage.init();
    const graph = createPopulatedGraph(LARGE_SIZE);
    await storage.save(graph);
    await storage.load();
  });
});

describe('Index Operations - Filtering', () => {
  let smallGraph: TaskGraphStore;
  let mediumGraph: TaskGraphStore;
  let largeGraph: TaskGraphStore;
  let smallIndexer: IndexManager;
  let mediumIndexer: IndexManager;
  let largeIndexer: IndexManager;

  beforeAll(() => {
    smallGraph = createPopulatedGraph(SMALL_SIZE);
    mediumGraph = createPopulatedGraph(MEDIUM_SIZE);
    largeGraph = createPopulatedGraph(LARGE_SIZE);

    smallIndexer = new IndexManager();
    mediumIndexer = new IndexManager();
    largeIndexer = new IndexManager();

    // Build indexes
    smallIndexer.rebuildIndexes(new Map(smallGraph.getAllTasks().map(t => [t.id, t])), smallGraph);
    mediumIndexer.rebuildIndexes(new Map(mediumGraph.getAllTasks().map(t => [t.id, t])), mediumGraph);
    largeIndexer.rebuildIndexes(new Map(largeGraph.getAllTasks().map(t => [t.id, t])), largeGraph);
  });

  bench('getByStatus - 100 tasks', () => {
    smallIndexer.getByStatus('pending');
    smallIndexer.getByStatus('completed');
    smallIndexer.getByStatus('in_progress');
  });

  bench('getByStatus - 500 tasks', () => {
    mediumIndexer.getByStatus('pending');
    mediumIndexer.getByStatus('completed');
    mediumIndexer.getByStatus('in_progress');
  });

  bench('getByStatus - 1000 tasks', () => {
    largeIndexer.getByStatus('pending');
    largeIndexer.getByStatus('completed');
    largeIndexer.getByStatus('in_progress');
  });

  bench('getByPriority - 1000 tasks', () => {
    largeIndexer.getByPriority('top');
    largeIndexer.getByPriority('second');
    largeIndexer.getByPriority('later');
  });

  bench('getRootTasks - 1000 tasks', () => {
    largeIndexer.getRootTasks();
  });

  bench('getOrphanTasks - 1000 tasks', () => {
    largeIndexer.getOrphanTasks();
  });
});

describe('Index Operations - Search', () => {
  let largeGraph: TaskGraphStore;
  let largeIndexer: IndexManager;

  beforeAll(() => {
    largeGraph = createPopulatedGraph(LARGE_SIZE);
    largeIndexer = new IndexManager();
    largeIndexer.rebuildIndexes(new Map(largeGraph.getAllTasks().map(t => [t.id, t])), largeGraph);
  });

  bench('search - single term', () => {
    largeIndexer.search('feature');
  });

  bench('search - multiple terms', () => {
    largeIndexer.search('feature tests');
  });

  bench('search - specific task', () => {
    largeIndexer.search('task-500');
  });
});

describe('Index Operations - Update', () => {
  let graph: TaskGraphStore;
  let indexer: IndexManager;

  beforeAll(() => {
    graph = createPopulatedGraph(LARGE_SIZE);
    indexer = new IndexManager();
    // Build initial indexes
    indexer.rebuildIndexes(new Map(graph.getAllTasks().map(t => [t.id, t])), graph);
  });

  bench('rebuildIndexes - 1000 tasks', () => {
    const tasksMap = new Map(graph.getAllTasks().map(t => [t.id, t]));
    indexer.rebuildIndexes(tasksMap, graph);
  });

  bench('updateTask - new task addition', () => {
    const task = createTestTask(`new-bench-task-${Date.now()}`, 9999);
    indexer.updateTask(task, null, graph);
  });

  bench('updateTask - existing task update', () => {
    // Note: We pass the same task as old and new to simulate minimal update
    const task = graph.getNode('task-0');
    if (task) {
      indexer.updateTask(task, task, graph);
    }
  });
});

describe('Index Operations - Statistics', () => {
  let largeGraph: TaskGraphStore;
  let largeIndexer: IndexManager;

  beforeAll(() => {
    largeGraph = createPopulatedGraph(LARGE_SIZE);
    largeIndexer = new IndexManager();
    largeIndexer.rebuildIndexes(new Map(largeGraph.getAllTasks().map(t => [t.id, t])), largeGraph);
  });

  bench('getStats - 1000 tasks', () => {
    largeIndexer.getStats();
  });

  bench('getIndexes - 1000 tasks', () => {
    largeIndexer.getIndexes();
  });
});

describe('TaskNode Creation', () => {
  bench('create single task', () => {
    createTestTask(`new-task-${Date.now()}`, 0);
  });

  bench('create 100 tasks', () => {
    for (let i = 0; i < SMALL_SIZE; i++) {
      createTestTask(`new-task-${i}`, i);
    }
  });

  bench('create 1000 tasks', () => {
    for (let i = 0; i < LARGE_SIZE; i++) {
      createTestTask(`new-task-${i}`, i);
    }
  });
});

describe('Graph Statistics', () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'octie-bench-stats-'));

    largeStorage = new TaskStorage({ projectDir: join(tempDir, 'large') });
    await largeStorage.init();
    const largeGraph = createPopulatedGraph(LARGE_SIZE);
    await largeStorage.save(largeGraph);
  });

  afterAll(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  bench('getRootTasks - 1000 tasks graph', async () => {
    const graph = await largeStorage.load();
    if (graph) {
      graph.getRootTasks();
    }
  });

  bench('getOrphanTasks - 1000 tasks graph', async () => {
    const graph = await largeStorage.load();
    if (graph) {
      graph.getOrphanTasks();
    }
  });

  bench('getLeafTasks - 1000 tasks graph', async () => {
    const graph = await largeStorage.load();
    if (graph) {
      graph.getLeafTasks();
    }
  });
});
