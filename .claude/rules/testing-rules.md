# Testing Standards

## Test Framework

Use Node.js built-in test runner (`node:test`).

## Test Organization

```
octie/
├── src/
│   └── task-graph.js
└── test/
    ├── task-graph.test.js
    ├── storage.test.js
    └── cli.test.js
```

## Test Patterns

### Unit Tests
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('TaskGraph', () => {
  test('should create empty graph', () => {
    const graph = new TaskGraph();
    assert.strictEqual(graph.size, 0);
  });

  test('should add task node', () => {
    const graph = new TaskGraph();
    const task = graph.addTask('test-task', { title: 'Test' });
    assert.ok(task);
    assert.strictEqual(graph.size, 1);
  });
});
```

### Integration Tests
```javascript
test('should persist tasks to storage', async () => {
  const storage = new TaskStorage('/tmp/test-tasks.json');
  const graph = new TaskGraph(storage);

  await graph.load();
  graph.addTask('task1', { title: 'Task 1' });
  await graph.save();

  const graph2 = new TaskGraph(storage);
  await graph2.load();
  assert.strictEqual(graph2.size, 1);
});
```

## Test Coverage Goals

- **Critical paths**: 100% coverage
- **Graph algorithms**: 100% coverage
- **File I/O**: 90%+ coverage
- **CLI commands**: 80%+ coverage
- **Overall**: > 80%

## Test Categories

1. **Unit Tests**: Individual functions/classes
2. **Integration Tests**: Component interactions
3. **CLI Tests**: Command-line interface
4. **Performance Tests**: Large dataset handling

## Running Tests

```bash
# All tests
npm test

# Specific test file
node --test test/task-graph.test.js

# Watch mode (if supported)
npm run test:watch
```

## Test Data Management

Use fixtures in `test/fixtures/`:
```
test/fixtures/
├── simple-graph.json
├── complex-graph.json
└── circular-dependency.json
```
