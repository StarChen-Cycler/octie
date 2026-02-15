/**
 * Export command - Export project data
 */

import { Command } from 'commander';
import { getProjectPath, loadGraph, success, error } from '../utils/helpers.js';
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';

/**
 * Create the export command
 */
export const exportCommand = new Command('export')
  .description('Export project data to file')
  .option('-f, --format <format>', 'Export format: json, md', 'json')
  .option('-o, --output <path>', 'Output file path')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (options) => {
    try {
      const projectPath = await getProjectPath(options.project);
      const graph = await loadGraph(projectPath);

      let output: string;
      let defaultFileName: string;

      switch (options.format) {
        case 'md':
          // Generate markdown export
          const tasks = graph.getAllTasks();
          const lines: string[] = [];

          const metadata = graph.metadata;
          lines.push(`# ${metadata.project_name}`);
          lines.push('');
          lines.push(`Exported: ${new Date().toISOString()}`);
          lines.push('');
          lines.push(`## Tasks (${tasks.length})`);
          lines.push('');

          for (const task of tasks) {
            const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
            lines.push(`### ${checkbox} ${task.title}`);
            lines.push(`**ID**: \`${task.id}\``);
            lines.push(`**Status**: ${task.status}`);
            lines.push(`**Priority**: ${task.priority}`);
            lines.push('');
            lines.push(task.description);
            lines.push('');
          }

          output = lines.join('\n');
          defaultFileName = 'tasks.md';
          break;

        default:
          output = JSON.stringify(graph.toJSON(), null, 2);
          defaultFileName = 'tasks.json';
          break;
      }

      // Write to file
      const outputPath = options.output || defaultFileName;
      writeFileSync(outputPath, output, 'utf-8');

      success(`Exported to ${chalk.cyan(outputPath)}`);

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Export failed');
      }
      process.exit(1);
    }
  });
