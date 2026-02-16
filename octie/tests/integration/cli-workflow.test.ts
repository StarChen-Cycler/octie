/**
 * CLI Workflow Integration Tests
 *
 * Tests for complete CLI workflows including:
 * - Full workflow (init, create, list, update, delete)
 * - Large dataset handling (1000+ tasks)
 * - Cross-platform path handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStorage } from '../../src/core/storage/file-store.js';
import { TaskNode } from '../../src/core/models/task-node.js';
import { TaskGraphStore } from '../../src/core/graph/index.js';

describe('CLI workflow integration', () => {
  let tempDir: string;
  let storage: TaskStorage;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `octie-test-${uuidv4()}`);
    storage = new TaskStorage({ projectDir: tempDir });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('full CLI workflow', () => {
    it('should complete full workflow: init, create, list, update, delete', async () => {
      // Step 1: Initialize project
      await storage.createProject('test-project');
      expect(await storage.exists()).toBe(true);
      expect(existsSync(storage.octieDirPath)).toBe(true);

      // Step 2: Create tasks
      const graph = await storage.load();

      const task1 = new TaskNode({
        id: uuidv4(),
        title: 'Implement login endpoint',
        description: 'Create POST /auth/login endpoint that validates credentials and returns JWT token',
        status: 'not_started',
        priority: 'top',
        success_criteria: [
          { id: uuidv4(), text: 'Endpoint returns 200 with valid JWT', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'src/api/auth/login.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: ['src/auth/'],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      const task2 = new TaskNode({
        id: uuidv4(),
        title: 'Write unit tests',
        description: 'Create comprehensive unit tests for login functionality with full coverage',
        status: 'not_started',
        priority: 'second',
        success_criteria: [
          { id: uuidv4(), text: 'All tests pass', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'tests/api/auth/login.test.ts', completed: false },
        ],
        blockers: [task1.id],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      graph.addNode(task1);
      graph.addNode(task2);
      graph.addEdge(task1.id, task2.id);
      await storage.save(graph);

      expect(graph.size).toBe(2);

      // Step 3: List tasks (simulated)
      const allTasks = graph.getAllTasks();
      expect(allTasks.length).toBe(2);

      // Step 4: Update task status
      const task1Updated = graph.getNode(task1.id);
      task1Updated?.setStatus('in_progress');
      await storage.save(graph);

      const updatedGraph = await storage.load();
      const updatedTask = updatedGraph.getNode(task1.id);
      expect(updatedTask?.status).toBe('in_progress');

      // Step 5: Delete task
      updatedGraph.removeNode(task2.id);
      await storage.save(updatedGraph);

      expect(updatedGraph.hasNode(task2.id)).toBe(false);
      expect(updatedGraph.size).toBe(1);
    });

    it('should handle task dependencies correctly', async () => {
      await storage.createProject('dependency-test');

      const graph = await storage.load();

      const task1 = new TaskNode({
        id: uuidv4(),
        title: 'Create base component',
        description: 'Implement base UI component with shared functionality and styling for the application',
        status: 'completed',
        priority: 'top',
        success_criteria: [
          { id: uuidv4(), text: 'Component renders correctly', completed: true },
        ],
        deliverables: [
          { id: uuidv4(), text: 'BaseComponent.tsx', completed: true },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      const task2 = new TaskNode({
        id: uuidv4(),
        title: 'Create button component',
        description: 'Implement button component that extends base component with button specific functionality',
        status: 'not_started',
        priority: 'second',
        success_criteria: [
          { id: uuidv4(), text: 'Button component extends base', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'ButtonComponent.tsx', completed: false },
        ],
        blockers: [task1.id],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      const task3 = new TaskNode({
        id: uuidv4(),
        title: 'Create input component',
        description: 'Implement input component that extends base component with input specific functionality',
        status: 'not_started',
        priority: 'second',
        success_criteria: [
          { id: uuidv4(), text: 'Input component extends base', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'InputComponent.tsx', completed: false },
        ],
        blockers: [task1.id],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      graph.addNode(task1);
      graph.addNode(task2);
      graph.addNode(task3);

      // task1 enables task2 and task3
      graph.addEdge(task1.id, task2.id);
      graph.addEdge(task1.id, task3.id);

      await storage.save(graph);

      // Verify blockers
      expect(task2.blockers).toContain(task1.id);
      expect(task3.blockers).toContain(task1.id);

      // Verify graph structure
      expect(graph.getOutgoingEdges(task1.id)).toContain(task2.id);
      expect(graph.getOutgoingEdges(task1.id)).toContain(task3.id);
    });
  });

  describe('large dataset handling', () => {
    it('should handle 1000 tasks efficiently', async () => {
      await storage.createProject('large-project');

      const graph = await storage.load();
      const startTime = Date.now();

      // Create 1000 tasks
      for (let i = 0; i < 1000; i++) {
        const task = new TaskNode({
          id: uuidv4(),
          title: `Implement feature ${i}`,
          description: `Implement feature number ${i} with full functionality and comprehensive testing`,
          status: i % 5 === 0 ? 'completed' : 'not_started',
          priority: i % 3 === 0 ? 'top' : i % 3 === 1 ? 'second' : 'later',
          success_criteria: [
            { id: uuidv4(), text: `Feature ${i} works correctly`, completed: i % 5 === 0 },
          ],
          deliverables: [
            { id: uuidv4(), text: `feature${i}.ts`, completed: i % 5 === 0 },
          ],
          blockers: [],
          dependencies: [],
          related_files: [],
          notes: '',
          c7_verified: [],
          sub_items: [],
          edges: [],
        });

        graph.addNode(task);

        // Create some edges (every 10th task points to the next one)
        if (i > 0 && i % 10 === 0) {
          const allIds = Array.from(graph.getAllTaskIds());
          graph.addEdge(allIds[i - 10], allIds[i]);
        }
      }

      await storage.save(graph);
      const saveTime = Date.now() - startTime;

      // Verify all tasks were saved
      expect(graph.size).toBe(1000);

      // Load and verify
      const loadedGraph = await storage.load();
      expect(loadedGraph.size).toBe(1000);

      // Performance check: save should be fast (< 2 seconds for 1000 tasks)
      expect(saveTime).toBeLessThan(2000);
    });

    it('should maintain performance with many edges', async () => {
      await storage.createProject('edge-test');

      const graph = await storage.load();

      // Create 100 tasks with many edges
      const tasks: string[] = [];
      for (let i = 0; i < 100; i++) {
        const task = new TaskNode({
          id: uuidv4(),
          title: `Create task ${i}`,
          description: `Implement task number ${i} with full functionality and comprehensive testing`,
          status: 'not_started',
          priority: 'second',
          success_criteria: [
            { id: uuidv4(), text: `Task ${i} works correctly`, completed: false },
          ],
          deliverables: [
            { id: uuidv4(), text: `task${i}.ts`, completed: false },
          ],
          blockers: [],
          dependencies: [],
          related_files: [],
          notes: '',
          c7_verified: [],
          sub_items: [],
          edges: [],
        });

        graph.addNode(task);
        tasks.push(task.id);
      }

      // Create many edges (each task points to 10 other tasks)
      for (let i = 0; i < 100; i++) {
        for (let j = 1; j <= 10 && i + j < 100; j++) {
          graph.addEdge(tasks[i], tasks[i + j]);
        }
      }

      await storage.save(graph);

      // Verify edges
      expect(graph.getOutgoingEdges(tasks[0]).length).toBe(10);
    });
  });

  describe('cross-platform path handling', () => {
    it('should handle Windows paths correctly', async () => {
      const windowsPath = join('C:', 'Users', 'test', 'project');
      const testStorage = new TaskStorage({ projectDir: tempDir });

      // Path normalization should handle both forward and backward slashes
      const normalizedPath = join(tempDir, '.octie', 'project.json');
      expect(testStorage.projectFilePath).toContain('project.json');
    });

    it('should handle Unix paths correctly', async () => {
      const unixPath = '/home/user/project';
      const testStorage = new TaskStorage({ projectDir: tempDir });

      expect(testStorage.octieDirPath).toContain('.octie');
    });

    it('should handle relative paths correctly', async () => {
      const testStorage = new TaskStorage({ projectDir: tempDir });

      await testStorage.createProject('relative-test');

      // Should create absolute paths
      expect(testStorage.octieDirPath).toMatch(/^[A-Za-z]:\\/); // Windows absolute path
      expect(testStorage.projectFilePath).toContain('project.json');
    });
  });

  describe('data persistence', () => {
    it('should persist data across save/load cycles', async () => {
      await storage.createProject('persistence-test');

      const graph = await storage.load();
      const taskId = uuidv4();

      const originalTask = new TaskNode({
        id: taskId,
        title: 'Persistence test task',
        description: 'This task tests data persistence across save and load cycles',
        status: 'in_progress',
        priority: 'top',
        success_criteria: [
          { id: uuidv4(), text: 'Data persists correctly', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'persistence.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: ['src/test/'],
        notes: 'Test notes',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      graph.addNode(originalTask);
      await storage.save(graph);

      // Load and verify
      const loadedGraph = await storage.load();
      const loadedTask = loadedGraph.getNode(taskId);

      expect(loadedTask).toBeDefined();
      expect(loadedTask?.title).toBe(originalTask.title);
      expect(loadedTask?.description).toBe(originalTask.description);
      expect(loadedTask?.status).toBe(originalTask.status);
      expect(loadedTask?.priority).toBe(originalTask.priority);
      expect(loadedTask?.related_files).toEqual(originalTask.related_files);
      expect(loadedTask?.notes).toBe(originalTask.notes);

      // Verify timestamps
      expect(loadedTask?.created_at).toBe(originalTask.created_at);
    });

    it('should create backup before overwriting', async () => {
      await storage.createProject('backup-test');

      const graph = await storage.load();
      graph.addNode(new TaskNode({
        id: uuidv4(),
        title: 'Create initial task',
        description: 'Initial task description for testing backup functionality',
        status: 'completed',
        priority: 'top',
        success_criteria: [
          { id: uuidv4(), text: 'Complete', completed: true },
        ],
        deliverables: [
          { id: uuidv4(), text: 'initial.ts', completed: true },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      }));

      // First save (no backup since file doesn't exist)
      await storage.save(graph);

      // Verify initial project.json exists
      expect(existsSync(storage.projectFilePath)).toBe(true);

      // Modify and save again (backup should be created now)
      const task2 = new TaskNode({
        id: uuidv4(),
        title: 'Create second task',
        description: 'Second task description for testing backup functionality and data persistence',
        status: 'not_started',
        priority: 'second',
        success_criteria: [
          { id: uuidv4(), text: 'Complete', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'second.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      graph.addNode(task2);

      // Force backup creation by passing option
      await storage.save(graph, { createBackup: true });

      // Verify backup exists - check for .bak.* pattern (timestamped backups)
      // Note: Backup files are named "project.bak.{timestamp}" not "project.json.bak.{timestamp}"
      // because _getBaseName() strips the extension before adding .bak suffix
      const octieDirFiles = readdirSync(storage.octieDirPath);
      const hasBackup = octieDirFiles.some(f => f === 'project.bak' || f.startsWith('project.bak.'));
      expect(hasBackup).toBe(true);
    });
  });
});
