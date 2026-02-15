# Octie - Project Specification

## Descriptive PRD (Product Requirements Document)

### Project Overview
**Name**: Octie
**Type**: Command-line tool with web-based visualization interface
**Purpose**: Graph-based task management system for project-oriented development workflows

### Core Problem Statement
Current task management tools lack:
1. True graph-based task relationships (directed acyclic graphs with potential loops)
2. Atomic task definitions with comprehensive context for AI agents
3. Fast retrieval at scale without database complexity
4. Dual output formats (MD for AI consumption, JSON for visualization)
5. Project-oriented workflow integration

### Target Users
- Developers managing complex project dependencies
- AI agents needing structured task context
- Teams requiring visual task graph representation
- Projects needing both CLI and web interfaces

---

## Functional Requirements

### 1. Task Data Model (Atomic Task Entry)

Each task MUST contain:

**Required Fields:**
- `id`: Unique identifier (UUID or incremental)
- `title`: Short descriptive name
- `description`: Detailed task explanation
- `status`: One of: "not_started" | "pending" | "in_progress" | "completed" | "blocked"
- `priority`: One of: "top" | "second" | "later"
- `success_criteria`: Array of quantitative completion criteria
- `blockers`: Array of task IDs that block this task (empty if none)
- `related_files`: Array of file paths relevant to the task
- `deliverables`: Array of specific outputs expected

**Optional Fields:**
- `sub_items`: Array of sub-task IDs
- `dependencies`: Array of task IDs this depends on
- `notes`: Additional context or comments
- `c7_verified`: Array of C7 MCP library verification entries

**Auto-Managed Timestamps (Required, System-Managed):**
- `created_at`: ISO 8601 timestamp - **Auto-generated on task creation**, immutable after creation
- `updated_at`: ISO 8601 timestamp - **Auto-updated on ANY field change** (title, description, status, priority, success_criteria, deliverables, blockers, dependencies, notes, etc.)
- `completed_at`: ISO 8601 timestamp or null - **Auto-set when ALL success_criteria AND deliverables are marked complete**, auto-cleared to null if any criterion or deliverable is un-completed

### 2. Graph Data Structure

**Node Structure:**
- Each task is a node in a directed graph
- Nodes can have multiple outgoing edges (next tasks)
- Nodes can have multiple incoming edges (dependencies)
- Support for parallel execution (independent branches)
- Support for loops (circular dependencies for iterative workflows)

**Edge Operations:**
- `add_edge(from_id, to_id)`: Create pointer from one task to another
- `remove_edge(from_id, to_id)`: Remove pointer
- `reorder_edges(task_id, new_order)`: Change execution order
- `detect_cycle()`: Identify circular dependencies
- `topological_sort()`: Get linear execution order (when acyclic)

**Graph-Level Operations:**
- `cut_node(task_id)`: Remove node and reconnect edges
- `insert_node(new_id, after_id)`: Insert node into edge
- `move_subtree(root_id, new_parent)`: Move entire task branch
- `merge_tasks(source_id, target_id)`: Combine two tasks
- `split_task(task_id, split_point)`: Divide one task into multiple

### 3. CRUD Operations

**Create:**
```bash
octie create --title "Task name" --description "Detailed description" \
  --success-criteria "Criterion 1" --success-criteria "Criterion 2" \
  --deliverable "Deliverable 1" --priority top
octie create --interactive  # Full interactive mode with prompts
```

**REQUIRED FIELDS for Task Creation (Must NOT be null/empty):**
- `--title` (required): Short descriptive task name (max 200 chars)
- `--description` (required): Detailed explanation of what the task does
- `--success-criteria` (required, at least one): Quantitative completion criteria
- `--deliverables` (required, at least one): Specific outputs expected

**Optional Fields:**
- `--priority` (default: "second"): "top" | "second" | "later"
- `--blockers`: Comma-separated task IDs that block this task
- `--dependencies`: Comma-separated task IDs this depends on
- `--related-files`: Comma-separated file paths relevant to the task
- `--notes`: Additional context or comments

**Atomic Task Requirement:**
Tasks MUST be atomic and executable. A vague or huge task MUST be divided into smaller, atomic executable tasks.

**What is an Atomic Task?**
An atomic task is:
- **Specific**: Has a clear, single purpose
- **Executable**: Can be completed in one focused session
- **Verifiable**: Has quantitative success criteria
- **Independent**: Minimizes dependencies on other tasks
- **Sized**: Can be completed in 2-8 hours (typical) or 1-2 days (max)

**Examples:**

❌ **BAD: Too vague/large**
```bash
octie create --title "Build authentication system" \
  --description "Implement login, signup, password reset, OAuth"
# Problem: Multiple features, unclear completion criteria
```

✅ **GOOD: Atomic tasks**
```bash
octie create --title "Implement login endpoint" \
  --description "Create POST /auth/login endpoint that returns JWT" \
  --success-criteria "Endpoint returns 200 with valid JWT on correct credentials" \
  --success-criteria "Endpoint returns 401 on invalid credentials" \
  --deliverable "src/api/auth/login.ts" \
  --deliverable "tests/api/auth/login.test.ts"

octie create --title "Implement password hashing" \
  --description "Add bcrypt password hashing with 10 salt rounds" \
  --success-criteria "Passwords are hashed with bcrypt before storage" \
  --deliverable "src/auth/hashing.ts"
```

**List:**
```bash
octie list --status pending --priority top
octie list --graph  # Show as graph structure
octie list --tree   # Show as tree view
```

**Update:**
```bash
octie update <id> --status in_progress
octie update <id> --add-deliverable "output file"
octie update <id> --block "other_id"  # Add blocker
octie update <id> --complete-criterion "criterion-id"  # Mark criterion complete
octie update <id> --complete-deliverable "deliverable-id"  # Mark deliverable complete
# Note: Timestamps are auto-managed by the system:
# - created_at: Set on creation, immutable
# - updated_at: Auto-updated on ANY field change
# - completed_at: Auto-set when ALL success_criteria AND deliverables are complete
```

**Get:**
```bash
octie get <id>
octie get <id> --format json
octie get <id> --format md
```

**Delete:**
```bash
octie delete <id> --reconnect  # Reconnect edges
octie delete <id> --cascade     # Delete all dependents
```

**Merge:**
```bash
octie merge <source_id> <target_id>
```

### 4. Output Formats

**Markdown Format (for AI):**
```markdown
## [ ] Task Title: Task Description

**Status**: Pending
**Priority**: Top
**Blockers**: #task-1, #task-2
**Related Files**: src/component.ts, tests/component.test.ts
**C7 MCP Verified**: /mongodb/docs (best practices confirmed)

### Success Criteria
- [ ] All unit tests passing (>90% coverage)
- [ ] Integration tests completed
- [ ] Code review approved

### Deliverables
- [ ] Component implementation
- [ ] Test suite
- [ ] Documentation

### Sub-items
- [ ] #task-3: Implement core logic
- [ ] #task-4: Add error handling

### Dependencies
- Requires: #task-1 (must complete first)
- Blocks: #task-5 (waiting on this)
```

**JSON Format (for storage/visualization):**
```json
{
  "tasks": {
    "task-1": {
      "id": "task-1",
      "title": "Task Title",
      "description": "Task Description",
      "status": "pending",
      "priority": "top",
      "success_criteria": [
        "All unit tests passing",
        "Integration tests completed"
      ],
      "blockers": [],
      "related_files": ["src/component.ts"],
      "c7_verified": ["/mongodb/docs"],
      "deliverables": [
        {"text": "Component implementation", "completed": false},
        {"text": "Test suite", "completed": false}
      ],
      "sub_items": ["task-3", "task-4"],
      "dependencies": [],
      "notes": "",
      "edges": ["task-2", "task-5"],
      "created_at": "2026-02-15T12:00:00Z",
      "updated_at": "2026-02-15T12:00:00Z"
    }
  },
  "metadata": {
    "project_name": "octie",
    "version": "1.0.0",
    "created_at": "2026-02-15T12:00:00Z",
    "updated_at": "2026-02-15T12:00:00Z"
  }
}
```

### 5. CLI Interface

**Main Commands:**
- `octie init` - Initialize new project
- `octie create` - Create new task
- `octie list` - List tasks
- `octie get` - Get task details
- `octie update` - Update task
- `octie delete` - Delete task
- `octie merge` - Merge tasks
- `octie graph` - Graph operations
- `octie export` - Export to MD/JSON
- `octie import` - Import from MD/JSON
- `octie serve` - Start web UI server

**Global Options:**
- `--project <path>` - Specify project directory
- `--format <json|md>` - Output format
- `--verbose` - Verbose output
- `--quiet` - Silent mode

### 6. Web UI (Visualization)

**Features:**
- Interactive graph visualization (D3.js or Cytoscape.js)
- Drag-and-drop task reordering
- Real-time status updates
- Task detail panel
- Filter by status/priority
- Export visual graph as PNG/SVG
- Dark/light theme

**API Endpoints:**
- `GET /api/tasks` - List all tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/merge` - Merge tasks
- `GET /api/graph` - Get graph structure
- `POST /api/graph/validate` - Validate graph structure

### 7. Performance Requirements

**Storage:**
- JSON file-based storage
- Index by task ID for O(1) lookup
- Lazy loading for large projects
- Optional compression for large files

**Retrieval Speed:**
- Single task lookup: < 10ms for 1000 tasks
- Full graph load: < 100ms for 1000 tasks
- Graph operations (topological sort): < 50ms

**Scale Targets:**
- Support 1000+ tasks per project
- Support 100+ concurrent web UI connections
- File size < 5MB for 1000 tasks

### 8. Edge Cases

**Graph Validations:**
- Detect and warn about circular dependencies
- Prevent orphan tasks (no dependencies)
- Validate task ID references
- Handle merge conflicts

**Error Handling:**
- Invalid task IDs
- Circular dependency loops
- File read/write errors
- Concurrent modification conflicts

**Data Integrity:**
- Atomic file writes (write to temp, then rename)
- Backup before destructive operations
- Validation before saving
- Recovery from corrupted files

---

## Non-Functional Requirements

### Usability
- Intuitive CLI with clear help text
- Auto-completion for task IDs
- Interactive mode with prompts
- Clear error messages with suggestions

### Maintainability
- Modular code architecture
- Comprehensive test coverage
- Clear separation of concerns
- Well-documented API

### Extensibility
- Plugin system for custom operations
- Support for custom output formats
- Web UI theming support
- Storage backend abstraction

### Security
- Input validation and sanitization
- Safe file operations
- No code execution from task definitions
- Web UI authentication (optional)

---

## Technical Constraints

### Must Have:
- Node.js >= 20.0.0
- ES modules (type: "module")
- No external database (JSON files only)
- Cross-platform (Windows, macOS, Linux)

### Should Have:
- Minimal dependencies
- Fast startup time (< 100ms)
- Small bundle size
- Offline functionality

### Must Not Have:
- Heavy framework dependencies
- Complex build tools
- Database requirements
- Cloud service dependencies

---

## Success Metrics

- **Performance**: All operations complete within specified time limits
- **Usability**: New users can create first task within 5 minutes
- **Reliability**: Zero data loss in normal operations
- **Adoption**: Can be integrated into existing workflows without friction
