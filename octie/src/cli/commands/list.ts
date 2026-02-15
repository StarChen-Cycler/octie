/**
 * List command - List tasks with filtering options
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import type { TaskGraphStore } from '../../core/graph/index.js';
import { TaskNode } from '../../core/models/task-node.js';
import { getProjectPath, loadGraph, formatStatus, formatPriority } from '../utils/helpers.js';
import chalk from 'chalk';
// @ts-ignore - archy doesn't have types
import archy from 'archy';

/**
 * Format task as table row
 */
function formatTaskAsRow(task: TaskNode, showId: boolean = true): string[] {
  const row: string[] = [];

  if (showId) {
    row.push(task.id.substring(0, 8));
  }

  row.push(
    formatStatus(task.status),
    formatPriority(task.priority),
    task.title.substring(0, 40)
  );

  return row;
}

/**
 * Format task as markdown
 */
function formatTaskAsMarkdown(task: TaskNode): string {
  const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
  const status = formatStatus(task.status);
  const priority = formatPriority(task.priority);

  return `## ${checkbox} ${task.title}\n` +
         `**ID**: \`${task.id}\`\n` +
         `**Status**: ${status}\n` +
         `**Priority**: ${priority}\n` +
         `**Description**: ${task.description.substring(0, 100)}...\n`;
}

/**
 * Build tree structure for display
 */
function buildTree(graph: TaskGraphStore, rootTasks: string[]): any {
  const nodes: Record<string, any> = {};

  for (const taskId of graph.getAllTaskIds()) {
    const task = graph.getNode(taskId);
    if (task) {
      nodes[taskId] = {
        label: `${task.title} ${chalk.gray(`(${task.status})`)}`,
        nodes: [],
      };
    }
  }

  const roots: any[] = [];
  const visited = new Set<string>();

  function visit(taskId: string): any {
    if (visited.has(taskId)) {
      return nodes[taskId];
    }
    visited.add(taskId);

    const node = { ...nodes[taskId] };

    // Get outgoing edges (dependents)
    const dependents = graph.getOutgoingEdges(taskId);
    for (const dependentId of dependents) {
      const child = visit(dependentId);
      if (child) {
        node.nodes.push(child);
      }
    }

    return node;
  }

  for (const rootId of rootTasks) {
    roots.push(visit(rootId));
  }

  return roots;
}

/**
 * Create the list command
 */
export const listCommand = new Command('list')
  .description('List tasks with filtering options')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('-f, --format <format>', 'Output format: table, json, md', 'table')
  .option('--graph', 'Show graph structure')
  .option('--tree', 'Show tree view')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (options) => {
    try {
      // Load project
      const projectPath = await getProjectPath(options.project);
      const graph = await loadGraph(projectPath);

      // Apply filters
      let tasks = graph.getAllTasks();

      if (options.status) {
        tasks = tasks.filter(task => task.status === options.status);
      } else if (options.priority) {
        tasks = tasks.filter(task => task.priority === options.priority);
      }

      if (tasks.length === 0) {
        console.log(chalk.yellow('No tasks found'));
        process.exit(0);
      }

      // Graph structure view
      if (options.graph) {
        console.log(chalk.bold('Graph Structure:'));
        console.log('');

        for (const task of tasks) {
          const incoming = graph.getIncomingEdges(task.id);
          const outgoing = graph.getOutgoingEdges(task.id);

          console.log(chalk.cyan(task.id.substring(0, 8)), '-', task.title);

          if (incoming.length > 0) {
            console.log(chalk.gray('  Blocked by:'), incoming.map(id => chalk.cyan(id.substring(0, 8))).join(', '));
          }

          if (outgoing.length > 0) {
            console.log(chalk.gray('  Enables:'), outgoing.map(id => chalk.cyan(id.substring(0, 8))).join(', '));
          }

          console.log('');
        }

        process.exit(0);
      }

      // Tree view
      if (options.tree) {
        const rootTasks = graph.getRootTasks();
        const tree = buildTree(graph, rootTasks);

        console.log(chalk.bold('Task Tree:'));
        console.log('');
        console.log(archy(tree));
        process.exit(0);
      }

      // Format output
      switch (options.format) {
        case 'json':
          console.log(JSON.stringify(tasks, null, 2));
          break;

        case 'md':
          console.log(`# Tasks (${tasks.length})\n`);
          for (const task of tasks) {
            console.log(formatTaskAsMarkdown(task));
          }
          break;

        case 'table':
        default:
          const table = new Table({
            head: [
              chalk.gray('ID'),
              chalk.gray('Status'),
              chalk.gray('Priority'),
              chalk.gray('Title'),
            ].map(h => chalk.bold(h)),
            colWidths: [10, 15, 10, 40],
            wordWrap: true,
          });

          for (const task of tasks) {
            table.push(formatTaskAsRow(task));
          }

          console.log(table.toString());
          console.log(chalk.gray(`Total: ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`));
          break;
      }

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        console.error(chalk.red(`Error: ${err.message}`));
      } else {
        console.error(chalk.red('Failed to list tasks'));
      }
      process.exit(1);
    }
  });
