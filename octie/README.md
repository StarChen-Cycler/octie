# Octie

A graph-based task management system with CLI and web UI.

## Overview

Octie is a project-oriented task management tool that uses directed graphs to represent task dependencies. It provides both a command-line interface for power users and a web interface for visualization.

## Features

- **Graph-based task structure**: Tasks are nodes in a directed graph (DAG with optional loops)
- **Atomic task definitions**: Each task has comprehensive context including:
  - Success criteria (quantitative, measurable)
  - Deliverables (specific outputs)
  - Blockers and dependencies
  - Related files and notes
  - Auto-managed timestamps (created_at, updated_at, completed_at)
- **Fast retrieval**: JSON-based storage with indexing for O(1) lookups
- **Dual output formats**: Markdown for AI consumption, JSON for visualization
- **CLI + Web UI**: Command-line tool with web-based visualization
- **Graph operations**: Add, remove, reconnect edges; cut, insert, merge tasks
- **Topological sorting**: Validated task ordering with cycle detection

## Installation

```bash
npm install -g octie
```

## Quick Start

```bash
# Initialize a new project
octie init

# Create a task (interactive mode recommended)
octie create --interactive

# Create with flags
octie create \
  --title "Setup database" \
  --description "Create PostgreSQL database with migrations" \
  --priority top \
  --success-criterion "Database accepts connections" \
  --success-criterion "Migrations run successfully" \
  --deliverable "src/db/schema.sql"

# List tasks
octie list --status pending --priority top

# Get task details (multiple formats)
octie get <task-id>              # Default table format
octie get <task-id> --format md   # Markdown for AI
octie get <task-id> --format json # JSON for parsing

# Update task
octie update <task-id> --status in_progress

# Delete task
octie delete <task-id> --reconnect --force

# Start web UI
octie serve
```

## Development

```bash
# Clone repository
git clone <repo-url>
cd task-driver/octie

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run CLI in development mode
node dist/cli/index.js --help

# Start web UI server
npm run serve
```

## Project Structure

```
octie/
├── src/                      # Source files
│   ├── cli/                  # CLI interface
│   │   ├── commands/         # CLI commands (init, create, list, get, update, delete, merge, export, import, graph, serve)
│   │   └── utils/            # CLI helpers
│   ├── core/                 # Core functionality
│   │   ├── graph/            # Graph data structures and algorithms
│   │   ├── models/           # Task node model
│   │   └── storage/          # File I/O and atomic writes
│   └── types/                # TypeScript type definitions
├── tests/                    # Test files
│   └── unit/cli/commands/    # CLI command tests
├── web-ui/                   # Web UI (React + Vite)
├── dist/                     # Compiled JavaScript
├── cli.js                    # CLI entry point
├── server.js                 # Web UI server
└── package.json
```

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `octie init` | Initialize new project | `octie init --project ./my-project` |
| `octie create` | Create new task | `octie create --interactive` |
| `octie list` | List tasks | `octie list --status pending --priority top` |
| `octie get` | Get task details | `octie get <id> --format md` |
| `octie update` | Update task | `octie update <id> --status completed` |
| `octie delete` | Delete task | `octie delete <id> --reconnect --force` |
| `octie merge` | Merge tasks | `octie merge <source-id> <target-id>` |
| `octie export` | Export project | `octie export --format json --output backup.json` |
| `octie import` | Import tasks | `octie import backup.json --merge` |
| `octie graph` | Graph operations | `octie graph validate` |
| `octie serve` | Start web UI | `octie serve --port 3000` |

## Global Options

| Option | Description |
|--------|-------------|
| `--project <path>` | Specify project directory (default: current directory) |
| `--format <type>` | Output format: table, json, md |

## Data Format

Tasks are stored in `.octie/project.json` with the following structure:

```json
{
  "version": "1.0.0",
  "format": "octie-project",
  "metadata": {
    "project_name": "my-project",
    "version": "1.0.0",
    "created_at": "2026-02-16T12:00:00Z",
    "updated_at": "2026-02-16T14:30:00Z",
    "task_count": 5
  },
  "tasks": {
    "task-id": {
      "id": "uuid",
      "title": "Task title",
      "description": "Detailed description",
      "status": "not_started|pending|in_progress|completed|blocked",
      "priority": "top|second|later",
      "success_criteria": [...],
      "deliverables": [...],
      "blockers": [],
      "dependencies": [],
      "edges": [],
      "related_files": [],
      "notes": "",
      "created_at": "ISO-8601",
      "updated_at": "ISO-8601",
      "completed_at": "ISO-8601|null"
    }
  },
  "edges": [
    {"from": "task-id-1", "to": "task-id-2", "type": "blocks"}
  ],
  "indexes": {
    "byStatus": {...},
    "byPriority": {...},
    "rootTasks": [...],
    "orphans": []
  }
}
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run tests/unit/cli/commands/create.test.ts

# Run with coverage
npm run test:coverage

# Run benchmarks
npm run test:bench
```

**Test Coverage**: 388 tests passing (8 skipped for unimplemented features)

## Status

**Current Version**: 1.0.0 (in development)

**Completed**:
- ✅ Core data structures (TaskNode, TaskGraphStore)
- ✅ Storage layer with atomic writes and backup rotation
- ✅ Graph algorithms (topological sort, cycle detection, traversal)
- ✅ CLI commands (init, create, list, get, update, delete, merge, export, import, graph, serve)
- ✅ Unit tests (388 passing)

**In Progress**:
- 🔄 Web UI (React + ReactFlow)
- 🔄 Integration tests
- 🔄 Performance benchmarks

**Planned**:
- 📋 Real-time collaboration (WebSocket)
- 📋 Task templates
- 📋 Advanced filtering and search
- 📋 Export to other formats (PDF, CSV)

## License

MIT
