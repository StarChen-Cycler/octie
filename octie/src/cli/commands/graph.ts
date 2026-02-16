/**
 * Graph command - Graph analysis and validation operations
 */

import { Command } from 'commander';
import { getProjectPath, loadGraph, success, error } from '../utils/helpers.js';
import chalk from 'chalk';
import { detectCycle } from '../../core/graph/cycle.js';
import { topologicalSort } from '../../core/graph/sort.js';
import { getConnectedComponents } from '../../core/graph/traversal.js';

/**
 * Create the graph command
 */
export const graphCommand = new Command('graph')
  .description('Graph analysis and validation operations')
  .action(async (_options, command) => {
    try {
      // Get global options - traverse up to main program
      const globalOpts = command.parent?.opts() || {};
      const projectPath = await getProjectPath(globalOpts.project);
      const graph = await loadGraph(projectPath);

      console.log('');
      console.log(chalk.bold('Graph Statistics:'));
      console.log('');

      const totalTasks = graph.size;
      const rootTasks = graph.getRootTasks();
      const orphanTasks = graph.getOrphanTasks();

      console.log(`Total tasks: ${totalTasks}`);
      console.log(`Root tasks: ${rootTasks.length}`);
      console.log(`Orphan tasks: ${orphanTasks.length}`);
      console.log('');

      // Check for cycles
      const cycleResult = detectCycle(graph);
      if (cycleResult.hasCycle) {
        console.error(chalk.red(`⚠️  Graph contains ${cycleResult.cycles.length} cycle(s)!`));
        for (const cycle of cycleResult.cycles) {
          console.error(chalk.red(`  Cycle: ${cycle.join(' → ')}`));
        }
      } else {
        success('Graph is acyclic (valid DAG)');
      }

      // Topological sort
      const sortResult = topologicalSort(graph);
      if (sortResult.hasCycle) {
        console.error(chalk.red(`⚠️  Topological sort failed: cycle detected`));
      } else {
        console.log(chalk.green(`✓ Topological sort: ${sortResult.sorted.length} tasks ordered`));
      }

      // Connected components
      const components = getConnectedComponents(graph);
      console.log(`Connected components: ${components.length}`);

      process.exit(0);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Failed to analyze graph');
      }
      process.exit(1);
    }
  });

// Add subcommands
graphCommand
  .command('validate')
  .description('Validate graph structure')
  .action(async (_options, command) => {
    try {
      // Get global options - traverse up to main program (parent.parent)
      const globalOpts = command.parent?.parent?.opts() || {};
      const projectPath = await getProjectPath(globalOpts.project);
      const graph = await loadGraph(projectPath);

      const cycleResult = detectCycle(graph);

      if (cycleResult.hasCycle) {
        console.error(chalk.red(`Graph validation failed: ${cycleResult.cycles.length} cycle(s) detected`));
        process.exit(1);
      } else {
        success('Graph validation passed: No cycles detected');
        process.exit(0);
      }
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Validation failed');
      }
      process.exit(1);
    }
  });

graphCommand
  .command('cycles')
  .description('Detect and display cycles in the graph')
  .action(async (_options, command) => {
    try {
      // Get global options - traverse up to main program (parent.parent)
      const globalOpts = command.parent?.parent?.opts() || {};
      const projectPath = await getProjectPath(globalOpts.project);
      const graph = await loadGraph(projectPath);

      const result = detectCycle(graph);

      if (result.hasCycle) {
        console.log('');
        console.error(chalk.red.bold(`⚠️  Found ${result.cycles.length} cycle(s):`));
        console.log('');

        for (let i = 0; i < result.cycles.length; i++) {
          const cycle = result.cycles[i];
          if (cycle) {
            console.error(chalk.red(`${i + 1}. ${cycle.join(' → ')}`));

            // Show task titles
            for (const taskId of cycle) {
              const task = graph.getNode(taskId);
              if (task) {
                console.error(chalk.gray(`   - ${task.title}`));
              }
            }
            console.log('');
          }
        }

        process.exit(1);
      } else {
        success('No cycles detected in graph');
        process.exit(0);
      }
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error('Cycle detection failed');
      }
      process.exit(1);
    }
  });
