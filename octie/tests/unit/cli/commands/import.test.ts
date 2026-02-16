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

  describe('Markdown import', () => {
    let mdImportFile: string;

    beforeEach(() => {
      // Create markdown test file
      const importDir = join(importFile, '..');
      mdImportFile = join(importDir, 'tasks.md');
    });

    it('should import tasks from markdown file', async () => {
      const mdContent = `# Test Project

## [ ] Create test task for markdown import
**ID**: \`task-md-001\` | **Status**: not_started | **Priority**: top

### Description
Create a comprehensive test task by importing from markdown file format to verify the parsing capabilities of the import command.

### Success Criteria
- [x] Parse task header correctly
- [ ] Parse success criteria checkboxes
- [ ] Parse deliverables with file paths

### Deliverables
- [ ] import.ts → \`src/cli/commands/import.ts\`
- [x] Tests written

### Notes
This is a test task for markdown import.
`;

      writeFileSync(mdImportFile, mdContent);

      const output = execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Parsed');
      expect(output).toContain('markdown');
      expect(output).toContain('Imported');

      const graph = await storage.load();
      expect(graph.size).toBe(1);

      const task = graph.getAllTasks()[0];
      expect(task.title).toBe('Create test task for markdown import');
      expect(task.status).toBe('not_started');
      expect(task.priority).toBe('top');
      expect(task.success_criteria.length).toBe(3);
      expect(task.deliverables.length).toBe(2);
    });

    it('should parse checkbox states correctly', async () => {
      const mdContent = `## [x] Completed Task
**ID**: \`task-completed\`

### Description
This task has some items completed to test checkbox parsing functionality.

### Success Criteria
- [x] First criterion complete
- [ ] Second criterion incomplete

### Deliverables
- [x] Complete deliverable
`;

      writeFileSync(mdImportFile, mdContent);

      execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task = graph.getAllTasks()[0];

      // First criterion should be completed
      expect(task.success_criteria[0].completed).toBe(true);
      // Second criterion should not be completed
      expect(task.success_criteria[1].completed).toBe(false);
    });

    it('should handle [X] uppercase checkbox variant', async () => {
      const mdContent = `## [X] Uppercase Checkbox Task

### Description
Task with uppercase X checkbox variant to test parsing flexibility and ensure both uppercase and lowercase checkboxes are handled correctly during the import process.

### Success Criteria
- [X] Uppercase checkbox should work

### Deliverables
- [ ] Regular deliverable
`;

      writeFileSync(mdImportFile, mdContent);

      execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task = graph.getAllTasks()[0];

      expect(task.success_criteria[0].completed).toBe(true);
    });

    it('should parse blockers with #task-id format', async () => {
      const mdContent = `## [ ] Task With Blocker
**ID**: \`task-blocked\`

### Description
Task that is blocked by another task to test the blocker parsing functionality with the hash format.

### Success Criteria
- [ ] Criterion

### Deliverables
- [ ] Deliverable

### Blockers
- #task-blocker-001
- #task-blocker-002
`;

      writeFileSync(mdImportFile, mdContent);

      execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task = graph.getAllTasks()[0];

      expect(task.blockers).toContain('task-blocker-001');
      expect(task.blockers).toContain('task-blocker-002');
    });

    it('should parse deliverables with file paths', async () => {
      const mdContent = `## [ ] Task With Files
**ID**: \`task-files\`

### Description
Task with deliverables that have associated file paths to test file path parsing in markdown format.

### Success Criteria
- [ ] Criterion

### Deliverables
- [x] Source file → \`src/feature.ts\`
- [ ] Test file → \`tests/feature.test.ts\`
`;

      writeFileSync(mdImportFile, mdContent);

      execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      const task = graph.getAllTasks()[0];

      expect(task.deliverables[0].file_path).toBe('src/feature.ts');
      expect(task.deliverables[0].completed).toBe(true);
      expect(task.deliverables[1].file_path).toBe('tests/feature.test.ts');
      expect(task.deliverables[1].completed).toBe(false);
    });

    it('should parse multiple tasks from one file', async () => {
      const mdContent = `# Multi-Task Export

## [ ] First Task
**ID**: \`task-001\`

### Description
First task description for multi-task markdown import testing with sufficient length to pass validation.

### Success Criteria
- [ ] Criterion 1

### Deliverables
- [ ] src/feature1.ts

---

## [x] Second Task
**ID**: \`task-002\`

### Description
Second task that is already completed and has sufficient description length for validation.

### Success Criteria
- [x] Criterion 2

### Deliverables
- [x] src/feature2.ts
`;

      writeFileSync(mdImportFile, mdContent);

      execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}"`,
        { encoding: 'utf-8' }
      );

      const graph = await storage.load();
      expect(graph.size).toBe(2);

      const task1 = graph.getNode('task-001');
      expect(task1).toBeDefined();
      expect(task1?.status).toBe('not_started');

      const task2 = graph.getNode('task-002');
      expect(task2).toBeDefined();
      expect(task2?.status).toBe('completed');
    });

    it('should merge markdown tasks with existing tasks', async () => {
      // Create existing task
      const graph = await storage.load();
      const existingTask = new TaskNode({
        title: 'Implement first task feature',
        description: 'Existing task that will be matched by title during merge testing and should receive updated completion states from the markdown import.',
        success_criteria: [{ id: uuidv4(), text: 'Criterion 1', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/feature.ts', completed: false }],
        blockers: [],
        dependencies: [],
      });
      graph.addNode(existingTask);
      await storage.save(graph);

      // Import with completion states changed
      const mdContent = `## [x] Implement first task feature

### Description
Existing task that will be matched by title during merge testing and should receive updated completion states from the markdown import.

### Success Criteria
- [x] Criterion 1

### Deliverables
- [x] src/feature.ts
`;

      writeFileSync(mdImportFile, mdContent);

      execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}" --merge`,
        { encoding: 'utf-8' }
      );

      const updatedGraph = await storage.load();
      const mergedTask = updatedGraph.getNode(existingTask.id);
      expect(mergedTask).toBeDefined();
      // Check that criterion was marked complete by merge
      expect(mergedTask?.success_criteria[0].completed).toBe(true);
    });

    it('should auto-detect markdown format from .md extension', () => {
      const mdContent = `## [ ] Auto-detected Task

### Description
Task with markdown extension for auto-detection testing to verify format detection works correctly when file extension is .md.

### Success Criteria
- [ ] Criterion

### Deliverables
- [ ] Deliverable
`;

      writeFileSync(mdImportFile, mdContent);

      const output = execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}"`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Parsed');
    });

    it('should accept explicit --format md', () => {
      const mdContent = `## [ ] Explicit Format Task

### Description
Task with explicit format specification to test that the --format md flag works correctly for markdown file import processing.

### Success Criteria
- [ ] Criterion

### Deliverables
- [ ] Deliverable
`;

      writeFileSync(mdImportFile, mdContent);

      const output = execSync(
        `node ${cliPath} --project "${tempDir}" import "${mdImportFile}" --format md`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Parsed');
    });

    it('should reject empty markdown file', () => {
      writeFileSync(mdImportFile, '# No Tasks Here\n\nJust some text without tasks.');

      expect(() => {
        execSync(
          `node ${cliPath} --project "${tempDir}" import "${mdImportFile}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('MD Export/Import Roundtrip - Completion State Preservation', () => {
    let exportFile: string;

    beforeEach(() => {
      const importDir = join(importFile, '..');
      exportFile = join(importDir, 'roundtrip.md');
    });

    it('should preserve partial completion states through export/import roundtrip', async () => {
      // Create task with mixed completion states
      const graph = await storage.load();
      const sc1 = uuidv4();
      const sc2 = uuidv4();
      const del1 = uuidv4();
      const del2 = uuidv4();

      const task = new TaskNode({
        id: 'task-roundtrip-001',
        title: 'Implement roundtrip test feature',
        description: 'Task with mixed completion states to test export/import roundtrip preserves checkbox states correctly for both success criteria and deliverables.',
        status: 'in_progress',
        priority: 'top',
        success_criteria: [
          { id: sc1, text: 'First criterion completed', completed: true },
          { id: sc2, text: 'Second criterion not completed', completed: false },
        ],
        deliverables: [
          { id: del1, text: 'First deliverable done', completed: true, file_path: 'src/done.ts' },
          { id: del2, text: 'Second deliverable pending', completed: false, file_path: 'src/pending.ts' },
        ],
        blockers: [],
        dependencies: [],
        related_files: ['src/feature/'],
        notes: 'Test notes for roundtrip',
        c7_verified: [],
        sub_items: [],
        edges: [],
      });

      graph.addNode(task);
      await storage.save(graph);

      // Export to markdown
      execSync(
        `node ${cliPath} --project "${tempDir}" export --type md --output "${exportFile}"`,
        { encoding: 'utf-8' }
      );

      // Verify export contains correct checkboxes
      const exportContent = readFileSync(exportFile, 'utf-8');
      expect(exportContent).toContain('[x] First criterion completed');
      expect(exportContent).toContain('[ ] Second criterion not completed');
      expect(exportContent).toContain('[x] First deliverable done');
      expect(exportContent).toContain('[ ] Second deliverable pending');

      // Create new project and import the exported markdown
      const newTempDir = join(tmpdir(), `octie-roundtrip-${uuidv4()}`);
      const newStorage = new TaskStorage({ projectDir: newTempDir });
      await newStorage.createProject('roundtrip-test');

      execSync(
        `node ${cliPath} --project "${newTempDir}" import "${exportFile}"`,
        { encoding: 'utf-8' }
      );

      // Verify imported task has same completion states
      const importedGraph = await newStorage.load();
      const importedTask = importedGraph.getNode('task-roundtrip-001');

      expect(importedTask).toBeDefined();
      expect(importedTask?.success_criteria[0].completed).toBe(true);
      expect(importedTask?.success_criteria[0].text).toBe('First criterion completed');
      expect(importedTask?.success_criteria[1].completed).toBe(false);
      expect(importedTask?.success_criteria[1].text).toBe('Second criterion not completed');
      expect(importedTask?.deliverables[0].completed).toBe(true);
      expect(importedTask?.deliverables[0].file_path).toBe('src/done.ts');
      expect(importedTask?.deliverables[1].completed).toBe(false);
      expect(importedTask?.deliverables[1].file_path).toBe('src/pending.ts');

      // Clean up
      rmSync(newTempDir, { recursive: true, force: true });
    });

    it('should preserve fully completed task status through roundtrip', async () => {
      // Create a task with ALL items completed
      const graph = await storage.load();
      const sc1 = uuidv4();
      const del1 = uuidv4();

      const task = new TaskNode({
        id: 'task-completed-roundtrip',
        title: 'Implement fully completed feature',
        description: 'Task with all criteria and deliverables completed to verify the task status is preserved as completed through the export/import roundtrip.',
        status: 'completed',
        priority: 'top',
        success_criteria: [
          { id: sc1, text: 'All criteria done', completed: true },
        ],
        deliverables: [
          { id: del1, text: 'All deliverables done', completed: true },
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

      // Export to markdown
      execSync(
        `node ${cliPath} --project "${tempDir}" export --type md --output "${exportFile}"`,
        { encoding: 'utf-8' }
      );

      // Verify export has [x] in header (task is completed)
      const exportContent = readFileSync(exportFile, 'utf-8');
      expect(exportContent).toContain('## [x] Implement fully completed feature');
      expect(exportContent).toContain('[x] All criteria done');
      expect(exportContent).toContain('[x] All deliverables done');

      // Create new project and import
      const newTempDir = join(tmpdir(), `octie-completed-${uuidv4()}`);
      const newStorage = new TaskStorage({ projectDir: newTempDir });
      await newStorage.createProject('completed-test');

      execSync(
        `node ${cliPath} --project "${newTempDir}" import "${exportFile}"`,
        { encoding: 'utf-8' }
      );

      // Verify imported task status is completed
      const importedGraph = await newStorage.load();
      const importedTask = importedGraph.getNode('task-completed-roundtrip');

      expect(importedTask).toBeDefined();
      expect(importedTask?.status).toBe('completed');
      expect(importedTask?.success_criteria[0].completed).toBe(true);
      expect(importedTask?.deliverables[0].completed).toBe(true);

      // Clean up
      rmSync(newTempDir, { recursive: true, force: true });
    });

    it('should preserve not_started task status through roundtrip', async () => {
      // Create a task with nothing completed
      const graph = await storage.load();
      const sc1 = uuidv4();
      const del1 = uuidv4();

      const task = new TaskNode({
        id: 'task-notstarted-roundtrip',
        title: 'Implement pending notification feature',
        description: 'Task with no items completed to verify the not_started status is preserved through the export/import roundtrip process.',
        status: 'not_started',
        priority: 'later',
        success_criteria: [
          { id: sc1, text: 'Nothing done yet', completed: false },
        ],
        deliverables: [
          { id: del1, text: 'src/notification.ts', completed: false, file_path: 'src/notification.ts' },
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

      // Export to markdown
      execSync(
        `node ${cliPath} --project "${tempDir}" export --type md --output "${exportFile}"`,
        { encoding: 'utf-8' }
      );

      // Verify export has [ ] in header (task not completed)
      const exportContent = readFileSync(exportFile, 'utf-8');
      expect(exportContent).toContain('## [ ] Implement pending notification feature');
      expect(exportContent).toContain('[ ] Nothing done yet');
      expect(exportContent).toContain('src/notification.ts');

      // Create new project and import
      const newTempDir = join(tmpdir(), `octie-notstarted-${uuidv4()}`);
      const newStorage = new TaskStorage({ projectDir: newTempDir });
      await newStorage.createProject('notstarted-test');

      execSync(
        `node ${cliPath} --project "${newTempDir}" import "${exportFile}"`,
        { encoding: 'utf-8' }
      );

      // Verify imported task status is not_started
      const importedGraph = await newStorage.load();
      const importedTask = importedGraph.getNode('task-notstarted-roundtrip');

      expect(importedTask).toBeDefined();
      expect(importedTask?.status).toBe('not_started');
      expect(importedTask?.success_criteria[0].completed).toBe(false);
      expect(importedTask?.deliverables[0].completed).toBe(false);

      // Clean up
      rmSync(newTempDir, { recursive: true, force: true });
    });

    it('should handle multiple tasks with varying completion states', async () => {
      // Create multiple tasks with different completion states
      const graph = await storage.load();

      // Task 1: Fully complete
      const task1 = new TaskNode({
        id: 'multi-task-001',
        title: 'Implement completed feature A',
        description: 'First task that is fully completed for multi-task roundtrip testing with sufficient description length.',
        status: 'completed',
        success_criteria: [{ id: uuidv4(), text: 'Feature A implementation complete', completed: true }],
        deliverables: [{ id: uuidv4(), text: 'src/feature-a.ts', completed: true, file_path: 'src/feature-a.ts' }],
        blockers: [],
        dependencies: [],
      });

      // Task 2: Partially complete
      const task2 = new TaskNode({
        id: 'multi-task-002',
        title: 'Implement in-progress feature B',
        description: 'Second task that is partially completed for multi-task roundtrip testing with sufficient description length.',
        status: 'in_progress',
        success_criteria: [
          { id: uuidv4(), text: 'Feature B core logic complete', completed: true },
          { id: uuidv4(), text: 'Feature B edge cases pending', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'src/feature-b-core.ts', completed: true, file_path: 'src/feature-b-core.ts' },
          { id: uuidv4(), text: 'src/feature-b-edges.ts', completed: false, file_path: 'src/feature-b-edges.ts' },
        ],
        blockers: [],
        dependencies: [],
      });

      // Task 3: Not started
      const task3 = new TaskNode({
        id: 'multi-task-003',
        title: 'Implement pending feature C',
        description: 'Third task that is not started for multi-task roundtrip testing with sufficient description length.',
        status: 'not_started',
        success_criteria: [{ id: uuidv4(), text: 'Feature C not started', completed: false }],
        deliverables: [{ id: uuidv4(), text: 'src/feature-c.ts', completed: false, file_path: 'src/feature-c.ts' }],
        blockers: [],
        dependencies: [],
      });

      graph.addNode(task1);
      graph.addNode(task2);
      graph.addNode(task3);
      await storage.save(graph);

      // Export to markdown
      execSync(
        `node ${cliPath} --project "${tempDir}" export --type md --output "${exportFile}"`,
        { encoding: 'utf-8' }
      );

      // Create new project and import
      const newTempDir = join(tmpdir(), `octie-multi-${uuidv4()}`);
      const newStorage = new TaskStorage({ projectDir: newTempDir });
      await newStorage.createProject('multi-test');

      execSync(
        `node ${cliPath} --project "${newTempDir}" import "${exportFile}"`,
        { encoding: 'utf-8' }
      );

      // Verify all three tasks have correct states
      const importedGraph = await newStorage.load();
      expect(importedGraph.size).toBe(3);

      const imported1 = importedGraph.getNode('multi-task-001');
      expect(imported1?.status).toBe('completed');
      expect(imported1?.success_criteria[0].completed).toBe(true);

      const imported2 = importedGraph.getNode('multi-task-002');
      expect(imported2?.status).toBe('in_progress');
      expect(imported2?.success_criteria[0].completed).toBe(true);
      expect(imported2?.success_criteria[1].completed).toBe(false);
      expect(imported2?.deliverables[0].completed).toBe(true);
      expect(imported2?.deliverables[1].completed).toBe(false);

      const imported3 = importedGraph.getNode('multi-task-003');
      expect(imported3?.status).toBe('not_started');
      expect(imported3?.success_criteria[0].completed).toBe(false);

      // Clean up
      rmSync(newTempDir, { recursive: true, force: true });
    });
  });
});
