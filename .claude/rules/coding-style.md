# General Coding Style

## JavaScript (ES Modules)

### Module Imports
```javascript
// Node.js built-ins first
import fs from 'node:fs';
import path from 'node:path';

// External packages
import chalk from 'chalk';

// Local imports (relative)
import { TaskGraph } from './task-graph.js';
```

### File Structure
```javascript
// 1. Imports
import fs from 'node:fs';

// 2. Constants
const DEFAULT_CONFIG = { /* ... */ };

// 3. Class/function definitions
export class MyClass {
  // ...
}

// 4. Exports
export default myFunction;
```

### Error Handling
```javascript
try {
  // Operation
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('File not found');
    process.exit(1);
  }
  throw error;
}
```

## Documentation

### JSDoc Comments
```javascript
/**
 * Creates a new task in the graph
 * @param {string} title - The task title
 * @param {Object} options - Task options
 * @param {string} [options.priority='later'] - Task priority
 * @returns {TaskNode} The created task node
 */
export function createTask(title, options = {}) {
  // ...
}
```

## Git Commit Messages

Format: `<type>(<scope>): <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Adding tests
- `docs`: Documentation
- `chore`: Maintenance

Examples:
```
feat(graph): add cycle detection algorithm
fix(storage): handle concurrent file access
test(task): add unit tests for TaskNode class
```
