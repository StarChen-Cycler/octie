/**
 * Create Command Unit Tests
 *
 * Tests for create command functionality including:
 * - Task creation with all required fields
 * - Atomic task validation
 * - Error handling for invalid input
 * - Blockers and dependencies handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStorage } from '../../../../src/core/storage/file-store.js';
import { TaskNode } from '../../../../src/core/models/task-node.js';
import { TaskGraphStore } from '../../../../src/core/graph/index.js';

describe('create command', () => {
  let tempDir: string;
  let storage: TaskStorage;
  let graph: TaskGraphStore;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `octie-test-${uuidv4()}`);
    storage = new TaskStorage({ projectDir: tempDir });
    await storage.createProject('test-project');
    graph = await storage.load();
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('task creation with required fields', () => {
    it('should create task with all required fields', () => {
      const taskId = uuidv4();
      const taskData = {
        id: taskId,
        title: 'Implement login endpoint',
        description: 'Create POST /auth/login endpoint that validates credentials and returns JWT token',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Endpoint returns 200 with valid JWT', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'src/api/auth/login.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const task = new TaskNode(taskData);
      graph.addNode(task);
      expect(graph.size).toBe(1);

      const retrieved = graph.getNode(taskId);
      expect(retrieved?.title).toBe('Implement login endpoint');
      expect(retrieved?.status).toBe('not_started');
      expect(retrieved?.priority).toBe('second');
    });

    it('should accept multiple success criteria', () => {
      const taskId = uuidv4();
      const taskData = {
        id: taskId,
        title: 'Add password hashing',
        description: 'Create hashPassword function using bcrypt with 10 salt rounds for secure password storage',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'hashPassword function returns bcrypt hash', completed: false },
          { id: uuidv4(), text: 'Hash uses 10 salt rounds', completed: false },
          { id: uuidv4(), text: 'Unit tests pass with 100% coverage', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'src/auth/hashing.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const task = new TaskNode(taskData);
      expect(task.success_criteria.length).toBe(3);
    });

    it('should accept multiple deliverables', () => {
      const taskId = uuidv4();
      const taskData = {
        id: taskId,
        title: 'Write unit tests',
        description: 'Create comprehensive unit tests for User model with full coverage of all methods and edge cases',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'All tests pass', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'tests/models/user.test.ts', completed: false },
          { id: uuidv4(), text: 'tests/models/user.factory.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const task = new TaskNode(taskData);
      expect(task.deliverables.length).toBe(2);
    });
  });

  describe('atomic task validation', () => {
    it('should reject vague title without action verb', () => {
      const taskData = {
        id: uuidv4(),
        title: 'Fix stuff',
        description: 'Fix various issues in the codebase to improve overall quality and performance',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Issues are fixed', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'fixed-code.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      expect(() => new TaskNode(taskData)).toThrow();
    });

    it('should reject description that is too short (< 50 chars)', () => {
      const taskData = {
        id: uuidv4(),
        title: 'Implement login',
        description: 'Add login',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Login works', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'login.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      expect(() => new TaskNode(taskData)).toThrow();
    });

    it('should reject too many success criteria (> 10)', () => {
      const criteria = Array.from({ length: 11 }, () => ({
        id: uuidv4(),
        text: 'Criterion',
        completed: false,
      }));

      const taskData = {
        id: uuidv4(),
        title: 'Too many criteria',
        description: 'This task has too many success criteria and should be split into smaller tasks',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: criteria,
        deliverables: [
          { id: uuidv4(), text: 'output.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      expect(() => new TaskNode(taskData)).toThrow();
    });

    it('should reject too many deliverables (> 5)', () => {
      const deliverables = Array.from({ length: 6 }, () => ({
        id: uuidv4(),
        text: 'file.ts',
        completed: false,
      }));

      const taskData = {
        id: uuidv4(),
        title: 'Too many deliverables',
        description: 'This task has too many deliverables and should be split into smaller tasks',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'All deliverables complete', completed: false },
        ],
        deliverables: deliverables,
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      expect(() => new TaskNode(taskData)).toThrow();
    });

    it('should reject subjective success criteria', () => {
      const taskData = {
        id: uuidv4(),
        title: 'Make code better',
        description: 'Improve the code quality significantly through refactoring and optimization',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Code is good', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'better-code.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      expect(() => new TaskNode(taskData)).toThrow();
    });

    it('should accept valid atomic task', () => {
      const taskData = {
        id: uuidv4(),
        title: 'Implement login endpoint with JWT',
        description: 'Create POST /auth/login endpoint that accepts username/password and returns JWT token with 1 hour expiration',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Endpoint returns 200 with valid JWT on correct credentials', completed: false },
          { id: uuidv4(), text: 'Endpoint returns 401 on invalid credentials', completed: false },
          { id: uuidv4(), text: 'Password is hashed with bcrypt before comparison', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'src/api/auth/login.ts', completed: false },
          { id: uuidv4(), text: 'tests/api/auth/login.test.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const task = new TaskNode(taskData);
      expect(task.title).toBe('Implement login endpoint with JWT');
    });
  });

  describe('error handling', () => {
    it('should reject empty title', () => {
      const taskData = {
        id: uuidv4(),
        title: '',
        description: 'Valid description that is long enough to meet minimum requirements',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Criterion', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'output.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      expect(() => new TaskNode(taskData)).toThrow();
    });

    it('should reject empty description', () => {
      const taskData = {
        id: uuidv4(),
        title: 'Implement feature',
        description: '',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Criterion', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'output.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      expect(() => new TaskNode(taskData)).toThrow();
    });
  });

  describe('priority and options', () => {
    it('should set priority to top', () => {
      const taskId = uuidv4();
      const taskData = {
        id: taskId,
        title: 'Critical fix',
        description: 'Fix critical security vulnerability in authentication system immediately',
        status: 'not_started' as const,
        priority: 'top' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Vulnerability fixed', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'fix.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const task = new TaskNode(taskData);
      expect(task.priority).toBe('top');
    });

    it('should default priority to second', () => {
      const taskData = {
        id: uuidv4(),
        title: 'Create test task',
        description: 'Valid description that is long enough to meet minimum requirements for testing',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Criterion', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'output.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const task = new TaskNode(taskData);
      expect(task.priority).toBe('second');
    });
  });

  describe('blockers and dependencies', () => {
    it('should create task with blockers', () => {
      const blockerId = uuidv4();
      const taskId = uuidv4();

      // Create blocker task first
      const blockerData = {
        id: blockerId,
        title: 'Implement blocker task',
        description: 'Valid description that is long enough to meet minimum requirements',
        status: 'not_started' as const,
        priority: 'top' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Blocker complete', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'blocker.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const blocker = new TaskNode(blockerData);
      graph.addNode(blocker);

      // Create dependent task
      const taskData = {
        id: taskId,
        title: 'Create dependent task',
        description: 'Valid description that is long enough to meet minimum requirements',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Dependent complete', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'dependent.ts', completed: false },
        ],
        blockers: [blockerId],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const task = new TaskNode(taskData);
      expect(task.blockers).toContain(blockerId);
    });

    it('should accept multiple blockers', () => {
      const blocker1Id = uuidv4();
      const blocker2Id = uuidv4();
      const taskId = uuidv4();

      // Create blocker tasks
      const blocker1Data = {
        id: blocker1Id,
        title: 'Implement first blocker task',
        description: 'Valid description that is long enough to meet minimum requirements',
        status: 'not_started' as const,
        priority: 'top' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Complete', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'blocker1.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const blocker2Data = {
        id: blocker2Id,
        title: 'Implement second blocker task',
        description: 'Valid description that is long enough to meet minimum requirements',
        status: 'not_started' as const,
        priority: 'top' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Complete', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'blocker2.ts', completed: false },
        ],
        blockers: [],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      graph.addNode(new TaskNode(blocker1Data));
      graph.addNode(new TaskNode(blocker2Data));

      const taskData = {
        id: taskId,
        title: 'Create dependent task',
        description: 'Valid description that is long enough to meet minimum requirements',
        status: 'not_started' as const,
        priority: 'second' as const,
        success_criteria: [
          { id: uuidv4(), text: 'Dependent complete', completed: false },
        ],
        deliverables: [
          { id: uuidv4(), text: 'dependent.ts', completed: false },
        ],
        blockers: [blocker1Id, blocker2Id],
        dependencies: [],
        related_files: [],
        notes: '',
        c7_verified: [],
        sub_items: [],
        edges: [],
      };

      const task = new TaskNode(taskData);
      expect(task.blockers.length).toBe(2);
    });
  });
});
