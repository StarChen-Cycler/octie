/**
 * Create command - Create a new task with atomic task validation
 */

import { Command, Option } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { TaskNode } from '../../core/models/task-node.js';
import { getProjectPath, loadGraph, saveGraph, success, error, info, parseList } from '../utils/helpers.js';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
      .argParser((value: string, previous: string[]) => [...(previous || []), value])
      .env('OCTIE_SUCCESS_CRITERION')
      .makeOptionMandatory(true)
  )
  .addOption(
    new Option(
      '--deliverable <text>',
      'Specific output expected (can be specified multiple times)'
    )
      .argParser((value: string, previous: string[]) => [...(previous || []), value])
      .env('OCTIE_DELIVERABLE')
      .makeOptionMandatory(true)
  )
  .option('-p, --priority <level>', 'Task priority: top | second | later', 'second')
  .option('-b, --blockers <ids>', 'Comma-separated task IDs that block this task (creates graph edges for execution order)')
  .option('-d, --dependencies <ids>', 'Comma-separated task IDs this depends on (informational notes, NOT graph edges)')
  .addOption(
    new Option(
      '-f, --related-files <paths>',
      'File paths relevant to task (can be specified multiple times or comma-separated)'
    )
      .argParser((value: string, previous: string[]) => {
        // Support both comma-separated and multiple flag usage
        const items = value.includes(',') ? value.split(',').map(s => s.trim()) : [value.trim()];
        return [...(previous || []), ...items.filter(Boolean)];
      })
  )
  .addOption(
    new Option('-c, --c7-verified <library:notes>', 'C7 library verification (format: library-id or library-id:notes, can be specified multiple times)')
      .argParser((value: string, previous: string[]) => [...(previous || []), value])
  )
  .option('-n, --notes <text>', 'Additional context or comments')
  .option('--notes-file <path>', 'Read notes from file (multi-line notes support)')
  .option('-i, --interactive', 'Interactive mode with prompts')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (options, command) => {
    try {
      // Display atomic task policy on --help
      if (process.argv.includes('--help') || process.argv.includes('-h')) {
        displayAtomicTaskPolicy();
        return;
      }

      // Get global options (from parent) and merge with local options
      const globalOpts = command.parent?.opts() || {};
      const projectPath = await getProjectPath(options.project || globalOpts.project);
      const graph = await loadGraph(projectPath);

      // Parse multi-value options (argParser returns arrays)
      const successCriteria = options.successCriterion || [];
      const deliverables = options.deliverable || [];

      // Parse C7 verifications (format: library-id or library-id:notes)
      const c7Verifications = (options.c7Verified || []).map((entry: string) => {
              // Handle Windows Git Bash path conversion: "/path" becomes "C:/Program Files/Git/path"
              // Detect and strip the Git Bash prefix
              let cleanEntry = entry;
              const gitBashPrefix = /^[A-Za-z]:\/(\/)?Program Files\/Git\//;
              if (gitBashPrefix.test(entry)) {
                // Extract the original Unix path after "Program Files/Git/"
                const match = entry.match(/Program Files\/Git\/(.*)$/);
                if (match) {
                  cleanEntry = '/' + match[1];
                }
              }

              // Now parse the library-id:notes format
              const colonIndex = cleanEntry.indexOf(':');
              if (colonIndex === -1) {
                return {
                  library_id: cleanEntry.trim(),
                  verified_at: new Date().toISOString(),
                };
              }
              return {
                library_id: cleanEntry.substring(0, colonIndex).trim(),
                verified_at: new Date().toISOString(),
                notes: cleanEntry.substring(colonIndex + 1).trim(),
              };
            });

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

      // Handle notes: support both --notes and --notes-file
      let notes = '';
      if (options.notesFile) {
        // Read notes from file
        const notesPath = resolve(options.notesFile);
        if (!existsSync(notesPath)) {
          error(`Notes file not found: ${notesPath}`);
          process.exit(1);
        }
        try {
          notes = readFileSync(notesPath, 'utf-8').trim();
        } catch (err) {
          error(`Failed to read notes file: ${err instanceof Error ? err.message : 'Unknown error'}`);
          process.exit(1);
        }
      }
      if (options.notes) {
        // Append inline notes after file content (if both provided)
        if (notes) {
          notes += ' ' + options.notes.trim();
        } else {
          notes = options.notes.trim();
        }
      }

      // Build task data
      // Use graph.generateUniqueId() to ensure first 7 characters are unique
      const taskId = graph.generateUniqueId();
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
        related_files: options.relatedFiles || [],
        notes,
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
  console.log('');
  console.log(chalk.bold('Blockers vs Dependencies:'));
  console.log(chalk.cyan('  --blockers (-b)') + ': Creates GRAPH EDGES affecting execution order.');
  console.log('                Task A blocks Task B → A must complete before B starts.');
  console.log('                Used for topological sort, cycle detection, and task ordering.');
  console.log('');
  console.log(chalk.cyan('  --dependencies (-d)') + ': Informational NOTES only (no graph edges).');
  console.log('                  Documents WHY a task depends on another. Pure metadata.');
  console.log('                  Does NOT affect execution order or task traversal.');
  console.log('');
  console.log(chalk.yellow('  Example:'));
  console.log('    Task "Build Frontend" depends on Task "API Design".');
  console.log('    Use --blockers for the execution relationship.');
  console.log('    Use --dependencies to document the reason (e.g., "need API spec").');
});
