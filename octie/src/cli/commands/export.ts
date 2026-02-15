/**
 * Export command - Export project data
 */

import { Command } from 'commander';
import { getProjectPath, loadGraph, success, error } from '../utils/helpers.js';
import { formatProjectMarkdown } from '../output/markdown.js';
import { formatProjectJSON } from '../output/json.js';
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';

/**
 * Create the export command
 */
export const exportCommand = new Command('export')
  .description('Export project data to file')
  .option('-t, --type <format>', 'Export format: json, md (default: "json")')
  .option('-o, --output <path>', 'Output file path')
  .option('--project <path>', 'Path to Octie project directory')
  .action(async (options) => {
    try {
      const projectPath = await getProjectPath(options.project);
      const graph = await loadGraph(projectPath);

      let output: string;
      let defaultFileName: string;

      switch (options.type) {
        case 'md':
          output = formatProjectMarkdown(graph);
          defaultFileName = 'tasks.md';
          break;

        default:
          output = formatProjectJSON(graph);
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
