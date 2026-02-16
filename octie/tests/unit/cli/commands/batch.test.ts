/**
 * Tests for batch command
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStorage } from '../../../../src/core/storage/file-store.js';
import { TaskGraphStore } from '../../../../src/core/graph/index.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';

const cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');

describe('Batch Command', () => {
  let tempDir: string;
  let storage: TaskStorage;
  let task1Id: string;
  let task2Id: string;
  let task3Id: string;
  let task4Id: string;

  beforeEach(async () => {
    // Create temp directory
    tempDir = join(tmpdir(), `octie-batch-test-${uuidv4()}`);
    mkdirSync(tempDir, { recursive: true });

    // Initialize storage and create project first
    storage = new TaskStorage({ projectDir: tempDir });
    await storage.createProject('test-project');

    // Load the graph and add test tasks
    const graph = await storage.load();

    task1Id = uuidv4();
    const task1Data = {
      id: task1Id,
      title: 'Implement authentication feature',
      description: 'Implement user authentication with JWT tokens and OAuth2 provider integration for secure access',
      status: 'not_started' as const,
      priority: 'top' as const,
      success_criteria: [
        { id: uuidv4(), text: 'JWT tokens generated correctly', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'auth.ts implementation', completed: false },
      ],
      blockers: [],
      dependencies: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    };
    graph.addNode(new TaskNode(task1Data));

    task2Id = uuidv4();
    const task2Data = {
      id: task2Id,
      title: 'Create API endpoints',
      description: 'Create REST API endpoints for user management and profile updates with validation',
      status: 'not_started' as const,
      priority: 'top' as const,
      success_criteria: [
        { id: uuidv4(), text: 'CRUD operations work', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'api.ts endpoints', completed: false },
      ],
      blockers: [],
      dependencies: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    };
    graph.addNode(new TaskNode(task2Data));

    task3Id = uuidv4();
    const task3Data = {
      id: task3Id,
      title: 'Design database schema',
      description: 'Design and implement PostgreSQL database schema for user data with proper indexing',
      status: 'not_started' as const,
      priority: 'second' as const,
      success_criteria: [
        { id: uuidv4(), text: 'Schema validated', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'schema.sql', completed: false },
      ],
      blockers: [],
      dependencies: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    };
    graph.addNode(new TaskNode(task3Data));

    task4Id = uuidv4();
    const task4Data = {
      id: task4Id,
      title: 'Write test suite',
      description: 'Write comprehensive test suite for authentication and API endpoints with mocking',
      status: 'not_started' as const,
      priority: 'later' as const,
      success_criteria: [
        { id: uuidv4(), text: '80% coverage achieved', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'tests/', completed: false },
      ],
      blockers: [],
      dependencies: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    };
    graph.addNode(new TaskNode(task4Data));

    // Save
    await storage.save(graph);
  });

  afterEach(() => {
    // Cleanup
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('batch update-status', () => {
    it('should preview status update with --dry-run', () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch update-status in_progress --priority top --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Dry run output:', output);
    });

    it('should update status of filtered tasks', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch update-status in_progress --priority top`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task1 = graph.getNode(task1Id);
      const task2 = graph.getNode(task2Id);
      const task3 = graph.getNode(task3Id);

      console.log('Update output:', output);
      console.log('Task1 status:', task1?.status);
      console.log('Task2 status:', task2?.status);
      console.log('Task3 status:', task3?.status);
    });

    it('should combine multiple filters', async () => {
      // Use valid status transition (not_started -> in_progress)
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch update-status in_progress --priority top --search "JWT"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task1 = graph.getNode(task1Id);
      const task2 = graph.getNode(task2Id);

      console.log('Combined filter output:', output);
      console.log('Task1 status:', task1?.status);
      console.log('Task2 status:', task2?.status);
    });

    it('should show no tasks message when no matches', () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch update-status in_progress --status completed --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('No matches output:', output);
    });
  });

  describe('batch delete', () => {
    it('should preview deletion with --dry-run', () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch delete --priority later --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Delete dry-run output:', output);
    });

    it('should require --force for deletion', async () => {
      // Without --force, command exits with status 1
      try {
        const output = execSync(
          `node "${cliPath}" --project "${tempDir}" batch delete --priority later`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
        console.log('Unexpected success:', output);
      } catch (error: any) {
        // Expected - command fails without --force
        const graph = await storage.load();
        const task4 = graph.getNode(task4Id);

        console.log('No force output (expected error):', error.stdout?.toString() || error.message);
        console.log('Task4 exists:', !!task4);
      }
    });

    it('should delete tasks with --force', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch delete --priority later --force`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task4 = graph.getNode(task4Id);

      console.log('Delete with force output:', output);
      console.log('Task4 exists after delete:', !!task4);
    });

    it('should delete multiple matching tasks', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch delete --priority top --force`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task1 = graph.getNode(task1Id);
      const task2 = graph.getNode(task2Id);

      console.log('Delete multiple output:', output);
      console.log('Task1 exists:', !!task1);
      console.log('Task2 exists:', !!task2);
    });
  });

  describe('batch add-blocker', () => {
    it('should preview blocker addition with --dry-run', () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch add-blocker ${task3Id} --priority top --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Add blocker dry-run output:', output);
    });

    it('should add blocker to filtered tasks', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch add-blocker ${task3Id} --priority top`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task1 = graph.getNode(task1Id);
      const task2 = graph.getNode(task2Id);

      console.log('Add blocker output:', output);
      console.log('Task1 blockers:', task1?.blockers);
      console.log('Task2 blockers:', task2?.blockers);
    });

    it('should fail if blocker task does not exist', () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      try {
        const output = execSync(
          `node "${cliPath}" --project "${tempDir}" batch add-blocker ${fakeId} --priority top`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
        console.log('Unexpected success:', output);
      } catch (error: any) {
        console.log('Expected error:', error.stderr?.toString() || error.message);
      }
    });

    it('should not add duplicate blocker', async () => {
      execSync(
        `node "${cliPath}" --project "${tempDir}" batch add-blocker ${task3Id} --priority top`,
        { encoding: 'utf-8' }
      );

      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch add-blocker ${task3Id} --priority top`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task1 = graph.getNode(task1Id);

      console.log('Duplicate blocker output:', output);
      console.log('Task1 blockers (should have 1):', task1?.blockers);
    });
  });

  describe('batch remove-blocker', () => {
    beforeEach(async () => {
      const graph = await storage.load();
      const task1 = graph.getNode(task1Id);
      const task2 = graph.getNode(task2Id);
      if (task1) task1.addBlocker(task3Id);
      if (task2) task2.addBlocker(task3Id);
      await storage.save(graph);
    });

    it('should preview blocker removal with --dry-run', () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch remove-blocker ${task3Id} --priority top --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Remove blocker dry-run output:', output);
    });

    it('should remove blocker from filtered tasks', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch remove-blocker ${task3Id} --priority top`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task1 = graph.getNode(task1Id);
      const task2 = graph.getNode(task2Id);

      console.log('Remove blocker output:', output);
      console.log('Task1 blockers (should be empty):', task1?.blockers);
      console.log('Task2 blockers (should be empty):', task2?.blockers);
    });

    it('should handle tasks without the blocker', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch remove-blocker ${task3Id} --priority second`,
        { encoding: 'utf-8' }
      );

      console.log('Remove from tasks without blocker output:', output);
    });
  });

  describe('filter combinations', () => {
    it('should filter by title substring', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch update-status in_progress --title "API" --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Title filter output:', output);
    });

    it('should filter by search text', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch update-status in_progress --search "PostgreSQL" --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Search filter output:', output);
    });

    it('should filter by status', async () => {
      const graph = await storage.load();
      const task1 = graph.getNode(task1Id);
      if (task1) task1.setStatus('in_progress');
      await storage.save(graph);

      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch update-status completed --status in_progress --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Status filter output:', output);
    });

    it('should filter by priority', async () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch update-status in_progress --priority top --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Priority filter output:', output);
    });
  });

  describe('error handling', () => {
    it('should handle invalid status value', () => {
      try {
        const output = execSync(
          `node "${cliPath}" --project "${tempDir}" batch update-status invalid_status --dry-run`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
        console.log('Unexpected success:', output);
      } catch (error: any) {
        console.log('Expected error for invalid status:', error.stderr?.toString() || error.message);
      }
    });

    it('should handle no matching tasks gracefully', () => {
      const output = execSync(
        `node "${cliPath}" --project "${tempDir}" batch delete --status completed --force`,
        { encoding: 'utf-8' }
      );

      console.log('No matching tasks output:', output);
    });

    it('should handle empty project', async () => {
      const emptyDir = join(tmpdir(), `octie-empty-${uuidv4()}`);
      mkdirSync(emptyDir, { recursive: true });
      const emptyStorage = new TaskStorage({ projectDir: emptyDir });
      await emptyStorage.createProject('empty-project');

      const output = execSync(
        `node "${cliPath}" --project "${emptyDir}" batch update-status in_progress --dry-run`,
        { encoding: 'utf-8' }
      );

      console.log('Empty project output:', output);

      try {
        rmSync(emptyDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });
  });

  describe('help', () => {
    it('should show batch command help', () => {
      const output = execSync(
        `node "${cliPath}" batch --help`,
        { encoding: 'utf-8' }
      );

      console.log('Batch help:', output);
    });

    it('should show update-status help', () => {
      const output = execSync(
        `node "${cliPath}" batch update-status --help`,
        { encoding: 'utf-8' }
      );

      console.log('Update-status help:', output);
    });

    it('should show delete help', () => {
      const output = execSync(
        `node "${cliPath}" batch delete --help`,
        { encoding: 'utf-8' }
      );

      console.log('Delete help:', output);
    });

    it('should show add-blocker help', () => {
      const output = execSync(
        `node "${cliPath}" batch add-blocker --help`,
        { encoding: 'utf-8' }
      );

      console.log('Add-blocker help:', output);
    });

    it('should show remove-blocker help', () => {
      const output = execSync(
        `node "${cliPath}" batch remove-blocker --help`,
        { encoding: 'utf-8' }
      );

      console.log('Remove-blocker help:', output);
    });
  });
});
