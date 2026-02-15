/**
 * Get command - Retrieve and display task details
 */

import { Command } from 'commander';
import { TaskNode } from '../../core/models/task-node.js';
import { getProjectPath, loadGraph, formatStatus, formatPriority } from '../utils/helpers.js';
import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Format task details as markdown
 */
function formatTaskAsMarkdown(task: TaskNode): string {
  const lines: string[] = [];

  lines.push(`# ${task.title}`);
  lines.push('');
  lines.push(`**ID**: \`${task.id}\``);
  lines.push(`**Status**: ${task.status}`);
  lines.push(`**Priority**: ${task.priority}`);
  lines.push('');

  lines.push('## Description');
  lines.push(task.description);
  lines.push('');

  if (task.success_criteria.length > 0) {
    lines.push('## Success Criteria');
    for (const sc of task.success_criteria) {
      const checkbox = sc.completed ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${sc.text}`);
    }
    lines.push('');
  }

  if (task.deliverables.length > 0) {
    lines.push('## Deliverables');
    for (const d of task.deliverables) {
      const checkbox = d.completed ? '[x]' : '[ ]';
      const fileRef = d.file_path ? ` (${d.file_path})` : '';
      lines.push(`- ${checkbox} ${d.text}${fileRef}`);
    }
    lines.push('');
  }

  if (task.blockers.length > 0) {
    lines.push(`**Blocked by**: ${task.blockers.join(', ')}`);
    lines.push('');
  }

  if (task.dependencies.length > 0) {
    lines.push(`**Depends on**: ${task.dependencies.join(', ')}`);
    lines.push('');
  }

  if (task.related_files.length > 0) {
    lines.push('## Related Files');
    for (const file of task.related_files) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  if (task.c7_verified.length > 0) {
    lines.push('## Library Verifications');
    for (const c7 of task.c7_verified) {
      lines.push(`- ${c7.library_id} (${c7.verified_at})`);
      if (c7.notes) {
        lines.push(`  - ${c7.notes}`);
      }
    }
    lines.push('');
  }

  if (task.notes) {
    lines.push('## Notes');
    lines.push(task.notes);
    lines.push('');
  }

  lines.push(`**Created**: ${task.created_at}`);
  lines.push(`**Updated**: ${task.updated_at}`);
  if (task.completed_at) {
    lines.push(`**Completed**: ${task.completed_at}`);
  }

  return lines.join('\n');
}

/**
 * Format task details as table
 */
function formatTaskAsTable(task: TaskNode): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold(task.title));
  lines.push(chalk.gray(`ID: ${task.id}`));
  lines.push('');

  // Basic info table
  const infoTable = new Table({
    colWidths: [15, 50],
    wordWrap: true,
  });

  infoTable.push(
    [chalk.gray('Status:'), formatStatus(task.status)],
    [chalk.gray('Priority:'), formatPriority(task.priority)],
    [chalk.gray('Created:'), task.created_at],
    [chalk.gray('Updated:'), task.updated_at]
  );

  if (task.completed_at) {
    infoTable.push([chalk.gray('Completed:'), task.completed_at]);
  }

  lines.push(infoTable.toString());
  lines.push('');

  // Description
  lines.push(chalk.bold('Description:'));
  lines.push(task.description);
  lines.push('');

  // Success criteria
  if (task.success_criteria.length > 0) {
    lines.push(chalk.bold('Success Criteria:'));
    for (const sc of task.success_criteria) {
      const symbol = sc.completed ? chalk.green('✓') : chalk.gray('○');
      lines.push(`  ${symbol} ${sc.text}`);
    }
    lines.push('');
  }

  // Deliverables
  if (task.deliverables.length > 0) {
    lines.push(chalk.bold('Deliverables:'));
    for (const d of task.deliverables) {
      const symbol = d.completed ? chalk.green('✓') : chalk.gray('○');
      const fileRef = d.file_path ? chalk.gray(` (${d.file_path})`) : '';
      lines.push(`  ${symbol} ${d.text}${fileRef}`);
    }
    lines.push('');
  }

  // Relationships
  if (task.blockers.length > 0) {
    lines.push(chalk.bold('Blocked by:'), chalk.cyan(task.blockers.join(', ')));
    lines.push('');
  }

  if (task.dependencies.length > 0) {
    lines.push(chalk.bold('Depends on:'), chalk.cyan(task.dependencies.join(', ')));
    lines.push('');
  }

  // Related files
  if (task.related_files.length > 0) {
    lines.push(chalk.bold('Related Files:'));
    for (const file of task.related_files) {
      lines.push(`  - ${chalk.cyan(file)}`);
    }
    lines.push('');
  }

  // Notes
  if (task.notes) {
    lines.push(chalk.bold('Notes:'));
    lines.push(task.notes);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Create the get command
 */
export const getCommand = new Command('get')
  .description('Get task details')
  .argument('<id>', 'Task ID')
  .option('-f, --format <format>', 'Output format: json, md, table', 'table')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (id, options) => {
    try {
      // Load project
      const projectPath = await getProjectPath(options.project);
      const graph = await loadGraph(projectPath);

      // Find task
      const task = graph.getNode(id);

      if (!task) {
        console.error(chalk.red(`Task not found: ${id}`));
        process.exit(1);
      }

      // Format output
      switch (options.format) {
        case 'json':
          console.log(JSON.stringify(task, null, 2));
          break;

        case 'md':
          console.log(formatTaskAsMarkdown(task));
          break;

        case 'table':
        default:
          console.log(formatTaskAsTable(task));
          break;
      }

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        console.error(chalk.red(`Error: ${err.message}`));
      } else {
        console.error(chalk.red('Failed to get task'));
      }
      process.exit(1);
    }
  });
