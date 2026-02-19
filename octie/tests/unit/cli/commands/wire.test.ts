/**
 * Wire Command Unit Tests
 *
 * Tests for wire command including:
 * - Successful wire between connected tasks
 * - Validation errors (no edge, not a blocker, duplicate edge)
 * - Self-wire prevention
 * - Short UUID support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStorage } from '../../../../src/core/storage/file-store.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';
import { execSync } from 'node:child_process';

describe('wire command', () => {
  let tempDir: string;
  let cliPath: string;
  let storage: TaskStorage;
  let taskAId: string;
  let taskBId: string;
  let taskCId: string;
  let taskDId: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `octie-wire-test-${uuidv4()}`);
    storage = new TaskStorage({ projectDir: tempDir });
    await storage.createProject('test-project');

    // CLI entry point
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');

    // Create test tasks
    const graph = await storage.load();

    // Task A (source - no blockers)
    taskAId = uuidv4();
    const taskA = new TaskNode({
      id: taskAId,
      title: 'Implement API specification',
      description: 'Create the API specification document for the authentication endpoints with all request and response schemas.',
      status: 'ready',
      priority: 'top',
      success_criteria: [
        { id: uuidv4(), text: 'All endpoints documented with OpenAPI spec', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'docs/api/auth.yaml', completed: false },
      ],
      blockers: [],
      dependencies: '',
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    });
    graph.addNode(taskA);

    // Task C (target - blocks on A)
    taskCId = uuidv4();
    const taskC = new TaskNode({
      id: taskCId,
      title: 'Build frontend login page',
      description: 'Create the login page component with form validation and authentication state management.',
      status: 'ready',
      priority: 'top',
      success_criteria: [
        { id: uuidv4(), text: 'Login form validates email and password', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'src/pages/Login.tsx', completed: false },
      ],
      blockers: [taskAId],
      dependencies: 'Needs API spec from task A to implement correct form fields',
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    });
    graph.addNode(taskC);

    // Add edge A -> C
    graph.addEdge(taskAId, taskCId);

    // Task B (intermediate - to be wired between A and C)
    taskBId = uuidv4();
    const taskB = new TaskNode({
      id: taskBId,
      title: 'Create TypeScript data models',
      description: 'Generate TypeScript interfaces from the API specification for type-safe frontend development.',
      status: 'ready',
      priority: 'top',
      success_criteria: [
        { id: uuidv4(), text: 'All API types have corresponding TS interfaces', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'src/types/api.ts', completed: false },
      ],
      blockers: [],
      dependencies: '',
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    });
    graph.addNode(taskB);

    // Task D (unrelated - no connection to A, B, C)
    taskDId = uuidv4();
    const taskD = new TaskNode({
      id: taskDId,
      title: 'Write documentation',
      description: 'Write user documentation for the application features.',
      status: 'ready',
      priority: 'later',
      success_criteria: [
        { id: uuidv4(), text: 'All features documented', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'docs/user-guide.md', completed: false },
      ],
      blockers: [],
      dependencies: '',
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    });
    graph.addNode(taskD);

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

  describe('successful wire operation', () => {
    it('should wire task B between A and C', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskCId} --dep-on-after "Needs API spec to generate types" --dep-on-before "Frontend needs types for implementation"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Wired');
      expect(output).toContain(taskBId.substring(0, 8));
      expect(output).toContain('between');

      // Verify the graph structure
      const graph = await storage.load();

      // B should now block on A
      const taskB = graph.getNode(taskBId);
      expect(taskB?.blockers).toContain(taskAId);
      expect(taskB?.dependencies).toBe('Needs API spec to generate types');

      // C should now block on B (not A)
      const taskC = graph.getNode(taskCId);
      expect(taskC?.blockers).toContain(taskBId);
      expect(taskC?.blockers).not.toContain(taskAId);
      expect(taskC?.dependencies).toBe('Frontend needs types for implementation');

      // Edge A -> C should be replaced with A -> B -> C
      expect(graph.hasEdge(taskAId, taskCId)).toBe(false);
      expect(graph.hasEdge(taskAId, taskBId)).toBe(true);
      expect(graph.hasEdge(taskBId, taskCId)).toBe(true);
    });

    it('should support short UUIDs', async () => {
      const shortA = taskAId.substring(0, 8);
      const shortB = taskBId.substring(0, 8);
      const shortC = taskCId.substring(0, 8);

      const output = execSync(
        `node ${cliPath} --project "${tempDir}" wire ${shortB} --after ${shortA} --before ${shortC} --dep-on-after "test" --dep-on-before "test"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Wired');
    });
  });

  describe('validation errors', () => {
    it('should error when edge A->C does not exist', async () => {
      // D is not connected to A
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskDId} --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when C does not have A as blocker', async () => {
      // Create a scenario where edge exists but blocker doesn't
      // (This is a data integrity issue, but we should catch it)
      const graph = await storage.load();

      // Add an edge D -> C, but C doesn't have D in blockers
      graph.addEdge(taskDId, taskCId);
      await storage.save(graph);

      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskDId} --before ${taskCId} --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when wiring task before itself', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskBId} --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when wiring task after itself', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskBId} --before ${taskCId} --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when after and before are the same', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskAId} --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when B already blocks C', async () => {
      // First wire B between A and C
      execSync(
        `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskCId} --dep-on-after "test" --dep-on-before "test"`,
        { encoding: 'utf-8' }
      );

      // Create a new task E that blocks on B
      const taskEId = uuidv4();
      const graph = await storage.load();
      const taskE = new TaskNode({
        id: taskEId,
        title: 'Implement user dashboard component',
        description: 'A test task that blocks on B for testing duplicate edge detection in the wire command.',
        status: 'ready',
        priority: 'top',
        success_criteria: [{ id: uuidv4(), text: 'Dashboard renders user data', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/components/Dashboard.tsx', completed: false }],
        blockers: [taskBId],
        dependencies: 'Needs B',
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });
      graph.addNode(taskE);
      graph.addEdge(taskBId, taskEId);
      await storage.save(graph);

      // Try to wire C between B and E - but C already blocks on B
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskCId} --after ${taskBId} --before ${taskEId} --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when missing --dep-on-after', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskCId} --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when missing --dep-on-before', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskCId} --dep-on-after "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when task to wire does not exist', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire nonexistent --after ${taskAId} --before ${taskCId} --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when --after task does not exist', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after nonexistent --before ${taskCId} --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should error when --before task does not exist', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before nonexistent --dep-on-after "test" --dep-on-before "test"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle B having existing blockers', async () => {
      // Add D as blocker to B
      const graph = await storage.load();
      const taskB = graph.getNode(taskBId);
      taskB?.addBlocker(taskDId);
      graph.addEdge(taskDId, taskBId);
      taskB?.setDependencies('B depends on D');
      await storage.save(graph);

      // Wire B between A and C
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskCId} --dep-on-after "Needs API spec" --dep-on-before "Frontend needs types"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Wired');

      // B should now have both D and A as blockers
      const updatedGraph = await storage.load();
      const updatedB = updatedGraph.getNode(taskBId);
      expect(updatedB?.blockers).toContain(taskDId);
      expect(updatedB?.blockers).toContain(taskAId);
      expect(updatedB?.dependencies).toContain('B depends on D');
      expect(updatedB?.dependencies).toContain('Needs API spec');
    });

    it('should handle C having multiple blockers', async () => {
      // Add D as additional blocker to C
      const graph = await storage.load();
      const taskC = graph.getNode(taskCId);
      taskC?.addBlocker(taskDId);
      graph.addEdge(taskDId, taskCId);
      // Update dependencies to mention both
      taskC?.setDependencies('Needs API spec from A and docs from D');
      await storage.save(graph);

      // Wire B between A and C
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" wire ${taskBId} --after ${taskAId} --before ${taskCId} --dep-on-after "Needs API spec" --dep-on-before "Frontend needs types"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Wired');

      // C should have D and B as blockers (A replaced by B)
      const updatedGraph = await storage.load();
      const updatedC = updatedGraph.getNode(taskCId);
      expect(updatedC?.blockers).toContain(taskDId);
      expect(updatedC?.blockers).toContain(taskBId);
      expect(updatedC?.blockers).not.toContain(taskAId);
      // Dependencies replaced with new explanation
      expect(updatedC?.dependencies).toBe('Frontend needs types');
    });
  });
});
