# Octie

A graph-based task management system with CLI and web UI.

## Overview

Octie is a project-oriented task management tool that uses directed graphs to represent task dependencies. It provides both a command-line interface for power users and a web interface for visualization.

## Features

- **Graph-based task structure**: Tasks are nodes in a directed graph with dependencies
- **Atomic task definitions**: Each task has comprehensive context for AI agents
- **Fast retrieval**: JSON-based storage with indexing for quick lookups
- **Dual output formats**: Markdown for AI consumption, JSON for visualization
- **CLI + Web UI**: Command-line tool with web-based visualization
- **Graph operations**: Cut, insert, move, and merge tasks

## Installation

```bash
npm install -g octie
```

## Quick Start

```bash
# Initialize a new project
octie init

# Create a task
octie create --title "Setup database" --priority top

# List tasks
octie list --status pending

# Get task details
octie get <task-id>

# Start web UI
octie serve
```

## Development

```bash
# Clone repository
git clone <repo-url>
cd octie

# Install dependencies
npm install

# Run tests
npm test

# Run CLI in development mode
npm run dev

# Start web UI server
npm run serve
```

## Project Structure

```
octie/
├── src/              # Source files
│   ├── task-node.js  # Task node class
│   ├── task-graph.js # Graph operations
│   ├── storage.js    # File I/O
│   └── commands/     # CLI commands
├── test/             # Test files
├── cli.js            # CLI entry point
├── server.js         # Web UI server
└── package.json
```

## License

MIT
