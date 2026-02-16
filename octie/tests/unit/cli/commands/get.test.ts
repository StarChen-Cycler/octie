/**
 * Get Command Unit Tests
 *
 * Tests for get command including:
 * - Task retrieval by ID
 * - Multiple output formats
 * - Error handling for invalid IDs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStorage } from '../../../../src/core/storage/file-store.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';
import { execSync } from 'node:child_process';

describe('get command', () => {
  let tempDir: string;
  let cliPath: string;
  let storage: TaskStorage;
  let testTaskId: string;

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

    const task = new TaskNode({
      id: testTaskId,
      title: 'Implement login endpoint',
      description: 'Create POST /auth/login endpoint that validates credentials and returns JWT token',
      status: 'in_progress',
      priority: 'top',
      success_criteria: [
        { id: uuidv4(), text: 'Endpoint returns 200 with valid JWT', completed: true },
        { id: uuidv4(), text: 'Endpoint returns 401 on invalid credentials', completed: false },
      ],
      deliverables: [
        { id: uuidv4(), text: 'src/api/auth/login.ts', completed: true },
        { id: uuidv4(), text: 'tests/api/auth/login.test.ts', completed: false },
      ],
      blockers: [],
      dependencies: [],
      related_files: ['src/auth/', 'tests/auth/'],
      notes: 'Use bcrypt for password hashing',
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

  describe('task retrieval', () => {
    it('should display task details by ID', () => {
      const output = execSync(
        `node ${cliPath} get ${testTaskId} --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Implement login endpoint');
      expect(output).toContain('POST /auth/login');
      expect(output).toContain('in_progress');
      expect(output).toContain('top');
    });

    it('should show success criteria with completion status', () => {
      const output = execSync(
        `node ${cliPath} get ${testTaskId} --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Endpoint returns 200 with valid JWT');
      expect(output).toContain('Endpoint returns 401 on invalid credentials');
    });

    it('should show deliverables with completion status', () => {
      const output = execSync(
        `node ${cliPath} get ${testTaskId} --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('src/api/auth/login.ts');
      expect(output).toContain('tests/api/auth/login.test.ts');
    });

    it('should show related files', () => {
      const output = execSync(
        `node ${cliPath} get ${testTaskId} --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('src/auth/');
      expect(output).toContain('tests/auth/');
    });

    it('should show notes', () => {
      const output = execSync(
        `node ${cliPath} get ${testTaskId} --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Use bcrypt for password hashing');
    });
  });

  describe('output formats', () => {
    it('should output in JSON format', () => {
      const output = execSync(
        `node ${cliPath} get ${testTaskId} --format json --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      const data = JSON.parse(output);
      expect(data.id).toBe(testTaskId);
      expect(data.title).toBe('Implement login endpoint');
      expect(data.success_criteria).toHaveLength(2);
      expect(data.deliverables).toHaveLength(2);
    });

    it('should output in markdown format', () => {
      const output = execSync(
        `node ${cliPath} get ${testTaskId} --format md --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('##');
      expect(output).toContain('[ ]');
      expect(output).toContain('[x]');
    });

    it('should output in table format by default', () => {
      const output = execSync(
        `node ${cliPath} get ${testTaskId} --project "${tempDir}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Implement login endpoint');
    });
  });

  describe('error handling', () => {
    it('should reject invalid task ID', () => {
      const fakeId = uuidv4();

      expect(() => {
        execSync(
          `node ${cliPath} get ${fakeId} --project "${tempDir}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should reject malformed UUID', () => {
      expect(() => {
        execSync(
          `node ${cliPath} get not-a-uuid --project "${tempDir}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('help', () => {
    it('should show help with --help flag', () => {
      const output = execSync(`node ${cliPath} get --help`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('Get task details');
      expect(output).toContain('--format');
    });
  });
});
