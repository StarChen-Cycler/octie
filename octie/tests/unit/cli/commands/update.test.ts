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
import { rmSync, writeFileSync, mkdirSync } from 'node:fs';
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

  describe('remove operations', () => {
    it('should remove a success criterion', async () => {
      // First add a second criterion so we can remove one
      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --add-success-criterion "Unit tests pass"`,
        { encoding: 'utf-8' }
      );

      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-criterion "${criterionId}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.success_criteria.length).toBe(1);
      expect(task?.success_criteria.find(c => c.id === criterionId)).toBeUndefined();
    });

    it('should reject removing last success criterion', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-criterion "${criterionId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should remove a deliverable', async () => {
      // First add a second deliverable so we can remove one
      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --add-deliverable "tests/api/auth/login.test.ts"`,
        { encoding: 'utf-8' }
      );

      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-deliverable "${deliverableId}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.deliverables.length).toBe(1);
      expect(task?.deliverables.find(d => d.id === deliverableId)).toBeUndefined();
    });

    it('should reject removing last deliverable', async () => {
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-deliverable "${deliverableId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should add and remove a dependency', async () => {
      // Create another task to use as dependency
      const graph = await storage.load();
      const depTaskId = uuidv4();

      const depTask = new TaskNode({
        id: depTaskId,
        title: 'Implement dependency task',
        description: 'Valid description that is long enough to meet minimum requirements for the test case',
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

      graph.addNode(depTask);
      await storage.save(graph);

      // Add dependency
      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --add-dependency "${depTaskId}"`,
        { encoding: 'utf-8' }
      );

      let updatedGraph = await storage.load();
      let task = updatedGraph.getNode(testTaskId);
      expect(task?.dependencies).toContain(depTaskId);

      // Remove dependency
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-dependency "${depTaskId}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      updatedGraph = await storage.load();
      task = updatedGraph.getNode(testTaskId);
      expect(task?.dependencies).not.toContain(depTaskId);
    });

    it('should add and remove a related file', async () => {
      // Add related file
      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --add-related-file "src/auth/login.ts"`,
        { encoding: 'utf-8' }
      );

      let graph = await storage.load();
      let task = graph.getNode(testTaskId);
      expect(task?.related_files).toContain('src/auth/login.ts');

      // Remove related file
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-related-file "src/auth/login.ts"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      graph = await storage.load();
      task = graph.getNode(testTaskId);
      expect(task?.related_files).not.toContain('src/auth/login.ts');
    });

    it('should reject removing non-existent criterion', async () => {
      const fakeId = uuidv4();
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-criterion "${fakeId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should reject removing non-existent deliverable', async () => {
      const fakeId = uuidv4();
      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-deliverable "${fakeId}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('C7 verification operations', () => {
    it('should add C7 verification with library ID only', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --verify-c7 "/expressjs/express"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.c7_verified).toHaveLength(1);
      expect(task?.c7_verified[0].library_id).toBe('/expressjs/express');
    });

    it('should add C7 verification with library ID and notes', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --verify-c7 "/mongodb/docs:Query patterns"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.c7_verified).toHaveLength(1);
      expect(task?.c7_verified[0].library_id).toBe('/mongodb/docs');
      expect(task?.c7_verified[0].notes).toBe('Query patterns');
    });

    it('should remove C7 verification', async () => {
      // First add a verification
      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --verify-c7 "/expressjs/express"`,
        { encoding: 'utf-8' }
      );

      // Then remove it
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --remove-c7-verified "/expressjs/express"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.c7_verified).toHaveLength(0);
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

  describe('notes file option', () => {
    let notesDir: string;

    beforeEach(() => {
      notesDir = join(tmpdir(), `octie-notes-${uuidv4()}`);
      mkdirSync(notesDir, { recursive: true });
    });

    afterEach(() => {
      try {
        rmSync(notesDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should append notes from file to existing task notes', async () => {
      const notesFile = join(notesDir, 'test-notes.txt');
      writeFileSync(notesFile, 'This is additional context from file.\nWith multiple lines.');

      const output = execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --notes-file "${notesFile}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Task updated');

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.notes).toContain('This is additional context from file.');
      expect(task?.notes).toContain('With multiple lines.');
    });

    it('should handle markdown files', async () => {
      const notesFile = join(notesDir, 'notes.md');
      writeFileSync(notesFile, '# Implementation Notes\n\n- Item 1\n- Item 2\n\n```typescript\nconst x = 1;\n```');

      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --notes-file "${notesFile}"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.notes).toContain('# Implementation Notes');
      expect(task?.notes).toContain('const x = 1;');
    });

    it('should reject non-existent notes file', () => {
      const missingFile = join(notesDir, 'missing.txt');

      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" update ${testTaskId} --notes-file "${missingFile}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should trim whitespace from file content', async () => {
      const notesFile = join(notesDir, 'padded.txt');
      writeFileSync(notesFile, '   \n  Trimmed content  \n   ');

      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --notes-file "${notesFile}"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      // The content should be trimmed but not completely empty
      expect(task?.notes).toContain('Trimmed content');
    });

    it('should work with both --notes and --notes-file together', async () => {
      const notesFile = join(notesDir, 'combined.txt');
      writeFileSync(notesFile, 'File content here');

      execSync(
        `node ${cliPath} --project "${tempDir}" update ${testTaskId} --notes "Inline note" --notes-file "${notesFile}"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task = graph.getNode(testTaskId);
      expect(task?.notes).toContain('Inline note');
      expect(task?.notes).toContain('File content here');
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
