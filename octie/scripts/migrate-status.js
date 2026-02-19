#!/usr/bin/env node
/**
 * Migration script for wechat-miniapp project
 * Converts old status values to new automatic status model
 *
 * Old statuses: not_started, pending, in_progress, completed, blocked
 * New statuses: ready, in_progress, in_review, completed, blocked
 *
 * New status is calculated based on task items:
 * - ready: no items checked yet
 * - in_progress: some items completed
 * - in_review: all items complete (criteria + deliverables + need_fix)
 * - completed: manually approved
 * - blocked: has blockers
 */

import fs from 'node:fs';
import path from 'node:path';

const PROJECT_DIR = process.argv[2] || '.octie';
const projectPath = path.join(PROJECT_DIR, 'project.json');

console.log(`Migrating project: ${projectPath}\n`);

// Read project
const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

let taskCount = 0;
let statusChanges = 0;

for (const [taskId, task] of Object.entries(project.tasks)) {
  if (typeof task !== 'object' || !task.id) continue;
  taskCount++;

  const oldStatus = task.status;
  let newStatus = oldStatus;

  // Convert old statuses to new model
  if (oldStatus === 'not_started' || oldStatus === 'pending') {
    // Calculate based on items
    const hasCriteria = task.success_criteria && task.success_criteria.length > 0;
    const hasDeliverables = task.deliverables && task.deliverables.length > 0;
    const hasNeedFix = task.need_fix && task.need_fix.length > 0;

    const completedCriteria = task.success_criteria?.filter(c => c.completed).length || 0;
    const completedDeliverables = task.deliverables?.filter(d => d.completed).length || 0;
    const unresolvedNeedFix = task.need_fix?.filter(n => !n.completed).length || 0;

    const totalItems = (hasCriteria ? task.success_criteria.length : 0) +
                       (hasDeliverables ? task.deliverables.length : 0) +
                       (hasNeedFix ? task.need_fix.length : 0);
    const completedItems = completedCriteria + completedDeliverables;

    // Has blockers?
    if (task.blockers && task.blockers.length > 0) {
      newStatus = 'blocked';
    }
    // Has unresolved need_fix?
    else if (unresolvedNeedFix > 0) {
      newStatus = 'in_progress';
    }
    // All items complete?
    else if (totalItems > 0 && completedItems === totalItems) {
      newStatus = 'in_review';
    }
    // Some items complete?
    else if (completedItems > 0) {
      newStatus = 'in_progress';
    }
    // No items checked
    else {
      newStatus = 'ready';
    }
  }

  // Update status
  if (oldStatus !== newStatus) {
    console.log(`  ${taskId.slice(0,8)}: "${oldStatus}" → "${newStatus}"`);
    task.status = newStatus;
    task.updated_at = new Date().toISOString();
    statusChanges++;
  }
}

// Update metadata
project.metadata.updated_at = new Date().toISOString();

// Backup original
const backupPath = projectPath + '.bak.' + Date.now();
fs.copyFileSync(projectPath, backupPath);
console.log(`\nBackup created: ${backupPath}`);

// Write updated project
fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));

console.log(`\nMigration complete!`);
console.log(`  Tasks processed: ${taskCount}`);
console.log(`  Status changes: ${statusChanges}`);
console.log(`\nNew status model:`);
console.log(`  ready       - No items checked yet`);
console.log(`  in_progress - Some items completed`);
console.log(`  in_review  - All items complete (needs approval)`);
console.log(`  completed   - Manually approved`);
console.log(`  blocked    - Has blockers`);
