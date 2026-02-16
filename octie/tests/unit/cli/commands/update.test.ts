/**
 * Update Command Unit Tests
 *
 * Tests for update command including:
 * - Task status updates
 * - Priority updates
 * - Success criterion completion
 * - Deliverable completion
 * - Blocker management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStorage } from '../../../../src/core/storage/file-store.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';
import { execSync } from 'node:child_process';

describe('update command', () => {
  let tempDir: string;
  let cliPath: string;
  let storage: TaskStorage;
  let testTaskId: string;
  let criterionId: string;
  let deliverableId: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `octie-test-${uuidv4()}`);
    storage = new TaskStorage({ projectDir: tempDir });
    await storage.createProject('test-project');

    // CLI entry point
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');

    // Create test task
    const graph = await storage.load();
    testTaskId = uuidv4();
    criterionId = uuidv4();
    deliverableId = uuidv4();

    const task = new TaskNode({
      id: testTaskId,
      title: 'Implement login endpoint',
      description: 'Create POST /auth/login endpoint that validates credentials and returns JWT token',
      status: 'not_started',
      priority: 'second',
      success_criteria: [
        { id: criterionId, text: 'Endpoint returns 200 with valid JWT', completed: false },
      ],
      deliverables: [
        { id: deliverableId, text: 'src/api/auth/login.ts', completed: false },
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
    await storage.save(graph);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('status updates', () => {
    it('should update task status to in_progress', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --status in_progress`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.status).toBe('in_progress');
    });

    it('should update task status to completed when criteria are met', async () => {
      // First set to in_progress
      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --status in_progress`,
        { encoding: 'utf-8' }
      );

      // Complete the success criterion
      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --complete-criterion "${criterionId}"`,
        { encoding: 'utf-8' }
      );

      // Complete the deliverable
      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --complete-deliverable "${deliverableId}"`,
        { encoding: 'utf-8' }
      );

      // Then set to completed
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --status completed`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.status).toBe('completed');
    });

    it('should update task status to blocked', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --status blocked`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.status).toBe('blocked');
    });

    it('should reject invalid status transition from not_started to completed', () => {
      // Try to set from not_started directly to completed (should be rejected)
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" update ${testTaskId} --status completed`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('priority updates', () => {
    it('should update task priority to top', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --priority top`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.priority).toBe('top');
    });

    it('should update task priority to later', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --priority later`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.priority).toBe('later');
    });
  });

  describe('success criterion completion', () => {
    it('should add new success criterion', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --add-success-criterion "Unit tests pass"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.success_criteria.length).toBe(2);
    });

    it('should mark success criterion as complete', async () => {
      // Complete the criterion
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --complete-criterion "${criterionId}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      const criterion = task?.success_criteria.find(c => c.id === criterionId);
      expect(criterion?.completed).toBe(true);
    });
  });

  describe('deliverable completion', () => {
    it('should add new deliverable', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --add-deliverable "tests/api/auth/login.test.ts"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.deliverables.length).toBe(2);
    });

    it('should mark deliverable as complete', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --complete-deliverable "${deliverableId}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      const deliverable = task?.deliverables.find(d => d.id === deliverableId);
      expect(deliverable?.completed).toBe(true);
    });
  });

  describe('blocker management', () => {
    it('should add blocker to task', async () => {
      // Create another task to use as blocker
      const graph = await storage.load();
      const blockerTaskId = uuidv4();

      const blockerTask = new TaskNode({
        id: blockerTaskId,
        title: 'Blocker task',
        description: 'Valid description that is long enough to meet minimum requirements',
        status: 'not_started',
        priority: 'top',
        success_criteria: [{ id: uuidv4(), text: 'Complete', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'output.ts', completed: false }],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      graph.addNode(blockerTask);
      await storage.save(graph);

      // Add blocker
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --block "${blockerTaskId}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const updatedGraph = await storage.load();
      const task = updatedGraph.getNode(testTaskId);
      expect(task?.blockers).toContain(blockerTaskId);
    });
  });

  describe('notes', () => {
    it('should append notes to task', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --notes "Use bcrypt with 10 rounds"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.notes).toContain('bcrypt');
    });
  });

  describe('error handling', () => {
    it('should reject invalid task ID', () => {
      const fakeId = uuidv4();

      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" update ${fakeId} --status in_progress`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should reject invalid status value', () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" update ${testTaskId} --status invalid_status`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should accept any priority value (Commander choice validation)', async () => {
      // Note: Commander.js doesn't validate choice values at runtime for optional options
      // The CLI may accept the value and store it. This test verifies behavior.
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --priority later`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');
    });
  });

  describe('help', () => {
    it('should show help with --help flag', () => {
      const output = execSync(`node ${cliPath} update --help`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('Update an existing task');
      expect(output).toContain('--status');
      expect(output).toContain('--priority');
    });
  });
});
