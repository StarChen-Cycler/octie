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

## CLI Commands Reference

### Global Options

These options apply to all commands:

| Option | Description |
|--------|-------------|
| `--project <path>` | Specify project directory (default: current directory) |
| `--format <type>` | Output format: `table`, `json`, `md` |
| `--verbose` | Show detailed output |
| `--quiet` | Suppress non-essential output |

### `octie init`

Initialize a new Octie project in the current or specified directory.

```bash
octie init                           # Initialize in current directory
octie init --project ./my-project    # Initialize in specific directory
```

**Options:**
| Flag | Description |
|------|-------------|
| `--project <path>` | Directory to initialize (default: current) |

### `octie create`

Create a new atomic task. All required fields must be provided.

```bash
# Interactive mode (recommended)
octie create --interactive

# Command-line mode (all required fields)
octie create \
  --title "Implement user authentication" \
  --description "Create JWT-based authentication system with login, logout, and token refresh endpoints" \
  --success-criterion "Login returns valid JWT on correct credentials" \
  --success-criterion "Token refresh works correctly" \
  --deliverable "src/auth/login.ts" \
  --deliverable "tests/auth/login.test.ts" \
  --priority top
```

**Required Options:**
| Flag | Description | Validation |
|------|-------------|------------|
| `--title <string>` | Task title | 1-200 chars, must contain action verb |
| `--description <string>` | Detailed description | 50-10000 chars |
| `--success-criterion <text>` | Quantitative success criterion (repeatable) | Min 1, Max 10 |
| `--deliverable <text>` | Expected output (repeatable) | Min 1, Max 5 |

**Optional Options:**
| Flag | Description |
|------|-------------|
| `--priority <level>` | `top`, `second`, or `later` (default: `second`) |
| `--blockers <ids>` | Comma-separated task IDs that block this task |
| `--dependencies <ids>` | Comma-separated soft dependency task IDs |
| `--related-files <paths>` | Comma-separated file paths |
| `--notes <text>` | Additional context |
| `--interactive` | Use interactive prompts |

**Atomic Task Validation:**
Tasks must be specific, executable, and verifiable. The CLI will reject:
- Titles without action verbs (implement, create, fix, etc.)
- Vague titles ("fix stuff", "do things")
- Descriptions under 50 characters
- More than 10 success criteria (suggests non-atomic)
- More than 5 deliverables (suggests non-atomic)
- Subjective criteria ("make it better", "good performance")

### `octie list`

List all tasks with optional filtering.

```bash
octie list                           # List all tasks
octie list --status pending          # Filter by status
octie list --priority top            # Filter by priority
octie list --tree                    # Show as tree view
octie list --graph                   # Show graph structure
octie list --format json             # JSON output
```

**Options:**
| Flag | Description |
|------|-------------|
| `--status <status>` | Filter by: `not_started`, `pending`, `in_progress`, `completed`, `blocked` |
| `--priority <level>` | Filter by: `top`, `second`, `later` |
| `--format <type>` | Output format: `table`, `json`, `md` |
| `--tree` | Display as hierarchical tree |
| `--graph` | Display graph structure |

### `octie get`

Get detailed information about a specific task.

```bash
octie get <task-id>                  # Table format (default)
octie get <task-id> --format md      # Markdown format
octie get <task-id> --format json    # JSON format
```

**Options:**
| Flag | Description |
|------|-------------|
| `--format <type>` | Output format: `table`, `json`, `md` |

### `octie update`

Update an existing task.

```bash
octie update <task-id> --status in_progress
octie update <task-id> --priority top
octie update <task-id> --complete-criterion <criterion-id>
octie update <task-id> --complete-deliverable <deliverable-id>
octie update <task-id> --notes "Additional context"
```

**Options:**
| Flag | Description |
|------|-------------|
| `--status <status>` | Set status: `not_started`, `pending`, `in_progress`, `completed`, `blocked` |
| `--priority <level>` | Set priority: `top`, `second`, `later` |
| `--add-success-criterion <text>` | Add a new success criterion |
| `--complete-criterion <id>` | Mark criterion as complete |
| `--add-deliverable <text>` | Add a new deliverable |
| `--complete-deliverable <id>` | Mark deliverable as complete |
| `--block <task-id>` | Add blocker |
| `--unblock <task-id>` | Remove blocker |
| `--add-dependency <task-id>` | Add dependency |
| `--notes <text>` | Append to notes |

**Auto-managed Timestamps:**
- `updated_at` is automatically updated on any field change
- `completed_at` is automatically set when ALL success criteria AND deliverables are complete

### `octie delete`

Delete a task with optional edge reconnection.

```bash
octie delete <task-id>               # Interactive deletion
octie delete <task-id> --force       # Skip confirmation
octie delete <task-id> --reconnect   # Reconnect edges (A→B→C becomes A→C)
octie delete <task-id> --cascade     # Delete all dependent tasks
```

**Options:**
| Flag | Description |
|------|-------------|
| `--reconnect` | Reconnect incoming to outgoing edges after deletion |
| `--cascade` | Delete all tasks that depend on this task |
| `--force` | Skip confirmation prompt |

### `octie merge`

Merge two tasks into one.

```bash
octie merge <source-id> <target-id>  # Merge source into target
```

The merge combines:
- Description (concatenated)
- Success criteria (deduplicated by ID)
- Deliverables (deduplicated by ID)
- Related files (deduplicated)
- Notes (concatenated)

Edges are reconnected from source to target.

### `octie export`

Export project data to file.

```bash
octie export                         # Export to stdout
octie export --type json --output backup.json
octie export --type md --output tasks.md
```

**Options:**
| Flag | Description |
|------|-------------|
| `--type <format>` | Export format: `json`, `md` (default: `json`) |
| `--output <path>` | Output file path |

### `octie import`

Import tasks from file.

```bash
octie import backup.json             # Import from JSON file
octie import tasks.md --format md    # Import from Markdown
octie import backup.json --merge     # Merge with existing tasks
```

**Options:**
| Flag | Description |
|------|-------------|
| `--file <path>` | Input file path (required) |
| `--format <type>` | Input format: `json`, `md` (auto-detected from extension) |
| `--merge` | Merge with existing tasks instead of replacing |

### `octie graph`

Graph analysis and validation commands.

```bash
octie graph validate                 # Check graph integrity
octie graph cycles                   # Detect and display cycles
octie graph topology                 # Show topological order
octie graph critical-path            # Show longest dependency path
octie graph orphans                  # Show disconnected tasks
octie graph stats                    # Display graph statistics
```

### `octie serve`

Start the web UI server.

```bash
octie serve                          # Default: localhost:3000
octie serve --port 8080              # Custom port
octie serve --host 0.0.0.0           # Listen on all interfaces
```

**Options:**
| Flag | Description |
|------|-------------|
| `--port <number>` | Server port (default: 3000) |
| `--host <address>` | Host address (default: localhost) |
| `--no-cors` | Disable CORS headers |

## Web API Reference

When the server is running, the following REST API endpoints are available.

> **Full API documentation**: See [openapi.yaml](./openapi.yaml) for the complete OpenAPI 3.0 specification.

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all tasks (supports `?status=`, `?priority=`, `?search=`) |
| `GET` | `/api/tasks/:id` | Get task by ID |
| `POST` | `/api/tasks` | Create new task |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task (supports `?reconnect=true`) |
| `POST` | `/api/tasks/:id/merge` | Merge tasks (body: `{ "targetId": "uuid" }`) |

### Graph Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/graph` | Get full graph structure |
| `GET` | `/api/graph/topology` | Get topological order |
| `POST` | `/api/graph/validate` | Validate graph structure |
| `GET` | `/api/graph/cycles` | Detect cycles |
| `GET` | `/api/graph/critical-path` | Get critical path |
| `GET` | `/api/stats` | Get project statistics |

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api` | API info |
| `GET` | `/api/project` | Project metadata |

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
npm run bench
```

**Test Coverage**:
- Unit tests: 388 passed (8 skipped for unimplemented features)
- Integration tests: Full CLI workflow, concurrent access, file corruption recovery
- Web API tests: 48 comprehensive endpoint tests
- Performance benchmarks: All operations under target thresholds

## Project Status

**Current Version**: 1.0.0

**Completed Features**:
- ✅ Core data structures (TaskNode, TaskGraphStore with O(1) lookup)
- ✅ Storage layer with atomic writes and backup rotation
- ✅ Graph algorithms (topological sort, cycle detection, traversal, operations)
- ✅ CLI commands (init, create, list, get, update, delete, merge, export, import, graph, serve)
- ✅ Output formatters (Markdown, JSON, Table)
- ✅ Web API server with RESTful endpoints (Express.js)
- ✅ Web UI (React + ReactFlow + Zustand + Tailwind CSS)
- ✅ Unit tests (388 passing)
- ✅ Integration tests (CLI workflow, concurrent access, recovery)
- ✅ Web API tests (48 comprehensive tests)
- ✅ Performance benchmarks (all under target thresholds)

**Future Enhancements** (post-v1.0.0):
- 📋 Real-time collaboration (WebSocket)
- 📋 Task templates
- 📋 Advanced filtering and search
- 📋 Export to other formats (PDF, CSV)

## License

MIT
