# Octie CLI Reference Guide

Complete command reference for the Octie graph-based task management system.

## Table of Contents

- [Global Options](#global-options)
- [Commands](#commands)
  - [init](#init---initialize-a-new-octie-project)
  - [create](#create---create-a-new-atomic-task)
  - [list](#list---list-tasks-with-filtering)
  - [get](#get---get-task-details)
  - [update](#update---update-an-existing-task)
  - [delete](#delete---delete-a-task)
  - [merge](#merge---merge-two-tasks)
  - [graph](#graph---graph-analysis-and-validation)
  - [export](#export---export-project-data)
  - [import](#import---import-tasks-from-file)
  - [find](#find---search-and-filter-tasks)
  - [batch](#batch---perform-bulk-operations)
  - [serve](#serve---start-web-ui-server)

---

## Global Options

These options can be used with any command:

```
-v, --version              Display version number
-p, --project <path>       Path to Octie project directory
--format <format>          Output format: json, md, table (default: "table")
--verbose                  Enable verbose output
--quiet                    Suppress non-error output
-h, --help                 Display help for command
```

---

## Commands

### init - Initialize a new Octie Project

Create a new Octie project in the current or specified directory.

```
Usage: octie init [options]

Options:
  -n, --name <name>     Project name (default: "my-project")
  --project <path>      Path to Octie project directory
  -h, --help            Display help for command
```

**Example:**
```bash
octie init --name "my-awesome-project"
```

---

### create - Create a new Atomic Task

Create a new task with atomic task validation.

```
Usage: octie create [options]

Required Options:
  --title <string>                   Task title (max 200 chars). Must contain action verb
  --description <string>             Detailed task description (min 50 chars, max 10000)
  --success-criterion <text>         Quantitative success criterion (can be specified multiple times)
  --deliverable <text>               Specific output expected (can be specified multiple times)

Optional Options:
  -p, --priority <level>             Task priority: top | second | later (default: "second")
  -b, --blockers <ids>               Comma-separated task IDs that block this task
  -d, --dependencies <ids>           Comma-separated task IDs this depends on
  -f, --related-files <paths>        Comma-separated file paths relevant to task
  -c, --c7-verified <library:notes>  C7 library verification (format: library-id or library-id:notes)
  -n, --notes <text>                 Additional context or comments
  --notes-file <path>                Read notes from file (multi-line notes support)
  -i, --interactive                  Interactive mode with prompts
  --project <path>                   Path to Octie project directory
```

#### Atomic Task Policy

⚠️ **ATOMIC TASK POLICY** ⚠️

Tasks MUST be atomic - small, specific, executable, and verifiable.

**What is an Atomic Task?**
- Single purpose: Does ONE thing well
- Executable: Can be completed in 2-8 hours (typical) or 1-2 days (max)
- Verifiable: Has quantitative success criteria
- Independent: Minimizes dependencies on other tasks

**❌ BAD Examples (too vague or too large):**
- "Fix authentication" (too vague - what specifically?)
- "Build auth system" (too large - split into: login, signup, password reset, etc.)
- "Improve performance" (not measurable - what metric?)
- "Code review" (not atomic - which files? what criteria?)

**✅ GOOD Examples (atomic):**
- "Implement login endpoint with JWT" (specific, testable)
- "Add bcrypt password hashing with 10 rounds" (clear, verifiable)
- "Write unit tests for User model" (specific scope)
- "Fix NPE in AuthService.login method" (atomic bug fix)

**Validation Rules:**
- Title: 1-200 chars, must contain action verb
- Description: 50-10000 chars, must be specific
- Success Criteria: 1-10 items, must be quantitative
- Deliverables: 1-5 items, must be specific outputs

**Examples:**
```bash
# Create an atomic task
octie create \
  --title "Implement login endpoint" \
  --description "Create POST /auth/login that validates credentials and returns JWT" \
  --success-criterion "Returns 200 with valid JWT on correct credentials" \
  --success-criterion "Returns 401 on invalid credentials" \
  --deliverable "src/api/auth/login.ts" \
  --priority top

# Interactive mode
octie create --interactive
```

---

### list - List Tasks with Filtering

List and filter tasks with various options.

```
Usage: octie list [options]

Options:
  -s, --status <status>      Filter by status (not_started|pending|in_progress|completed|blocked)
  -p, --priority <priority>  Filter by priority (top|second|later)
  --graph                    Show graph structure
  --tree                     Show tree view
```

**Examples:**
```bash
# List all tasks
octie list

# List only pending tasks
octie list --status pending

# List top priority tasks
octie list --priority top

# Show as graph
octie list --graph

# Export as markdown
octie list --format md
```

---

### get - Get Task Details

Display detailed information about a specific task.

```
Usage: octie get [options] <id>

Arguments:
  id                   Task ID

Options:
  --format <format>     Output format: json, md, table
```

**Examples:**
```bash
# Show task details
octie get task-123

# Export as markdown
octie get task-123 --format md
```

---

### update - Update an Existing Task

Modify various properties of an existing task.

```
Usage: octie update [options] <id>

Arguments:
  id                              Task ID to update

Options:
  --status <status>               Task status
  --priority <priority>           Task priority
  --add-deliverable <text>        Add a deliverable
  --complete-deliverable <id>     Mark deliverable as complete
  --remove-deliverable <id>       Remove a deliverable by ID
  --add-success-criterion <text>  Add a success criterion
  --complete-criterion <id>       Mark success criterion as complete
  --remove-criterion <id>         Remove a success criterion by ID
  --block <id>                    Add a blocker
  --unblock <id>                  Remove a blocker
  --add-dependency <id>           Add a dependency
  --remove-dependency <id>        Remove a dependency
  --add-related-file <path>       Add a related file path
  --remove-related-file <path>    Remove a related file path
  --verify-c7 <library:notes>     Add C7 library verification
  --remove-c7-verified <library>  Remove a C7 verification by library ID
  --notes <text>                  Append to notes
  --notes-file <path>             Read notes from file and append
```

**Examples:**
```bash
# Update status
octie update task-123 --status in_progress

# Complete a deliverable
octie update task-123 --complete-deliverable del-456

# Add a blocker
octie update task-123 --block task-789

# Append notes from file
octie update task-123 --notes-file notes.md

# Add C7 verification
octie update task-123 --verify-c7 "/express:Use Router middleware"
```

---

### delete - Delete a Task

Remove a task from the project.

```
Usage: octie delete [options] <id>

Arguments:
  id                   Task ID to delete

Options:
  --reconnect          Reconnect edges after deletion (A→B→C → A→C)
  --cascade            Delete all dependent tasks
  --force              Skip confirmation prompt
```

**Examples:**
```bash
# Delete with confirmation
octie delete task-123

# Delete and reconnect edges
octie delete task-123 --reconnect

# Force delete without confirmation
octie delete task-123 --force
```

---

### merge - Merge Two Tasks

Combine two tasks into one.

```
Usage: octie merge [options] <sourceId> <targetId>

Arguments:
  sourceId             Source task ID (will be deleted)
  targetId             Target task ID (will receive merged content)

Options:
  --force              Skip confirmation prompt
```

**Examples:**
```bash
# Merge task-2 into task-1
octie merge task-2 task-1
```

---

### graph - Graph Analysis and Validation

Analyze and validate the task graph structure.

```
Usage: octie graph [options] [command]

Commands:
  validate             Validate graph structure
  cycles               Detect and display cycles in the graph
```

**Examples:**
```bash
# Validate graph
octie graph validate

# Find cycles
octie graph cycles
```

---

### export - Export Project Data

Export project data to a file.

```
Usage: octie export [options]

Options:
  -t, --type <format>   Export format: json, md (default: "json")
  -o, --output <path>   Output file path
```

**Examples:**
```bash
# Export as JSON
octie export --type json --output backup.json

# Export as Markdown
octie export --type md --output tasks.md
```

---

### import - Import Tasks from File

Import tasks from JSON or Markdown files.

```
Usage: octie import [options] <file>

Arguments:
  file                  File path to import

Options:
  --format <format>     Import format: json | md (auto-detect from extension)
  --merge               Merge with existing tasks instead of replacing
```

**Examples:**
```bash
# Import from JSON
octie import backup.json

# Import from Markdown
octie import tasks.md

# Merge with existing tasks
octie import tasks.md --merge
```

---

### find - Search and Filter Tasks

Advanced search and filtering capabilities.

```
Usage: octie find [options]

Options:
  -t, --title <pattern>          Search task titles (case-insensitive substring)
  -s, --search <text>            Full-text search in description, notes, criteria, deliverables
  -f, --has-file <path>          Find tasks referencing a specific file
  -v, --verified <library>       Find tasks with C7 verification from specific library
  --without-blockers             Show tasks with no blockers (ready to start)
  --orphans                      Show tasks with no relationships (no edges)
  --leaves                       Show tasks with no outgoing edges (end tasks)
  --status <status>              Filter by status
  -p, --priority <priority>      Filter by priority
```

**Examples:**
```bash
# Find tasks with "auth" in title
octie find --title "auth"

# Full-text search
octie find --search "JWT token"

# Find tasks referencing a file
octie find --has-file "auth.ts"

# Find tasks ready to start
octie find --without-blockers

# Find orphan tasks
octie find --orphans

# Combine multiple filters
octie find --title "API" --priority top

# Output as JSON
octie find --title "auth" --format json
```

---

### batch - Perform Bulk Operations

Perform operations on multiple tasks at once.

```
Usage: octie batch [options] [command]

Commands:
  update-status <status>        Update status of all tasks matching filters
  delete                        Delete all tasks matching filters
  add-blocker <blocker-id>      Add blocker to all tasks matching filters
  remove-blocker <blocker-id>   Remove blocker from all tasks matching filters

Safety Features:
  --dry-run                     Preview affected tasks without making changes
  --force                       Required for destructive operations (delete)

Filter Options (same as 'find' command):
  --status <status>             Filter by status
  --priority <priority>         Filter by priority
  --title <pattern>             Filter by title substring
  --search <text>               Full-text search
  --has-file <path>             Filter by related file
  --verified <library>          Filter by C7 verification
  --without-blockers            Filter to tasks with no blockers
  --orphans                     Filter to orphan tasks
  --leaves                      Filter to leaf tasks
```

**Examples:**
```bash
# Preview batch status update
octie batch update-status in_progress --status pending --dry-run

# Update all pending tasks to in_progress
octie batch update-status in_progress --status pending

# Delete all orphan tasks (requires --force)
octie batch delete --orphans --force

# Add blocker to all top priority tasks
octie batch add-blocker task-123 --priority top

# Remove blocker from blocked tasks
octie batch remove-blocker task-123 --status blocked
```

---

### serve - Start Web UI Server

Launch the web UI for task visualization.

```
Usage: octie serve [options]

Options:
  -p, --port <number>    Port to run server on (default: "3000")
  -h, --host <host>      Host to bind to (default: "localhost")
  --open                Open browser automatically
  --no-cors             Disable CORS
  --no-logging          Disable request logging
```

**Examples:**
```bash
# Start server on default port
octie serve

# Start server on custom port
octie serve --port 8080

# Start and open browser
octie serve --open

# Start on all interfaces
octie serve --host 0.0.0.0
```

---

## Task Status Values

- `not_started` - Task has not been started
- `pending` - Task is ready to start
- `in_progress` - Task is currently being worked on
- `completed` - Task is complete
- `blocked` - Task is blocked by dependencies

## Task Priority Values

- `top` - Highest priority
- `second` - Medium priority (default)
- `later` - Lowest priority

## Output Formats

- `table` - Human-readable table format (default)
- `json` - Machine-readable JSON format
- `md` - Markdown format for documentation

## Environment Variables

The following environment variables can be used for task creation:

- `OCTIE_TASK_TITLE` - Default task title
- `OCTIE_TASK_DESCRIPTION` - Default task description
- `OCTIE_SUCCESS_CRITERION` - Default success criterion
- `OCTIE_DELIVERABLE` - Default deliverable

## See Also

- [Octie Documentation](https://github.com/anthropics/octie)
- [Atomic Task Guidelines](#atomic-task-policy)
- [Graph Operations](#graph---graph-analysis-and-validation)
