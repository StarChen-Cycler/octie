# Octie CLI Reference (Raw Help Output)

> Auto-generated reference from `octie --help` commands

## Main Help

```
Usage: octie [options] [command]

Graph-based task management system

Options:
  -v, --version                          Display version number
  -p, --project <path>                   Path to Octie project directory
  --format <format>                      Output format: json, md, table (default: "table")
  --verbose                              Enable verbose output
  --quiet                                Suppress non-error output
  -h, --help                             display help for command

Commands:
  create [options]                       Create a new atomic task in the project
  delete [options] <id>                  Delete a task from the project
  export [options]                       Export project data to file
  find [options]                         Search and filter tasks with advanced options
  get <id>                               Get task details
  graph                                  Graph analysis and validation operations
  help [command]                         display help for command
  import [options] <file>                Import tasks from file (supports JSON and Markdown)
  init [options]                         Initialize a new Octie project
  list [options]                         List tasks with filtering options
  merge [options] <sourceId> <targetId>  Merge two tasks into one
  serve [options]                        Start web UI server for task visualization
  update [options] <id>                  Update an existing task
  wire [options] <task-id>               Insert an existing task between two connected tasks
```

## init

```
Usage: octie init [options]

Initialize a new Octie project

Options:
  -n, --name <name>  Project name (default: "my-project")
  -h, --help         display help for command
```

## create

```
Usage: octie create [options]

Create a new atomic task in the project

Options:
  --title <string>                   Task title (max 200 chars). Must contain
                                     action verb (env: OCTIE_TASK_TITLE)
  --description <string>             Detailed task description (min 50 chars,
                                     max 10000) (env: OCTIE_TASK_DESCRIPTION)
  --success-criterion <text>         Quantitative success criterion (can be
                                     specified multiple times) (env:
                                     OCTIE_SUCCESS_CRITERION)
  --deliverable <text>               Specific output expected (can be specified
                                     multiple times) (env: OCTIE_DELIVERABLE)
  -p, --priority <level>             Task priority: top | second | later
                                     (default: "second")
  -b, --blockers <ids>               Comma-separated task IDs that block this
                                     task (creates graph edges for execution
                                     order)
  -d, --dependencies <text>          Explanatory text: WHY this task depends on
                                     its blockers (required if --blockers is
                                     set)
  -f, --related-files <paths>        File paths relevant to task (can be
                                     specified multiple times or
                                     comma-separated)
  -c, --c7-verified <library:notes>  C7 library verification (format:
                                     library-id or library-id:notes, can be
                                     specified multiple times)
  -n, --notes <text>                 Additional context or comments
  --notes-file <path>                Read notes from file (multi-line notes
                                     support)
  -i, --interactive                  Interactive mode with prompts
  --project <path>                   Path to Octie project directory
  -h, --help                         display help for command

⚠️  ATOMIC TASK POLICY ⚠️

Tasks MUST be atomic - small, specific, executable, and verifiable.

What is an Atomic Task?
  • Single purpose: Does ONE thing well
  • Executable: Can be completed in 2-8 hours (typical) or 1-2 days (max)
  • Verifiable: Has quantitative success criteria
  • Independent: Minimizes dependencies on other tasks

❌ BAD Examples (too vague or too large):
  • "Fix authentication" (too vague - what specifically?)
  • "Build auth system" (too large - split into: login, signup, password reset, etc.)
  • "Improve performance" (not measurable - what metric?)
  • "Code review" (not atomic - which files? what criteria?)

✅ GOOD Examples (atomic):
  • "Implement login endpoint with JWT" (specific, testable)
  • "Add bcrypt password hashing with 10 rounds" (clear, verifiable)
  • "Write unit tests for User model" (specific scope)
  • "Fix NPE in AuthService.login method" (atomic bug fix)

Validation Rules:
  • Title: 1-200 chars, must contain action verb
  • Description: 50-10000 chars, must be specific
  • Success Criteria: 1-10 items, must be quantitative
  • Deliverables: 1-5 items, must be specific outputs

If your task is rejected as non-atomic:
  → Split it into smaller, focused tasks
  → Be more specific about what will be done
  → Define measurable success criteria
  → Limit scope to 2-8 hours of work


Blockers & Dependencies (Twin Feature):
  --blockers (-b): Comma-separated task IDs that block this task.
                Creates GRAPH EDGES affecting execution order.
                Task A blocks Task B → A must complete before B starts.

  --dependencies (-d): Explanatory text WHY this task depends on its blockers.
                  REQUIRED when --blockers is set (twin validation).
                  Does NOT affect execution order - pure metadata.

  Example (both required together):
    octie create --title "Build Frontend" \
      --blockers abc123,def456 \
      --dependencies "Needs API spec from abc123 and auth from def456"

  Error if only one provided:
    --blockers without --dependencies → Error: twin required
    --dependencies without --blockers → Error: twin required
```

## list

```
Usage: octie list [options]

List tasks with filtering options

Options:
  -s, --status <status>      Filter by status
  -p, --priority <priority>  Filter by priority
  --graph                    Show graph structure
  --tree                     Show tree view
  -h, --help                 display help for command

Tip: The IDs shown in the list can be used with `get`, `update`, and `delete` commands.
```

## get

```
Usage: octie get [options] <id>

Get task details

Arguments:
  id          Task ID (full UUID or first 7-8 characters)

Options:
  -h, --help  display help for command
```

## update

```
Usage: octie update [options] <id>

Update an existing task

Arguments:
  id                               Task ID to update (full UUID or first 7-8
                                   characters)

Options:
  --status <status>                Task status
  --priority <priority>            Task priority
  --add-deliverable <text>         Add a deliverable
  --complete-deliverable <id>      Mark deliverable(s) as complete (supports:
                                   id, id1,id2, or "id1","id2") (default: [])
  --remove-deliverable <id>        Remove a deliverable by ID
  --add-success-criterion <text>   Add a success criterion
  --complete-criterion <id>        Mark success criterion(s) as complete
                                   (supports: id, id1,id2, or "id1","id2")
                                   (default: [])
  --remove-criterion <id>          Remove a success criterion by ID
  --block <id>                     Add a blocker (requires
                                   --dependency-explanation)
  --unblock <id>                   Remove a blocker (removes graph edge)
  --dependency-explanation <text>  Set/update dependencies explanation
                                   (required with --block)
  --clear-dependencies             Clear dependencies explanation (for removing
                                   last blocker)
  --add-related-file <path>        Add a related file path
  --remove-related-file <path>     Remove a related file path
  --verify-c7 <library:notes>      Add C7 library verification (format:
                                   library-id or library-id:notes)
  --remove-c7-verified <library>   Remove a C7 verification by library ID
  --notes <text>                   Append to notes
  --notes-file <path>              Read notes from file and append (multi-line
                                   notes support)
  -h, --help                       display help for command

Blockers & Dependencies (Twin Feature):
  --block <id>: Add a blocker (creates graph edge).
                REQUIRES --dependency-explanation (twin validation).

  --unblock <id>: Remove a blocker (removes graph edge).
                  If last blocker removed, dependencies auto-cleared.

  --dependency-explanation <text>: Set/update dependencies explanation.
                                     Required with --block.

  --clear-dependencies: Explicitly clear dependencies explanation.

  Examples:
    Add blocker with explanation:
      octie update abc --block xyz --dependency-explanation "Needs xyz output"

    Update existing dependencies text:
      octie update abc --dependency-explanation "Updated reason"

    Remove blocker (auto-clears if last one):
      octie update abc --unblock xyz

  Error if twin missing:
    --block without --dependency-explanation → Error
```

## delete

```
Usage: octie delete [options] <id>

Delete a task from the project

Arguments:
  id           Task ID to delete (full UUID or first 7-8 characters)

Options:
  --reconnect  Reconnect edges after deletion (A→B→C → A→C)
  --cascade    Delete all dependent tasks
  --force      Skip confirmation prompt
  -h, --help   display help for command
```

## merge

```
Usage: octie merge [options] <sourceId> <targetId>

Merge two tasks into one

Arguments:
  sourceId    Source task ID (will be deleted)
  targetId    Target task ID (will receive merged content)

Options:
  --force     Skip confirmation prompt
  -h, --help  display help for command
```

## graph

```
Usage: octie graph [options] [command]

Graph analysis and validation operations

Options:
  -h, --help  display help for command

Commands:
  validate    Validate graph structure
  cycles      Detect and display cycles in the graph
```

### graph validate

```
Usage: octie graph validate [options]

Validate graph structure

Options:
  -h, --help  display help for command
```

### graph cycles

```
Usage: octie graph cycles [options]

Detect and display cycles in the graph

Options:
  -h, --help  display help for command
```

## export

```
Usage: octie export [options]

Export project data to file

Options:
  -t, --type <format>  Export format: json, md (default: "json")
  -o, --output <path>  Output file path
  -h, --help           display help for command
```

## import

```
Usage: octie import [options] <file>

Import tasks from file (supports JSON and Markdown)

Arguments:
  file               File path to import

Options:
  --format <format>  Import format: json | md (auto-detect from extension if
                     not specified)
  --merge            Merge with existing tasks instead of replacing
  -h, --help         display help for command
```

## find

```
Usage: octie find [options]

Search and filter tasks with advanced options

Options:
  -t, --title <pattern>      Search task titles (case-insensitive substring)
  -s, --search <text>        Full-text search in description, notes, criteria,
                             deliverables
  -f, --has-file <path>      Find tasks referencing a specific file
  -v, --verified <library>   Find tasks with C7 verification from specific
                             library
  --without-blockers         Show tasks with no blockers (ready to start)
  --orphans                  Show tasks with no relationships (no edges)
  --leaves                   Show tasks with no outgoing edges (end tasks)
  --status <status>          Filter by status
                             (not_started|pending|in_progress|completed|blocked)
  -p, --priority <priority>  Filter by priority (top|second|later)
  -h, --help                 display help for command

Examples:
  $ octie find --title "auth"                  Find tasks with "auth" in title
  $ octie find --search "JWT token"            Full-text search for "JWT token"
  $ octie find --has-file "auth.ts"            Find tasks referencing auth.ts
  $ octie find --verified "/express"           Find tasks verified against Express docs
  $ octie find --without-blockers              Find tasks ready to start
  $ octie find --orphans                       Find disconnected tasks
  $ octie find --leaves --status pending       Find pending end tasks
  $ octie find --title "API" --priority top    Combine multiple filters

Output formats:
  $ octie find --title "auth" --format json    Output as JSON
  $ octie find --search "test" --format md     Output as Markdown
```

## serve

```
Usage: octie serve [options]

Start web UI server for task visualization

Options:
  -p, --port <number>  Port to run server on (default: "3000")
  -h, --host <host>    Host to bind to (default: "localhost")
  --open               Open browser automatically
  --no-cors            Disable CORS
  --no-logging         Disable request logging
  --project <path>     Path to Octie project directory
  --help               display help for command
```

## wire

```
Usage: octie wire [options] <task-id>

Insert an existing task between two connected tasks on a blocker chain

Arguments:
  task-id                 Task ID to insert (full UUID or first 7-8 characters)

Options:
  --after <id>            Source task ID - will become the inserted task's
                          blocker
  --before <id>           Target task ID - will block on the inserted task
                          instead
  --dep-on-after <text>   Why the inserted task depends on the --after task
                          (twin validation)
  --dep-on-before <text>  Why the --before task depends on the inserted task
  -h, --help              display help for command

Description:
  Insert an existing task into a blocker chain between two connected tasks.
  This operation uses the twin validation system (blockers + dependencies).

Workflow:
  1. Create the intermediate task first (using octie create)
  2. Wire it into the chain using this command

Visual Example:
  Before: A → C (A blocks C)
  After:  A → B → C (A blocks B, B blocks C)

Twin Validation (Required):
  --dep-on-after  Why B depends on A (sets B.dependencies)
  --dep-on-before Why C depends on B (replaces C's old dependency on A)

  Example:
    octie create --title "Review API spec" # Creates task xyz789
    octie wire xyz789 \
      --after abc123 \
      --before def456 \
      --dep-on-after "Needs API spec to create models" \
      --dep-on-before "Frontend needs TypeScript models"

  Validation Errors:
    - Edge A→C doesn't exist → Error (tasks must be connected)
    - C doesn't have A as blocker → Error (invalid chain)
    - B already blocks C → Error (duplicate edge)
    - Missing --dep-on-* options → Error (twin validation)
```
