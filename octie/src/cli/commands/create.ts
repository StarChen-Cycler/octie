/**
 * Create command - Create a new task with atomic task validation
 */

import { Command, Option } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { TaskNode } from '../../core/models/task-node.js';
import { getProjectPath, loadGraph, saveGraph, success, error, info, parseList } from '../utils/helpers.js';
import chalk from 'chalk';

/**
 * Display atomic task policy help
 */
function displayAtomicTaskPolicy(): void {
  console.log('');
  console.log(chalk.red.bold('⚠️  ATOMIC TASK POLICY ⚠️'));
  console.log('');
  console.log(chalk.yellow('Tasks MUST be atomic - small, specific, executable, and verifiable.'));
  console.log('');
  console.log(chalk.bold('What is an Atomic Task?'));
  console.log('  • Single purpose: Does ONE thing well');
  console.log('  • Executable: Can be completed in 2-8 hours (typical) or 1-2 days (max)');
  console.log('  • Verifiable: Has quantitative success criteria');
  console.log('  • Independent: Minimizes dependencies on other tasks');
  console.log('');
  console.log(chalk.red.bold('❌ BAD Examples (too vague or too large):'));
  console.log(chalk.gray('  • "Fix authentication" (too vague - what specifically?)'));
  console.log(chalk.gray('  • "Build auth system" (too large - split into: login, signup, password reset, etc.)'));
  console.log(chalk.gray('  • "Improve performance" (not measurable - what metric?)'));
  console.log(chalk.gray('  • "Code review" (not atomic - which files? what criteria?)'));
  console.log('');
  console.log(chalk.green.bold('✅ GOOD Examples (atomic):'));
  console.log(chalk.gray('  • "Implement login endpoint with JWT" (specific, testable)'));
  console.log(chalk.gray('  • "Add bcrypt password hashing with 10 rounds" (clear, verifiable)'));
  console.log(chalk.gray('  • "Write unit tests for User model" (specific scope)'));
  console.log(chalk.gray('  • "Fix NPE in AuthService.login method" (atomic bug fix)'));
  console.log('');
  console.log(chalk.bold('Validation Rules:'));
  console.log('  • Title: 1-200 chars, must contain action verb');
  console.log('  • Description: 50-10000 chars, must be specific');
  console.log('  • Success Criteria: 1-10 items, must be quantitative');
  console.log('  • Deliverables: 1-5 items, must be specific outputs');
  console.log('');
  console.log(chalk.yellow('If your task is rejected as non-atomic:'));
  console.log('  → Split it into smaller, focused tasks');
  console.log('  → Be more specific about what will be done');
  console.log('  → Define measurable success criteria');
  console.log('  → Limit scope to 2-8 hours of work');
  console.log('');
}

/**
 * Create the create command
 */
export const createCommand = new Command('create')
  .description('Create a new atomic task in the project')
  .addOption(
    new Option('--title <string>', 'Task title (max 200 chars). Must contain action verb')
      .env('OCTIE_TASK_TITLE')
      .makeOptionMandatory(true)
  )
  .addOption(
    new Option(
      '--description <string>',
      'Detailed task description (min 50 chars, max 10000)'
    )
      .env('OCTIE_TASK_DESCRIPTION')
      .makeOptionMandatory(true)
  )
  .addOption(
    new Option(
      '--success-criterion <text>',
      'Quantitative success criterion (can be specified multiple times)'
    )
      .env('OCTIE_SUCCESS_CRITERION')
      .makeOptionMandatory(true)
  )
  .addOption(
    new Option(
      '--deliverable <text>',
      'Specific output expected (can be specified multiple times)'
    )
      .env('OCTIE_DELIVERABLE')
      .makeOptionMandatory(true)
  )
  .option('-p, --priority <level>', 'Task priority: top | second | later', 'second')
  .option('-b, --blockers <ids>', 'Comma-separated task IDs that block this task')
  .option('-d, --dependencies <ids>', 'Comma-separated task IDs this depends on')
  .option('-f, --related-files <paths>', 'Comma-separated file paths relevant to task')
  .option('-c, --c7-verified <library:notes>', 'C7 library verification (format: library-id or library-id:notes, can be specified multiple times)')
  .option('-n, --notes <text>', 'Additional context or comments')
  .option('-i, --interactive', 'Interactive mode with prompts')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (options) => {
    try {
      // Display atomic task policy on --help
      if (process.argv.includes('--help') || process.argv.includes('-h')) {
        displayAtomicTaskPolicy();
        return;
      }

      // Load project
      const projectPath = await getProjectPath(options.project);
      const graph = await loadGraph(projectPath);

      // Parse multi-value options
      const successCriteria = options.successCriterion
        ? Array.isArray(options.successCriterion)
          ? options.successCriterion
          : [options.successCriterion]
        : [];

      const deliverables = options.deliverable
        ? Array.isArray(options.deliverable)
          ? options.deliverable
          : [options.deliverable]
        : [];

      // Parse C7 verifications (format: library-id or library-id:notes)
      const c7Verifications = options.c7Verified
        ? (Array.isArray(options.c7Verified) ? options.c7Verified : [options.c7Verified])
            .map((entry: string) => {
              const colonIndex = entry.indexOf(':');
              if (colonIndex === -1) {
                return {
                  library_id: entry.trim(),
                  verified_at: new Date().toISOString(),
                };
              }
              return {
                library_id: entry.substring(0, colonIndex).trim(),
                verified_at: new Date().toISOString(),
                notes: entry.substring(colonIndex + 1).trim(),
              };
            })
        : [];

      // Validate required fields
      if (!options.title || options.title.trim().length === 0) {
        error('Title is required and cannot be empty');
        process.exit(1);
      }

      if (!options.description || options.description.trim().length === 0) {
        error('Description is required and cannot be empty');
        process.exit(1);
      }

      if (successCriteria.length === 0) {
        error('At least one success criterion is required (--success-criterion)');
        process.exit(1);
      }

      if (deliverables.length === 0) {
        error('At least one deliverable is required (--deliverable)');
        process.exit(1);
      }

      // Build task data
      const taskId = uuidv4();
      const taskData = {
        id: taskId,
        title: options.title.trim(),
        description: options.description.trim(),
        status: 'not_started' as const,
        priority: options.priority as 'top' | 'second' | 'later',
        success_criteria: successCriteria.map((text: string) => ({
          id: uuidv4(),
          text: text.trim(),
          completed: false,
        })),
        deliverables: deliverables.map((text: string) => ({
          id: uuidv4(),
          text: text.trim(),
          completed: false,
        })),
        blockers: parseList(options.blockers || ''),
        dependencies: parseList(options.dependencies || ''),
        related_files: parseList(options.relatedFiles || ''),
        notes: (options.notes || '').trim(),
        c7_verified: c7Verifications,
        sub_items: [],
        edges: [],
      };

      // Create task (includes atomic validation)
      let task: TaskNode;
      try {
        task = new TaskNode(taskData);
      } catch (err) {
        if (err instanceof Error) {
          error(err.message);
          if (err.message.includes('atomic') || err.message.includes('vague')) {
            console.log('');
            info('See atomic task policy above for guidance');
            displayAtomicTaskPolicy();
          }
        } else {
          error('Failed to create task');
        }
        process.exit(1);
      }

      // Validate blockers and dependencies exist
      const allTaskIds = graph.getAllTaskIds();
      const invalidBlockers = task.blockers.filter(id => !allTaskIds.includes(id));
      const invalidDependencies = task.dependencies.filter(id => !allTaskIds.includes(id));

      if (invalidBlockers.length > 0) {
        error(`Blocker task IDs not found: ${invalidBlockers.join(', ')}`);
        process.exit(1);
      }

      if (invalidDependencies.length > 0) {
        error(`Dependency task IDs not found: ${invalidDependencies.join(', ')}`);
        process.exit(1);
      }

      // Add to graph
      graph.addNode(task);

      // Create edges from blockers to this task
      for (const blockerId of task.blockers) {
        graph.addEdge(blockerId, taskId);
      }

      // Save
      await saveGraph(projectPath, graph);

      // Success
      success(`Task created: ${chalk.cyan(taskId)}`);
      info(`Title: ${task.title}`);
      info(`Priority: ${chalk.yellow(task.priority)}`);

      if (task.blockers.length > 0) {
        info(`Blocked by: ${task.blockers.map(id => chalk.cyan(id)).join(', ')}`);
      }

      console.log('');
      console.log(chalk.gray('View task:'), chalk.gray(`octie get ${taskId}`));

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to create task');
      }
      process.exit(1);
    }
  });

// Add help text to display atomic task policy when --help is shown
createCommand.on('--help', () => {
  displayAtomicTaskPolicy();
});
