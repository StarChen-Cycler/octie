# Octie Coding Standards

## Project-Specific Rules

### Graph Data Structure

**Task Node Representation:**
```javascript
// Each task is a node with edges pointing to dependent tasks
class TaskNode {
  constructor(id, data) {
    this.id = id;
    this.data = {
      title: data.title,
      description: data.description,
      status: 'not_started', // not_started | pending | in_progress | completed | blocked
      priority: 'later',     // top | second | later
      success_criteria: [],
      blockers: [],          // Task IDs that block this task
      related_files: [],
      c7_verified: [],
      deliverables: [],
      sub_items: [],
      dependencies: [],      // Task IDs this depends on
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.edges = []; // Outgoing edges (task IDs that depend on this)
  }
}
```

**Graph Operations:**
- Use adjacency list for O(1) edge lookups
- Maintain index map: `Map<taskId, TaskNode>`
- Cache topological sort results
- Detect cycles using DFS with recursion stack

### Storage Structure

**File Organization:**
```
.octie/
├── tasks.json          # Main task storage
├── tasks.json.bak      # Backup (rotated)
├── config.json         # Project configuration
└── index.json          # Task ID index for fast lookup
```

**Atomic Writes:**
1. Write to temp file
2. Validate JSON structure
3. Rename to actual file
4. Keep last N backups

### CLI Command Patterns

**Command Structure:**
```javascript
// Use commander for CLI
import { Command } from 'commander';

const program = new Command();

program
  .command('create')
  .description('Create a new task')
  .option('-i, --interactive', 'Interactive mode')
  .option('-t, --title <title>', 'Task title')
  .option('-p, --priority <priority>', 'Priority: top|second|later')
  .action(createTask);
```

**Error Handling:**
- Always validate input before processing
- Provide actionable error messages
- Use chalk for colored output
- Exit with appropriate codes (0 = success, 1 = error)

### Performance Requirements

**Lookup Performance:**
- Single task: Use Map for O(1) lookup
- All tasks: Lazy load from JSON
- Graph operations: Cache results

**Scale Targets:**
- 1000+ tasks supported
- < 10ms for single task lookup
- < 100ms for full graph load

### Testing Standards

**Unit Tests:**
```javascript
// Use Node.js built-in test runner
import { test, describe, it } from 'node:test';
import assert from 'node:assert';

describe('TaskGraph', () => {
  it('should detect cycles', () => {
    const graph = new TaskGraph();
    // ... test code
    assert.strictEqual(graph.hasCycle(), true);
  });
});
```

**Test Coverage:**
- Aim for > 80% coverage
- Test all graph algorithms
- Test file I/O operations
- Test CLI commands

### Code Style

**Naming Conventions:**
- Files: `kebab-case.js`
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

**Module Structure:**
```javascript
// src/task-graph.js
export class TaskGraph {
  // Graph operations
}

// src/storage.js
export class TaskStorage {
  // File I/O
}

// src/cli.js
export class CLI {
  // Command handling
}
```

### Web API Standards

**RESTful Endpoints:**
```
GET    /api/tasks       # List all tasks
GET    /api/tasks/:id   # Get task details
POST   /api/tasks       # Create task
PUT    /api/tasks/:id   # Update task
DELETE /api/tasks/:id   # Delete task
POST   /api/tasks/:id/merge  # Merge tasks
GET    /api/graph       # Get graph structure
```

**Response Format:**
```javascript
// Success
{
  success: true,
  data: { /* task data */ }
}

// Error
{
  success: false,
  error: {
    code: 'TASK_NOT_FOUND',
    message: 'Task with ID xxx not found'
  }
}
```

## Critical Rules

1. **Never modify JSON directly** - Always use TaskStorage class
2. **Always validate graph structure** - After any modification
3. **Keep backups** - Before destructive operations
4. **Use atomic writes** - Prevent data corruption
5. **Test graph algorithms** - Cycle detection, topological sort
6. **Handle large datasets** - Lazy loading, pagination
