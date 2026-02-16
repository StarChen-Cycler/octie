/**
 * List Command Unit Tests
 *
 * Tests for list command including:
 * - Task listing with filters
 * - Multiple output formats (table, json, md)
 * - Tree view
 * - Graph view
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStorage } from '../../../../src/core/storage/file-store.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';
import { execSync } from 'node:child_process';

describe('list command', () => {
  let tempDir: string;
  let cliPath: string;
  let storage: TaskStorage;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `octie-test-${uuidv4()}`);
    storage = new TaskStorage({ projectDir: tempDir });
    await storage.createProject('test-project');

    // CLI entry point
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');

    // Create test tasks
    const graph = await storage.load();

    const task1 = new TaskNode({
      id: uuidv4(),
      title: 'Implement login endpoint',
      description: 'Create login endpoint with JWT authentication for secure user access',
      status: 'not_started',
      priority: 'top',
      success_criteria: [{ id: uuidv4(), text: 'Endpoint returns 200 with valid JWT', completed: false }],
      deliverables: [{ id: uuidv4(), text: 'login.ts', completed: false }],
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
      title: 'Write comprehensive unit tests',
      description: 'Create comprehensive unit tests for login functionality with full coverage',
      status: 'in_progress',
      priority: 'second',
      success_criteria: [{ id: uuidv4(), text: 'All unit tests pass successfully', completed: false }],
      deliverables: [{ id: uuidv4(), text: 'login.test.ts', completed: false }],
      blockers: [],
      dependencies: [],
      related_files: [],
      notes: '',
      c7_verified: [],
      sub_items: [],
      edges: [],
    });

    const task3 = new TaskNode({
      id: uuidv4(),
      title: 'Write API documentation',
      description: 'Write comprehensive API documentation for login endpoint with examples',
      status: 'completed',
      priority: 'later',
      success_criteria: [{ id: uuidv4(), text: 'Documentation is complete and verified', completed: true }],
      deliverables: [{ id: uuidv4(), text: 'docs/api/login.md', completed: true }],
      blockers: [],
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

  describe('basic listing', () => {
    it('should list all tasks in table format by default', () => {
      const output = execSync(
        `node ${cliPath} list --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Implement login');
      expect(output).toContain('Write tests');
      expect(output).toContain('Documentation');
    });

    it('should show task count in summary', () => {
      const output = execSync(
        `node ${cliPath} list --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('3 tasks');
    });
  });

  describe('status filtering', () => {
    it('should filter tasks by status', () => {
      const output = execSync(
        `node ${cliPath} list --status not_started --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Implement login');
      expect(output).not.toContain('Write tests');
      expect(output).not.toContain('Documentation');
    });

    it('should show in_progress tasks', () => {
      const output = execSync(
        `node ${cliPath} list --status in_progress --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Write tests');
      expect(output).not.toContain('Implement login');
    });

    it('should show completed tasks', () => {
      const output = execSync(
        `node ${cliPath} list --status completed --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Documentation');
      expect(output).not.toContain('Implement login');
    });
  });

  describe('priority filtering', () => {
    it('should filter tasks by priority', () => {
      const output = execSync(
        `node ${cliPath} list --priority top --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Implement login');
      expect(output).not.toContain('Write tests');
      expect(output).not.toContain('Documentation');
    });

    it('should filter second priority tasks', () => {
      const output = execSync(
        `node ${cliPath} list --priority second --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Write tests');
      expect(output).not.toContain('Implement login');
    });
  });

  describe('output formats', () => {
    it('should output in JSON format', () => {
      const output = execSync(
        `node ${cliPath} list --format json --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      const data = JSON.parse(output);
      expect(data).toBeInstanceOf(Object);
      expect(Object.keys(data).length).toBe(3);
    });

    it('should output in markdown format', () => {
      const output = execSync(
        `node ${cliPath} list --format md --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('##'); // Markdown heading
      expect(output).toContain('[ ]'); // Checkbox format
    });

    it('should output in table format by default', () => {
      const output = execSync(
        `node ${cliPath} list --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      // Table format should contain task titles
      expect(output).toContain('Implement login');
    });
  });

  describe('tree view', () => {
    it('should display tasks in tree structure with --tree flag', () => {
      const output = execSync(
        `node ${cliPath} list --tree --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      // Tree format should contain task titles
      expect(output).toContain('Implement login');
      expect(output).toContain('Write tests');
      expect(output).toContain('Documentation');
    });
  });

  describe('graph view', () => {
    it('should display graph structure with --graph flag', () => {
      const output = execSync(
        `node ${cliPath} list --graph --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      // Graph view should show structure
      expect(output).toBeTruthy();
    });
  });

  describe('empty project', () => {
    it('should handle empty project gracefully', async () => {
      // Create empty project
      const emptyDir = join(tmpdir(), `octie-empty-${uuidv4()}`);
      const emptyStorage = new TaskStorage({ projectDir: emptyDir });
      await emptyStorage.createProject('empty');

      const output = execSync(
        `node ${cliPath} list --project "${emptyDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('No tasks');

      // Cleanup
      rmSync(emptyDir, { recursive: true, force: true });
    });
  });

  describe('help', () => {
    it('should show help with --help flag', () => {
      const output = execSync(`node ${cliPath} list --help`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('List all tasks');
      expect(output).toContain('--status');
      expect(output).toContain('--priority');
      expect(output).toContain('--format');
    });
  });
});
