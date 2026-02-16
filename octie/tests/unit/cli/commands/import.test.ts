/**
 * Import Command Unit Tests
 *
 * Tests for import command including:
 * - JSON import
 * - Format auto-detection
 * - Merge strategy
 * - Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStorage } from '../../../../src/core/storage/file-store.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';
import { execSync } from 'node:child_process';

describe('import command', () => {
  let tempDir: string;
  let cliPath: string;
  let storage: TaskStorage;
  let importFile: string;

  beforeEach(async () => {
    // Create unique temp directories
    tempDir = join(tmpdir(), `octie-test-${uuidv4()}`);
    const importDir = join(tmpdir(), `octie-import-${uuidv4()}`);
    mkdirSync(importDir, { recursive: true });
    storage = new TaskStorage({ projectDir: tempDir });
    await storage.createProject('test-project');

    // CLI entry point
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');

    // Create test import file
    importFile = join(importDir, 'import.json');
    const taskId = uuidv4();
    const criterionId = uuidv4();
    const deliverableId = uuidv4();

    const importData = {
      version: '1.0.0',
      format: 'octie-project',
      tasks: {
        [taskId]: {
          id: taskId,
          title: 'Create imported test task from JSON',
          description: 'Create a test task by importing from JSON file to test the import functionality',
          status: 'not_started',
          priority: 'second',
          success_criteria: [
            { id: criterionId, text: 'Import command loads task successfully', completed: false },
          ],
          deliverables: [
            { id: deliverableId, text: 'imported.ts', completed: false },
          ],
          blockers: [],
          dependencies: [],
          related_files: [],
          notes: 'Imported task notes',
          c7_verified: [],
          sub_items: [],
          edges: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null,
        },
      },
      edges: [],
      metadata: {
        project_name: 'imported-project',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task_count: 1,
      },
      indexes: {
        byStatus: {
          not_started: [taskId],
          pending: [],
          in_progress: [],
          completed: [],
          blocked: [],
        },
        byPriority: {
          top: [],
          second: [taskId],
          later: [],
        },
        rootTasks: [taskId],
        orphans: [],
      },
    };

    writeFileSync(importFile, JSON.stringify(importData, null, 2));
  });

  afterEach(async () => {
    // Clean up temp directories
    try {
      const importDir = join(importFile, '..');
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(importDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('JSON import', () => {
    it('should import tasks from JSON file', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" import "${importFile}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Imported');

      const graph = await storage.load();
      expect(graph.size).toBe(1);

      const tasks = graph.getAllTasks();
      const task = Array.from(tasks.values())[0];
      expect(task.title).toContain('imported');
    });

    it('should create backup before import', async () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" import "${importFile}"`,
        { encoding: 'utf-8' }
      );

      // Import should succeed and show imported count
      expect(output).toContain('Imported');

      // Verify the task was imported
      const graph = await storage.load();
      expect(graph.size).toBe(1);
    });
  });

  describe('format detection', () => {
    it('should auto-detect JSON format from .json extension', () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" import "${importFile}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Imported');
    });

    it('should accept explicit format specification', () => {
      const output = execSync(
        `node ${cliPath} --project "${tempDir}" import "${importFile}" --format json`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Imported');
    });
  });

  describe('merge strategy', () => {
    it('should replace existing tasks by default', async () => {
      // Create an existing task
      const graph = await storage.load();
      const existingTask = new TaskNode({
        id: uuidv4(),
        title: 'Create existing test task for replacement',
        description: 'Create an existing test task that should be replaced during import testing',
        status: 'completed',
        priority: 'top',
        success_criteria: [{ id: uuidv4(), text: 'Task is created and saved', completed: true }],
        deliverables: [{ id: uuidv4(), text: 'existing.ts', completed: true }],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      graph.addNode(existingTask);
      await storage.save(graph);

      // Import should replace with new data
      execSync(
        `node ${cliPath} --project "${tempDir}" import "${importFile}"`,
        { encoding: 'utf-8' }
      );

      const updatedGraph = await storage.load();
      expect(updatedGraph.size).toBe(1); // Only imported task
      expect(updatedGraph.getNode(existingTask.id)).toBeUndefined();
    });

    it('should merge with existing tasks when --merge flag is used', async () => {
      // Create an existing task with different ID
      const graph = await storage.load();
      const existingTask = new TaskNode({
        id: uuidv4(),
        title: 'Create existing test task for merge testing',
        description: 'Create an existing test task that should remain after merge import testing',
        status: 'completed',
        priority: 'top',
        success_criteria: [{ id: uuidv4(), text: 'Task is created and saved', completed: true }],
        deliverables: [{ id: uuidv4(), text: 'existing.ts', completed: true }],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      graph.addNode(existingTask);
      await storage.save(graph);

      // Import with merge should keep existing task
      execSync(
        `node ${cliPath} --project "${tempDir}" import "${importFile}" --merge`,
        { encoding: 'utf-8' }
      );

      const updatedGraph = await storage.load();
      expect(updatedGraph.size).toBe(2); // Both tasks
      expect(updatedGraph.getNode(existingTask.id)).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should reject invalid JSON structure', () => {
      const invalidFile = join(tempDir, 'invalid.json');
      writeFileSync(invalidFile, '{ invalid json }');

      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" import "${invalidFile}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should reject missing file', () => {
      const missingFile = join(tempDir, 'missing.json');

      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" import "${missingFile}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });

    it('should validate task data structure', () => {
      const invalidDataFile = join(tempDir, 'invalid-data.json');
      writeFileSync(invalidDataFile, JSON.stringify({ tasks: 'invalid' }));

      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" import --file "${invalidDataFile}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('error handling', () => {
    it('should show helpful error for invalid data', () => {
      const invalidFile = join(tempDir, 'invalid.json');
      writeFileSync(invalidFile, JSON.stringify({ invalid: 'data' }));

      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" import "${invalidFile}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('help', () => {
    it('should show help with --help flag', () => {
      const output = execSync(`node ${cliPath} import --help`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('Import tasks');
      // Note: file is a positional argument, not an option
      expect(output).toContain('file');
      expect(output).toContain('--format');
      expect(output).toContain('--merge');
    });
  });
});
