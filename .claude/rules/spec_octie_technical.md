# Octie - Technical Product Requirements Document (Technical PRD)

> This document provides comprehensive technical specifications for implementing the Octie graph-based task management system. It is designed to be appended to the main specification document.

---

## 1. Technology Stack

### 1.1 CLI Framework

**Primary Choice: Commander.js + Inquirer.js**

| Component | Library | Version | Rationale |
|-----------|---------|---------|-----------|
| CLI Parser | `commander` | ^12.0.0 | Mature, well-documented, ESM support, TypeScript-friendly |
| Interactive Prompts | `inquirer` | ^9.2.0 | Rich prompt types, validation, async support |
| Terminal Output | `chalk` | ^5.3.0 | Color output, template literals |
| Progress/Spinners | `ora` | ^8.0.0 | Elegant terminal spinners |
| Tables | `cli-table3` | ^0.6.3 | ASCII table formatting |
| Tree View | `archy` | ^1.0.0 | Nested tree visualization |

**Alternative Considered: oclif (Open CLI Framework)**
- Rejected due to heavier footprint and slower startup time
- Commander.js provides 10x faster startup with minimal dependencies

### 1.2 Web UI Framework

**Primary Choice: React + Vite + Express**

| Component | Library | Version | Rationale |
|-----------|---------|---------|-----------|
| Frontend Framework | `react` | ^18.2.0 | Component-based, excellent ecosystem |
| Build Tool | `vite` | ^5.0.0 | Fast HMR, native ESM, minimal config |
| Graph Visualization | `@reactflow/core` | ^11.10.0 | React-native, performant, extensible |
| Alternative Graph | `cytoscape` + `cytoscape-react` | ^3.28.0 | For complex graph algorithms |
| State Management | `zustand` | ^4.5.0 | Lightweight, no boilerplate |
| Styling | `tailwindcss` | ^3.4.0 | Utility-first, rapid development |
| Backend Server | `express` | ^4.18.0 | Mature, minimal, well-supported |
| API Validation | `zod` | ^3.22.0 | Runtime type validation |

**Graph Visualization Library Decision Matrix:**

| Library | Pros | Cons | Use Case |
|---------|------|------|----------|
| ReactFlow | Easy React integration, handles 1000+ nodes | Limited graph algorithms | Primary choice |
| Cytoscape.js | Rich algorithms, layouts, analysis | Steep learning curve | Advanced analysis |
| D3.js | Full customization | High development effort | Custom visualizations |

### 1.3 Supporting Libraries

```json
{
  "dependencies": {
    "uuid": "^9.0.0": "Unique ID generation",
    "date-fns": "^3.0.0": "Date manipulation",
    "lodash-es": "^4.17.21": "Utility functions (ESM)",
    "chalk": "^5.3.0": "Terminal colors",
    "ora": "^8.0.0": "Terminal spinners",
    "inquirer": "^9.2.0": "Interactive prompts",
    "commander": "^12.0.0": "CLI framework",
    "express": "^4.18.0": "Web server",
    "cors": "^2.8.5": "CORS middleware",
    "zod": "^3.22.0": "Schema validation"
  },
  "devDependencies": {
    "typescript": "^5.3.0": "Type safety",
    "vitest": "^1.2.0": "Fast unit testing",
    "@types/node": "^20.10.0": "Node.js types",
    "eslint": "^8.56.0": "Linting",
    "prettier": "^3.2.0": "Code formatting"
  }
}
```

---

## 2. Data Structures

### 2.1 Core Task Node Interface

```typescript
// TypeScript interfaces for type safety

interface TaskNode {
  // Identity
  id: string;                    // UUID v4 format
  title: string;                 // Max 200 characters
  description: string;           // Markdown-supported text

  // Status Management
  status: TaskStatus;
  priority: TaskPriority;

  // Completion Criteria
  success_criteria: SuccessCriterion[];
  deliverables: Deliverable[];

  // Graph Relationships
  blockers: string[];            // Task IDs that must complete first
  dependencies: string[];        // Soft dependencies (informational)
  edges: string[];               // Outgoing edges (tasks this enables)
  sub_items: string[];           // Child task IDs

  // Context
  related_files: string[];       // File paths (relative to project root)
  notes: string;                 // Additional context (markdown)
  c7_verified: C7Verification[]; // Library verification entries

  // Timestamps (REQUIRED, Auto-Managed by System)
  created_at: string;            // ISO 8601 - Auto-generated on task creation, IMMUTABLE
  updated_at: string;            // ISO 8601 - Auto-updated on ANY field change
  completed_at: string | null;   // ISO 8601 or null - Auto-set when ALL success_criteria AND deliverables are complete, null otherwise
}

type TaskStatus = 'not_started' | 'pending' | 'in_progress' | 'completed' | 'blocked';
type TaskPriority = 'top' | 'second' | 'later';

interface SuccessCriterion {
  id: string;
  text: string;
  completed: boolean;
  completed_at?: string;
}

interface Deliverable {
  id: string;
  text: string;
  completed: boolean;
  file_path?: string;            // Optional link to actual file
}

interface C7Verification {
  library_id: string;            // e.g., "/mongodb/docs"
  verified_at: string;
  notes?: string;
}
```

### 2.1.1 Auto-Managed Timestamps

**CRITICAL REQUIREMENT**: Timestamps are system-managed and CANNOT be manually set by users or CLI commands.

```typescript
// Timestamp auto-management rules
class TaskNode {
  private _created_at: string;
  private _updated_at: string;
  private _completed_at: string | null;

  // created_at: Set once during construction, NEVER modified
  constructor(data: Omit<TaskNode, 'created_at' | 'updated_at' | 'completed_at'>) {
    this._created_at = new Date().toISOString();
    this._updated_at = this._created_at;
    this._completed_at = null;
    // ... initialize other fields
    this._checkCompletion();
  }

  // Getters (read-only access)
  get created_at(): string { return this._created_at; }
  get updated_at(): string { return this._updated_at; }
  get completed_at(): string | null { return this._completed_at; }

  // Auto-update updated_at on ANY field change
  private _touch(): void {
    this._updated_at = new Date().toISOString();
  }

  // Auto-check completion on success_criteria or deliverables change
  private _checkCompletion(): void {
    const allCriteriaComplete = this.success_criteria.every(c => c.completed);
    const allDeliverablesComplete = this.deliverables.every(d => d.completed);

    if (allCriteriaComplete && allDeliverablesComplete) {
      if (!this._completed_at) {
        this._completed_at = new Date().toISOString();
      }
    } else {
      this._completed_at = null;
    }
  }

  // Example: Update title with auto-timestamp
  setTitle(title: string): void {
    this.title = title;
    this._touch(); // Auto-update updated_at
  }

  // Example: Add success criterion with auto-completion check
  addSuccessCriterion(criterion: SuccessCriterion): void {
    this.success_criteria.push(criterion);
    this._touch(); // Auto-update updated_at
    this._checkCompletion(); // Auto-check if completed
  }

  // Example: Mark criterion complete with auto-completion check
  completeCriterion(criterionId: string): void {
    const criterion = this.success_criteria.find(c => c.id === criterionId);
    if (criterion) {
      criterion.completed = true;
      criterion.completed_at = new Date().toISOString();
      this._touch(); // Auto-update updated_at
      this._checkCompletion(); // Auto-check if task is now complete
    }
  }
}
```

**Timestamp Rules Summary:**

| Field | When Set | Can Be Modified | Who Sets It |
|-------|---------|-----------------|-------------|
| `created_at` | Task creation | **NO** (immutable) | System (constructor) |
| `updated_at` | Task creation, then on ANY field change | **NO** (auto-only) | System (private _touch()) |
| `completed_at` | When all success_criteria AND deliverables are complete | **NO** (auto-only) | System (private _checkCompletion()) |

**Fields That Trigger `updated_at` Auto-Update:**
- title, description
- status, priority
- success_criteria (add/remove/modify any item)
- deliverables (add/remove/modify any item)
- blockers (add/remove)
- dependencies (add/remove)
- edges (add/remove)
- sub_items (add/remove)
- related_files (add/remove)
- notes (append/replace)
- c7_verified (add/remove)

**Completion Detection Logic:**
```typescript
function isTaskComplete(task: TaskNode): boolean {
  const allCriteriaComplete = task.success_criteria.every(c => c.completed);
  const allDeliverablesComplete = task.deliverables.every(d => d.completed);

  if (allCriteriaComplete && allDeliverablesComplete) {
    // Set completed_at if not already set
    if (!task.completed_at) {
      task.completed_at = new Date().toISOString();
    }
    return true;
  } else {
    // Clear completed_at if any item is un-completed
    task.completed_at = null;
    return false;
  }
}
```

### 2.2 Directed Graph Representation

**Adjacency List with Hash Map Index**

```typescript
// Primary graph structure using adjacency list
// Optimized for O(1) node lookup and O(k) edge traversal

interface TaskGraph {
  // Primary node storage (hash map for O(1) lookup)
  nodes: Map<string, TaskNode>;

  // Edge indices for fast traversal
  outgoingEdges: Map<string, Set<string>>;  // node -> nodes it points to
  incomingEdges: Map<string, Set<string>>;  // node -> nodes pointing to it

  // Metadata
  metadata: ProjectMetadata;
}

interface ProjectMetadata {
  project_name: string;
  version: string;
  created_at: string;
  updated_at: string;
  task_count: number;
  root_tasks: string[];          // Tasks with no incoming edges
}

// Why this structure?
// 1. Map<string, TaskNode> provides O(1) task lookup by ID
// 2. Separate edge indices enable O(k) traversal where k = edge count
// 3. Bidirectional edges support both forward and reverse graph operations
// 4. Set<string> prevents duplicate edges
```

### 2.3 Edge Representation

```typescript
interface GraphEdge {
  from_id: string;
  to_id: string;
  type: EdgeType;
  weight?: number;               // For ordering among siblings
  created_at: string;
}

type EdgeType =
  | 'blocks'                     // Hard dependency: to_id cannot start until from_id completes
  | 'depends_on'                 // Soft dependency: informational relationship
  | 'parent_of'                  // Hierarchical: from_id is parent of to_id
  | 'related_to';                // Loose association

// Edge storage in JSON (flattened for serialization)
interface SerializedGraph {
  nodes: Record<string, TaskNode>;
  edges: GraphEdge[];
  metadata: ProjectMetadata;
}
```

### 2.4 In-Memory vs Serialized Structure

```typescript
// In-memory representation (fast operations)
class TaskGraphStore {
  private nodes: Map<string, TaskNode>;
  private adjacencyList: Map<string, Set<string>>;
  private reverseAdjacencyList: Map<string, Set<string>>;

  // O(1) node lookup
  getNode(id: string): TaskNode | undefined {
    return this.nodes.get(id);
  }

  // O(k) outgoing edges where k = edge count
  getOutgoingEdges(nodeId: string): string[] {
    return Array.from(this.adjacencyList.get(nodeId) || []);
  }

  // O(k) incoming edges
  getIncomingEdges(nodeId: string): string[] {
    return Array.from(this.reverseAdjacencyList.get(nodeId) || []);
  }
}

// Serialized JSON format (file storage)
interface ProjectFile {
  version: '1.0.0';
  format: 'octie-project';
  metadata: ProjectMetadata;
  tasks: Record<string, TaskNode>;
  edges: Array<{ from: string; to: string; type: EdgeType }>;
  indexes: {
    byStatus: Record<TaskStatus, string[]>;
    byPriority: Record<TaskPriority, string[]>;
    rootTasks: string[];
  };
}
```

---

## 3. Storage Strategy

### 3.1 File Structure

```
project/
├── .octie/
│   ├── project.json          # Main task storage
│   ├── project.json.bak      # Automatic backup
│   ├── indexes/
│   │   ├── status.json       # Pre-computed status index
│   │   ├── priority.json     # Pre-computed priority index
│   │   └── search.json       # Full-text search index
│   ├── cache/
│   │   └── graph.cache       # Serialized graph cache
│   └── config.json           # Project configuration
└── ... (project files)
```

### 3.2 JSON File Structure

```json
{
  "$schema": "https://octie.dev/schemas/project-v1.json",
  "version": "1.0.0",
  "format": "octie-project",
  "metadata": {
    "project_name": "my-project",
    "version": "1.0.0",
    "created_at": "2026-02-15T12:00:00Z",
    "updated_at": "2026-02-15T14:30:00Z",
    "task_count": 150,
    "checksum": "sha256:abc123..."
  },
  "tasks": {
    "task-001": {
      "id": "task-001",
      "title": "Implement user authentication",
      "description": "Create authentication system with JWT tokens",
      "status": "in_progress",
      "priority": "top",
      "success_criteria": [
        {"id": "sc-1", "text": "Login endpoint returns valid JWT", "completed": true},
        {"id": "sc-2", "text": "Token refresh works correctly", "completed": false}
      ],
      "deliverables": [
        {"id": "del-1", "text": "auth.service.ts", "completed": true, "file_path": "src/auth/auth.service.ts"},
        {"id": "del-2", "text": "auth.test.ts", "completed": false}
      ],
      "blockers": [],
      "dependencies": ["task-000"],
      "edges": ["task-002", "task-003"],
      "sub_items": ["task-001a", "task-001b"],
      "related_files": ["src/auth/", "tests/auth/"],
      "notes": "Use bcrypt for password hashing",
      "c7_verified": [
        {"library_id": "/auth0/node-jwks-rsa", "verified_at": "2026-02-15T10:00:00Z"}
      ],
      // REQUIRED: Auto-managed timestamps (set by system, NOT manually editable)
      "created_at": "2026-02-15T09:00:00Z",     // Set once on task creation, immutable
      "updated_at": "2026-02-15T14:30:00Z",     // Auto-updated on ANY field change
      "completed_at": null                      // Auto-set when ALL success_criteria AND deliverables are complete
      // Note: completed_at will be automatically set to ISO timestamp when:
      //   - ALL success_criteria have "completed": true
      //   - AND ALL deliverables have "completed": true
      // It will be set back to null if any item is un-completed
    }
  },
  "edges": [
    {"from": "task-000", "to": "task-001", "type": "blocks"},
    {"from": "task-001", "to": "task-002", "type": "blocks"},
    {"from": "task-001", "to": "task-003", "type": "blocks"}
  ],
  "indexes": {
    "byStatus": {
      "not_started": ["task-010", "task-011"],
      "pending": ["task-005"],
      "in_progress": ["task-001"],
      "completed": ["task-000"],
      "blocked": []
    },
    "byPriority": {
      "top": ["task-001", "task-002"],
      "second": ["task-003", "task-004"],
      "later": ["task-010"]
    },
    "rootTasks": ["task-000"],
    "orphans": []
  }
}
```

### 3.3 Indexing Strategy

**Pre-computed Indexes for Fast Retrieval:**

```typescript
interface ProjectIndexes {
  // Status-based grouping (for list filtering)
  byStatus: Record<TaskStatus, string[]>;

  // Priority-based grouping
  byPriority: Record<TaskPriority, string[]>;

  // Root tasks (no incoming edges) - start points for traversal
  rootTasks: string[];

  // Orphan tasks (no edges at all) - potential issues
  orphans: string[];

  // Full-text search index (inverted index)
  searchText: Record<string, string[]>;  // term -> task IDs

  // File reference index (for file-based queries)
  byFile: Record<string, string[]>;      // file path -> task IDs
}

// Index update strategy
class IndexManager {
  // Incremental index update (called on every task modification)
  updateTaskIndexes(task: TaskNode, oldTask?: TaskNode): void {
    // O(1) removal from old index
    // O(1) insertion to new index
    // Total: O(1) per field change
  }

  // Rebuild all indexes (for recovery/initial load)
  rebuildIndexes(tasks: Map<string, TaskNode>): ProjectIndexes {
    // O(n) where n = task count
  }
}
```

### 3.4 Performance Targets vs Implementation

| Operation | Target | Implementation Strategy |
|-----------|--------|------------------------|
| Single task lookup | < 10ms | Map<string, TaskNode> - O(1) |
| List by status | < 20ms | Pre-computed index - O(k) where k = tasks in status |
| Full graph load | < 100ms | Stream parse JSON + in-memory Map construction |
| Topological sort | < 50ms | Kahn's algorithm with memoization |
| Graph search | < 30ms | BFS with early termination |
| Save changes | < 50ms | Atomic write (temp file + rename) |

### 3.5 Atomic Write Strategy

```typescript
class AtomicFileWriter {
  async write(path: string, data: unknown): Promise<void> {
    const tempPath = `${path}.tmp-${Date.now()}`;
    const backupPath = `${path}.bak`;

    try {
      // 1. Write to temporary file
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2));

      // 2. Verify write succeeded
      const stat = await fs.stat(tempPath);
      if (stat.size === 0) throw new Error('Empty write');

      // 3. Create backup of existing file
      if (await exists(path)) {
        await fs.copyFile(path, backupPath);
      }

      // 4. Atomic rename (POSIX) or replace (Windows)
      await fs.rename(tempPath, path);

    } catch (error) {
      // Cleanup temp file on failure
      await fs.unlink(tempPath).catch(() => {});
      throw error;
    }
  }
}
```

---

## 4. Algorithms

### 4.1 Topological Sort (Kahn's Algorithm)

```typescript
/**
 * Kahn's algorithm for topological sorting
 * Time Complexity: O(V + E) where V = vertices, E = edges
 * Space Complexity: O(V)
 */
function topologicalSort(graph: TaskGraph): {
  sorted: string[];
  hasCycle: boolean;
  cycleNodes: string[];
} {
  const inDegree = new Map<string, number>();
  const sorted: string[] = [];
  const queue: string[] = [];

  // Initialize in-degrees
  for (const [nodeId] of graph.nodes) {
    inDegree.set(nodeId, 0);
  }

  // Calculate in-degrees
  for (const [_, targets] of graph.outgoingEdges) {
    for (const target of targets) {
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
  }

  // Find all nodes with no incoming edges
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Process queue
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    // Reduce in-degree of neighbors
    const neighbors = graph.outgoingEdges.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles
  const hasCycle = sorted.length !== graph.nodes.size;
  const cycleNodes = hasCycle
    ? Array.from(graph.nodes.keys()).filter(id => !sorted.includes(id))
    : [];

  return { sorted, hasCycle, cycleNodes };
}
```

### 4.2 Cycle Detection (DFS-based)

```typescript
/**
 * Detect cycles using DFS with coloring
 * Time Complexity: O(V + E)
 * Returns cycle path if found
 */
function detectCycle(graph: TaskGraph): {
  hasCycle: boolean;
  cycles: string[][];
} {
  const WHITE = 0; // Not visited
  const GRAY = 1;  // Currently visiting
  const BLACK = 2; // Completely visited

  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];

  // Initialize all nodes as WHITE
  for (const nodeId of graph.nodes.keys()) {
    color.set(nodeId, WHITE);
    parent.set(nodeId, null);
  }

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);

    const neighbors = graph.outgoingEdges.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (color.get(neighbor) === GRAY) {
        // Found cycle - reconstruct path
        const cycle: string[] = [neighbor];
        let current: string | null = nodeId;
        while (current && current !== neighbor) {
          cycle.unshift(current);
          current = parent.get(current) || null;
        }
        cycle.unshift(neighbor);
        cycles.push(cycle);
        return true;
      }

      if (color.get(neighbor) === WHITE) {
        parent.set(neighbor, nodeId);
        if (dfs(neighbor)) {
          return true; // Can continue to find all cycles
        }
      }
    }

    color.set(nodeId, BLACK);
    return false;
  }

  // Start DFS from all unvisited nodes
  for (const nodeId of graph.nodes.keys()) {
    if (color.get(nodeId) === WHITE) {
      dfs(nodeId);
    }
  }

  return {
    hasCycle: cycles.length > 0,
    cycles
  };
}
```

### 4.3 Graph Traversal (BFS/DFS)

```typescript
/**
 * Breadth-First Search for finding reachable nodes
 */
function bfsTraversal(
  graph: TaskGraph,
  startId: string,
  direction: 'forward' | 'backward' = 'forward'
): string[] {
  const visited = new Set<string>();
  const queue = [startId];
  const result: string[] = [];

  const getNeighbors = (id: string) =>
    direction === 'forward'
      ? (graph.outgoingEdges.get(id) || new Set())
      : (graph.incomingEdges.get(id) || new Set());

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;

    visited.add(nodeId);
    result.push(nodeId);

    for (const neighbor of getNeighbors(nodeId)) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

/**
 * Depth-First Search for path finding
 */
function dfsFindPath(
  graph: TaskGraph,
  startId: string,
  endId: string
): string[] | null {
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(currentId: string): boolean {
    if (visited.has(currentId)) return false;

    visited.add(currentId);
    path.push(currentId);

    if (currentId === endId) return true;

    const neighbors = graph.outgoingEdges.get(currentId) || new Set();
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }

    path.pop();
    return false;
  }

  return dfs(startId) ? path : null;
}
```

### 4.4 Graph Operations

```typescript
/**
 * Cut a node from the graph, reconnecting edges
 * Before: A -> B -> C
 * After:  A -> C (B removed)
 */
function cutNode(graph: TaskGraph, nodeId: string): void {
  const incoming = Array.from(graph.incomingEdges.get(nodeId) || new Set());
  const outgoing = Array.from(graph.outgoingEdges.get(nodeId) || new Set());

  // Reconnect incoming to outgoing
  for (const fromId of incoming) {
    for (const toId of outgoing) {
      addEdge(graph, fromId, toId);
    }
  }

  // Remove the node
  graph.nodes.delete(nodeId);
  graph.outgoingEdges.delete(nodeId);
  graph.incomingEdges.delete(nodeId);

  // Clean up references in other nodes' edge lists
  for (const [id, edges] of graph.outgoingEdges) {
    edges.delete(nodeId);
  }
  for (const [id, edges] of graph.incomingEdges) {
    edges.delete(nodeId);
  }
}

/**
 * Insert a node between two existing nodes
 * Before: A -> C
 * After:  A -> B -> C
 */
function insertNodeBetween(
  graph: TaskGraph,
  newNodeId: string,
  afterId: string,
  beforeId: string
): void {
  // Remove existing edge
  removeEdge(graph, afterId, beforeId);

  // Add new edges
  addEdge(graph, afterId, newNodeId);
  addEdge(graph, newNodeId, beforeId);
}

/**
 * Move a subtree to a new parent
 */
function moveSubtree(
  graph: TaskGraph,
  subtreeRootId: string,
  newParentId: string
): void {
  // Remove from current parents
  const currentParents = Array.from(graph.incomingEdges.get(subtreeRootId) || new Set());
  for (const parentId of currentParents) {
    removeEdge(graph, parentId, subtreeRootId);
  }

  // Add to new parent
  addEdge(graph, newParentId, subtreeRootId);
}

/**
 * Merge two tasks into one
 */
function mergeTasks(
  graph: TaskGraph,
  sourceId: string,
  targetId: string
): TaskNode {
  const source = graph.nodes.get(sourceId)!;
  const target = graph.nodes.get(targetId)!;

  // Merge properties
  const merged: TaskNode = {
    ...target,
    description: `${target.description}\n\n--- Merged from ${source.title} ---\n${source.description}`,
    success_criteria: [...target.success_criteria, ...source.success_criteria],
    deliverables: [...target.deliverables, ...source.deliverables],
    related_files: [...new Set([...target.related_files, ...source.related_files])],
    notes: `${target.notes}\n\nMerged notes from ${source.title}:\n${source.notes}`,
    updated_at: new Date().toISOString()
  };

  // Reconnect edges from source to target
  const sourceIncoming = Array.from(graph.incomingEdges.get(sourceId) || new Set());
  const sourceOutgoing = Array.from(graph.outgoingEdges.get(sourceId) || new Set());

  for (const fromId of sourceIncoming) {
    if (fromId !== targetId) addEdge(graph, fromId, targetId);
  }
  for (const toId of sourceOutgoing) {
    if (toId !== targetId) addEdge(graph, targetId, toId);
  }

  // Remove source node
  graph.nodes.delete(sourceId);

  // Update target
  graph.nodes.set(targetId, merged);

  return merged;
}
```

### 4.5 Critical Path Analysis

```typescript
/**
 * Find critical path (longest path through graph)
 * Useful for project timeline estimation
 */
function findCriticalPath(graph: TaskGraph): {
  path: string[];
  duration: number;
} {
  const topologicalOrder = topologicalSort(graph);
  if (topologicalOrder.hasCycle) {
    throw new Error('Cannot find critical path in cyclic graph');
  }

  // Calculate earliest start times
  const earliestStart = new Map<string, number>();
  const taskDuration = 1; // Assume each task takes 1 unit

  for (const nodeId of topologicalOrder.sorted) {
    const predecessors = Array.from(graph.incomingEdges.get(nodeId) || new Set());
    const maxPredFinish = Math.max(
      0,
      ...predecessors.map(p => (earliestStart.get(p) || 0) + taskDuration)
    );
    earliestStart.set(nodeId, maxPredFinish);
  }

  // Find node with maximum finish time
  let maxFinish = 0;
  let endNode = '';

  for (const [nodeId, start] of earliestStart) {
    const finish = start + taskDuration;
    if (finish > maxFinish) {
      maxFinish = finish;
      endNode = nodeId;
    }
  }

  // Backtrack to find critical path
  const criticalPath: string[] = [endNode];
  let current = endNode;

  while (true) {
    const predecessors = Array.from(graph.incomingEdges.get(current) || new Set());
    if (predecessors.length === 0) break;

    // Find predecessor on critical path
    const currentStart = earliestStart.get(current) || 0;
    const criticalPred = predecessors.find(p => {
      const predFinish = (earliestStart.get(p) || 0) + taskDuration;
      return predFinish === currentStart;
    });

    if (!criticalPred) break;
    criticalPath.unshift(criticalPred);
    current = criticalPred;
  }

  return {
    path: criticalPath,
    duration: maxFinish
  };
}
```

---

## 5. Testing Strategy

### 5.1 Testing Framework

**Primary: Vitest**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'tests/'],
      threshold: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },
    benchmark: {
      include: ['tests/**/*.bench.ts']
    }
  }
});
```

### 5.2 Unit Tests

**Test File Structure:**

```
tests/
├── unit/
│   ├── graph/
│   │   ├── topological-sort.test.ts
│   │   ├── cycle-detection.test.ts
│   │   ├── traversal.test.ts
│   │   └── operations.test.ts
│   ├── storage/
│   │   ├── file-operations.test.ts
│   │   ├── indexing.test.ts
│   │   └── atomic-write.test.ts
│   ├── cli/
│   │   ├── commands.test.ts
│   │   └── output-formatters.test.ts
│   └── models/
│       └── task-node.test.ts
├── integration/
│   ├── cli-workflow.test.ts
│   ├── web-api.test.ts
│   └── storage-integration.test.ts
├── fixtures/
│   ├── sample-project.json
│   ├── large-project.json (1000+ tasks)
│   └── cyclic-graph.json
└── benchmark/
    ├── graph-operations.bench.ts
    └── storage-operations.bench.ts
```

**Sample Unit Test:**

```typescript
// tests/unit/graph/topological-sort.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { topologicalSort, createEmptyGraph, addNode, addEdge } from '@/graph';

describe('topologicalSort', () => {
  let graph: TaskGraph;

  beforeEach(() => {
    graph = createEmptyGraph();
  });

  it('should return empty array for empty graph', () => {
    const result = topologicalSort(graph);
    expect(result.sorted).toEqual([]);
    expect(result.hasCycle).toBe(false);
  });

  it('should return single node for graph with one node', () => {
    addNode(graph, { id: 'a', title: 'Task A' });
    const result = topologicalSort(graph);
    expect(result.sorted).toEqual(['a']);
    expect(result.hasCycle).toBe(false);
  });

  it('should correctly sort linear chain', () => {
    addNode(graph, { id: 'a', title: 'Task A' });
    addNode(graph, { id: 'b', title: 'Task B' });
    addNode(graph, { id: 'c', title: 'Task C' });
    addEdge(graph, 'a', 'b');
    addEdge(graph, 'b', 'c');

    const result = topologicalSort(graph);
    expect(result.sorted).toEqual(['a', 'b', 'c']);
    expect(result.hasCycle).toBe(false);
  });

  it('should handle parallel branches', () => {
    addNode(graph, { id: 'root', title: 'Root' });
    addNode(graph, { id: 'left', title: 'Left' });
    addNode(graph, { id: 'right', title: 'Right' });
    addNode(graph, { id: 'merge', title: 'Merge' });
    addEdge(graph, 'root', 'left');
    addEdge(graph, 'root', 'right');
    addEdge(graph, 'left', 'merge');
    addEdge(graph, 'right', 'merge');

    const result = topologicalSort(graph);
    expect(result.sorted[0]).toBe('root');
    expect(result.sorted[3]).toBe('merge');
    expect(result.hasCycle).toBe(false);
  });

  it('should detect cycle', () => {
    addNode(graph, { id: 'a', title: 'Task A' });
    addNode(graph, { id: 'b', title: 'Task B' });
    addNode(graph, { id: 'c', title: 'Task C' });
    addEdge(graph, 'a', 'b');
    addEdge(graph, 'b', 'c');
    addEdge(graph, 'c', 'a');

    const result = topologicalSort(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodes.length).toBeGreaterThan(0);
  });

  it('should handle self-loop', () => {
    addNode(graph, { id: 'a', title: 'Task A' });
    addEdge(graph, 'a', 'a');

    const result = topologicalSort(graph);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodes).toContain('a');
  });
});
```

### 5.3 Performance Benchmarks

```typescript
// tests/benchmark/graph-operations.bench.ts
import { bench, describe } from 'vitest';
import { generateRandomGraph, topologicalSort, detectCycle, bfsTraversal } from '@/graph';

describe('graph operations performance', () => {
  const graph100 = generateRandomGraph(100);
  const graph1000 = generateRandomGraph(1000);

  bench('topological sort - 100 nodes', () => {
    topologicalSort(graph100);
  });

  bench('topological sort - 1000 nodes', () => {
    topologicalSort(graph1000);
  });

  bench('cycle detection - 100 nodes', () => {
    detectCycle(graph100);
  });

  bench('cycle detection - 1000 nodes', () => {
    detectCycle(graph1000);
  });

  bench('BFS traversal - 100 nodes', () => {
    const rootId = Array.from(graph100.nodes.keys())[0];
    bfsTraversal(graph100, rootId);
  });

  bench('BFS traversal - 1000 nodes', () => {
    const rootId = Array.from(graph1000.nodes.keys())[0];
    bfsTraversal(graph1000, rootId);
  });
});
```

### 5.4 Integration Tests

```typescript
// tests/integration/cli-workflow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CLI workflow integration', () => {
  let tempDir: string;
  const cli = 'node dist/cli.js';

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'octie-test-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should initialize a new project', () => {
    const output = execSync(`${cli} init --project ${tempDir}`, { encoding: 'utf-8' });
    expect(output).toContain('Initialized Octie project');
  });

  it('should create a task', () => {
    const output = execSync(
      `${cli} create --title "Test Task" --priority top --project ${tempDir}`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('Created task');
  });

  it('should list tasks', () => {
    const output = execSync(`${cli} list --project ${tempDir}`, { encoding: 'utf-8' });
    expect(output).toContain('Test Task');
  });

  it('should update task status', () => {
    // First get the task ID
    const listOutput = execSync(`${cli} list --format json --project ${tempDir}`, { encoding: 'utf-8' });
    const tasks = JSON.parse(listOutput);
    const taskId = Object.keys(tasks)[0];

    const output = execSync(
      `${cli} update ${taskId} --status in_progress --project ${tempDir}`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('Updated task');
  });

  it('should export to markdown', () => {
    const listOutput = execSync(`${cli} list --format json --project ${tempDir}`, { encoding: 'utf-8' });
    const tasks = JSON.parse(listOutput);
    const taskId = Object.keys(tasks)[0];

    const output = execSync(
      `${cli} get ${taskId} --format md --project ${tempDir}`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('## [ ] Test Task');
  });
});
```

### 5.5 Test Coverage Requirements

| Component | Minimum Coverage | Rationale |
|-----------|------------------|-----------|
| Graph algorithms | 90% | Core functionality, complex edge cases |
| Storage operations | 85% | Data integrity critical |
| CLI commands | 75% | User-facing, but well-defined |
| Web API | 80% | Integration points |
| Output formatters | 70% | Less critical, visual verification |

---

## 6. Build and Deployment

### 6.1 Project Structure

```
octie/
├── src/
│   ├── cli/
│   │   ├── index.ts              # CLI entry point
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── create.ts
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   ├── merge.ts
│   │   │   ├── graph.ts
│   │   │   ├── export.ts
│   │   │   └── serve.ts
│   │   └── output/
│   │       ├── markdown.ts
│   │       ├── json.ts
│   │       └── table.ts
│   ├── core/
│   │   ├── graph/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── operations.ts
│   │   │   ├── traversal.ts
│   │   │   ├── sort.ts
│   │   │   └── cycle.ts
│   │   ├── storage/
│   │   │   ├── index.ts
│   │   │   ├── file-store.ts
│   │   │   ├── indexer.ts
│   │   │   └── atomic-write.ts
│   │   └── models/
│   │       ├── task-node.ts
│   │       └── project.ts
│   ├── web/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── tasks.ts
│   │   │   └── graph.ts
│   │   └── middleware/
│   │       ├── validation.ts
│   │       └── error-handler.ts
│   └── types/
│       └── index.ts
├── web-ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GraphView.tsx
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   └── Toolbar.tsx
│   │   ├── hooks/
│   │   │   ├── useTasks.ts
│   │   │   └── useGraph.ts
│   │   ├── store/
│   │   │   └── taskStore.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.js
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── benchmark/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 6.2 Build Configuration

**package.json:**

```json
{
  "name": "octie",
  "version": "1.0.0",
  "type": "module",
  "description": "Graph-based task management CLI with web visualization",
  "bin": {
    "octie": "./dist/cli/index.js"
  },
  "main": "./dist/core/index.js",
  "types": "./dist/core/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/core/index.d.ts",
      "import": "./dist/core/index.js"
    },
    "./cli": "./dist/cli/index.js"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "tsc && npm run build:web",
    "build:cli": "tsc",
    "build:web": "cd web-ui && vite build",
    "dev": "tsc --watch",
    "dev:web": "cd web-ui && vite",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:bench": "vitest bench",
    "lint": "eslint src tests --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "prepublishOnly": "npm run build && npm test"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "keywords": ["cli", "task-management", "graph", "project-management"],
  "license": "MIT"
}
```

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 6.3 CLI Packaging

**For npm distribution:**

```bash
# Build and test
npm run build
npm test

# Pack for local testing
npm pack

# Publish to npm
npm publish
```

**For standalone binary (optional, using pkg or bun):**

```json
// package.json additions for pkg
{
  "pkg": {
    "scripts": "dist/**/*.js",
    "assets": ["web-ui/dist/**/*"],
    "targets": ["node20-linux-x64", "node20-macos-x64", "node20-win-x64"],
    "outputPath": "bin"
  }
}
```

### 6.4 Web UI Build

**vite.config.ts (web-ui):**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/web-ui',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          graph: ['@reactflow/core', '@reactflow/controls']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

### 6.5 Deployment Options

**Option 1: npm global install (recommended)**

```bash
# Install globally
npm install -g octie

# Usage
octie init
octie create --title "My Task"
octie serve --port 3000
```

**Option 2: npx (no install)**

```bash
npx octie init
npx octie list
```

**Option 3: Docker (for web UI hosting)**

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/cli/index.js", "serve", "--host", "0.0.0.0"]
```

```bash
# Build and run
docker build -t octie .
docker run -p 3000:3000 -v /path/to/project:/app/project octie
```

**Option 4: Project-local install**

```bash
# Install as dev dependency
npm install --save-dev octie

# Add to package.json scripts
{
  "scripts": {
    "tasks": "octie"
  }
}

# Usage
npm run tasks list
```

### 6.6 Release Process

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage

  publish:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  docker:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ github.repository }}:${{ github.ref_name }}
```

---

## 7. Cross-Platform Considerations

### 7.1 File Path Handling

```typescript
import { join, resolve, sep } from 'path';
import { homedir, platform } from 'os';

// Cross-platform path utilities
export function getProjectPath(projectDir?: string): string {
  if (projectDir) return resolve(projectDir);

  // Default to current directory
  return process.cwd();
}

export function getConfigPath(): string {
  const platformType = platform();

  switch (platformType) {
    case 'win32':
      return join(process.env.APPDATA || homedir(), 'octie');
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'octie');
    default: // linux and others
      return join(homedir(), '.config', 'octie');
  }
}

// Normalize file paths for storage
export function normalizePath(path: string): string {
  return path.split(sep).join('/');  // Always use forward slashes
}
```

### 7.2 Terminal Compatibility

```typescript
// Handle different terminal capabilities
import { supportsColor, hasColors } from 'chalk';

export function formatOutput(text: string, color: string): string {
  if (!supportsColor) {
    return text;  // Strip colors for non-color terminals
  }
  // Apply color formatting
  return applyColor(text, color);
}

// Windows terminal handling
if (platform() === 'win32') {
  // Enable ANSI escape codes on Windows
  process.stdout.write('\x1b[?25h');  // Show cursor
}
```

### 7.3 File Locking

```typescript
// Cross-platform file locking for concurrent access
import { open, close, flock } from 'fs';

export async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>
): Promise<T> {
  const fd = await open(filePath, 'r');

  try {
    // Exclusive lock
    await flock(fd, 'ex');

    // Wait a bit for lock acquisition
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await operation();
    return result;
  } finally {
    await flock(fd, 'un');
    await close(fd);
  }
}
```

---

## 8. Error Handling and Recovery

### 8.1 Error Types

```typescript
// Custom error types for better error handling
export class OctieError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'OctieError';
  }
}

export class TaskNotFoundError extends OctieError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, 'TASK_NOT_FOUND', { taskId });
  }
}

export class CircularDependencyError extends OctieError {
  constructor(cyclePath: string[]) {
    super(
      `Circular dependency detected: ${cyclePath.join(' -> ')}`,
      'CIRCULAR_DEPENDENCY',
      { cyclePath }
    );
  }
}

export class FileOperationError extends OctieError {
  constructor(operation: string, path: string, cause: Error) {
    super(
      `File operation failed: ${operation} on ${path}`,
      'FILE_OPERATION_ERROR',
      { operation, path, cause: cause.message }
    );
  }
}

export class ValidationError extends OctieError {
  constructor(field: string, value: unknown, expected: string) {
    super(
      `Validation failed for ${field}: expected ${expected}, got ${typeof value}`,
      'VALIDATION_ERROR',
      { field, value, expected }
    );
  }
}

export class AtomicTaskViolationError extends OctieError {
  constructor(taskTitle: string, reason: string) {
    super(
      `Task "${taskTitle}" violates atomic task requirements: ${reason}`,
      'ATOMIC_TASK_VIOLATION',
      { taskTitle, reason }
    );
  }
}
```

### 8.2 Required Field Validation

**CRITICAL: All Required Fields Must Have Values at Task Creation**

```typescript
import { z } from 'zod';

// Schema for task creation - all required fields validated
const TaskCreateSchema = z.object({
  // REQUIRED: Identity
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .refine(val => val.trim().length > 0, "Title cannot be empty or whitespace"),

  // REQUIRED: Description
  description: z.string()
    .min(1, "Description is required")
    .max(10000, "Description must be 10000 characters or less")
    .refine(val => val.trim().length > 0, "Description cannot be empty or whitespace"),

  // REQUIRED: Status
  status: z.enum(['not_started', 'pending', 'in_progress', 'completed', 'blocked'])
    .default('not_started'),

  // REQUIRED: Priority
  priority: z.enum(['top', 'second', 'later'])
    .default('second'),

  // REQUIRED: Success Criteria (at least one)
  success_criteria: z.array(z.object({
    id: z.string().uuid(),
    text: z.string().min(1, "Criterion text cannot be empty"),
    completed: z.boolean().default(false)
  })).min(1, "At least one success criterion is required"),

  // REQUIRED: Deliverables (at least one)
  deliverables: z.array(z.object({
    id: z.string().uuid(),
    text: z.string().min(1, "Deliverable text cannot be empty"),
    completed: z.boolean().default(false),
    file_path: z.string().optional()
  })).min(1, "At least one deliverable is required"),

  // OPTIONAL: Blockers
  blockers: z.array(z.string().uuid()).default([]),

  // OPTIONAL: Dependencies
  dependencies: z.array(z.string().uuid()).default([]),

  // OPTIONAL: Related files
  related_files: z.array(z.string()).default([]),

  // OPTIONAL: Notes
  notes: z.string().default(""),

  // OPTIONAL: C7 verifications
  c7_verified: z.array(z.object({
    library_id: z.string(),
    verified_at: z.string(),
    notes: z.string().optional()
  })).default([])
});

// Validation function
export function validateTaskCreation(input: unknown): TaskCreateInput {
  try {
    return TaskCreateSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new ValidationError('task creation', input, formatted);
    }
    throw error;
  }
}
```

### 8.3 Atomic Task Validation

**Atomic Task Requirements: Tasks MUST be specific, executable, and verifiable.**

```typescript
interface AtomicTaskRules {
  // Title specificity
  titleContainsVerb: boolean;       // Title should contain action verb
  titleIsSpecific: boolean;          // Not vague like "fix stuff" or "do things"
  titleMaxLength: 200;              // Enforced by schema

  // Description clarity
  descriptionMinLength: 50;         // Must be descriptive enough
  descriptionMaxLength: 10000;      // Not a novel

  // Success criteria
  minSuccessCriteria: 1;            // At least one criterion
  maxSuccessCriteria: 10;           // Not too many (suggests non-atomic)
  criteriaMustBeQuantitative: boolean; // Measurable, not subjective

  // Deliverables
  minDeliverables: 1;               // At least one output
  maxDeliverables: 5;               // Reasonable number

  // Size estimation
  estimatedHoursMax: 16;            // Max 2 days
  suggestedHoursMax: 8;             // Ideal: one session
}

// Atomic task validator
export function validateAtomicTask(task: TaskCreateInput): void {
  const violations: string[] = [];

  // Check title specificity
  const actionVerbs = [
    'implement', 'create', 'add', 'fix', 'remove', 'update', 'refactor',
    'write', 'test', 'document', 'deploy', 'configure', 'setup',
    'design', 'analyze', 'optimize', 'migrate', 'integrate'
  ];

  const titleLower = task.title.toLowerCase();
  const hasActionVerb = actionVerbs.some(verb => titleLower.includes(verb));

  if (!hasActionVerb) {
    violations.push('Title should contain an action verb (implement, create, fix, etc.)');
  }

  // Check for vague titles
  const vaguePatterns = [
    'stuff', 'things', 'etc', 'various', 'multiple',
    'some', 'something', 'fix', 'update', 'work on'
  ];

  const isVague = vaguePatterns.some(pattern =>
    titleLower === pattern || titleLower.startsWith(pattern + ' ')
  );

  if (isVague) {
    violations.push('Title is too vague. Be specific about what the task does.');
  }

  // Check description length
  if (task.description.length < 50) {
    violations.push('Description is too short. Provide more detail about what this task does.');
  }

  // Check success criteria count
  if (task.success_criteria.length > 10) {
    violations.push('Too many success criteria (>10). Consider splitting into smaller tasks.');
  }

  // Check deliverables count
  if (task.deliverables.length > 5) {
    violations.push('Too many deliverables (>5). Consider splitting into smaller tasks.');
  }

  // Check if criteria are quantitative
  const hasVagueCriteria = task.success_criteria.some(c => {
    const lower = c.text.toLowerCase();
    const vagueWords = ['good', 'better', 'proper', 'nice', 'clean', 'fast'];
    return vagueWords.some(word => lower.includes(word));
  });

  if (hasVagueCriteria) {
    violations.push('Success criteria must be quantitative and measurable. Avoid subjective terms like "good", "better", "clean".');
  }

  if (violations.length > 0) {
    throw new AtomicTaskViolationError(task.title, violations.join('; '));
  }
}
```

### 8.4 Example Valid vs Invalid Tasks

**❌ INVALID: Violates Atomic Task Requirements**

```typescript
// TOO VAGUE
{
  title: "Fix stuff",
  description: "Fix various issues",
  success_criteria: [{ text: "Things are better", completed: false }],
  deliverables: [{ text: "Fixed code", completed: false }]
}
// Error: Title is vague, description too short, subjective criteria

// TOO LARGE
{
  title: "Build authentication system",
  description: "Implement login, signup, password reset, OAuth, MFA",
  success_criteria: [
    { text: "Login works", completed: false },
    { text: "Signup works", completed: false },
    { text: "Password reset works", completed: false },
    { text: "OAuth works", completed: false },
    { text: "MFA works", completed: false },
    { text: "Session management works", completed: false },
    { text: "Token refresh works", completed: false },
    { text: "Rate limiting works", completed: false },
    { text: "Security tests pass", completed: false },
    { text: "Documentation complete", completed: false },
    { text: "Tests pass", completed: false }
  ],
  deliverables: [
    { text: "Auth service", completed: false },
    { text: "Login component", completed: false },
    { text: "Signup component", completed: false },
    { text: "Password reset", completed: false },
    { text: "OAuth integration", completed: false },
    { text: "MFA integration", completed: false }
  ]
}
// Error: Too many criteria (>10), too many deliverables (>5), should be split
```

**✅ VALID: Atomic Tasks**

```typescript
// SPECIFIC and EXECUTABLE
{
  title: "Implement login endpoint",
  description: "Create POST /auth/login endpoint that accepts username/password and returns JWT token",
  success_criteria: [
    { text: "Endpoint returns 200 with valid JWT on correct credentials", completed: false },
    { text: "Endpoint returns 401 on invalid credentials", completed: false },
    { text: "Password is hashed with bcrypt before comparison", completed: false }
  ],
  deliverables: [
    { text: "src/api/auth/login.ts", completed: false },
    { text: "tests/api/auth/login.test.ts", completed: false }
  ]
}
// Valid: Clear scope, measurable criteria, reasonable deliverables

{
  title: "Add password hashing utility",
  description: "Create hashPassword function using bcrypt with 10 salt rounds",
  success_criteria: [
    { text: "hashPassword function returns bcrypt hash", completed: false },
    { text: "Hash uses 10 salt rounds", completed: false },
    { text: "Unit tests pass with 100% coverage", completed: false }
  ],
  deliverables: [
    { text: "src/auth/hashing.ts", completed: false },
    { text: "tests/auth/hashing.test.ts", completed: false }
  ]
}
// Valid: Single purpose, specific criteria, testable
```

### 8.5 CLI Help Flag Documentation

**CRITICAL: The --help flag MUST display atomic task requirements prominently.**

```bash
$ octie create --help

Usage: octie create [options]

Create a new atomic task in the project.

REQUIRED OPTIONS:
  --title <string>           Task title (max 200 chars)
                            Must contain an action verb (implement, create, fix, etc.)
                            Example: "Implement login endpoint"

  --description <string>     Detailed task description (min 50 chars, max 10000)
                            Explain what this task does and how it will be accomplished

  --success-criteria <text>  Quantitative success criterion (can be specified multiple times)
                            At least one criterion is REQUIRED
                            Must be measurable and verifiable
                            Example: "Endpoint returns 200 with valid JWT"

  --deliverable <text>      Specific output expected (can be specified multiple times)
                            At least one deliverable is REQUIRED
                            Example: "src/api/auth/login.ts"

TASK REQUIREMENTS:
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

OPTIONS:
  -p, --priority <level>       Task priority: top | second | later (default: "second")
  -b, --blockers <ids>         Comma-separated task IDs that block this task
  -d, --dependencies <ids>     Comma-separated task IDs this depends on
  -f, --related-files <paths>   Comma-separated file paths relevant to task
  -n, --notes <text>           Additional context or comments
  -i, --interactive            Interactive mode with prompts

EXAMPLES:
  # Create an atomic task
  octie create \
    --title "Implement login endpoint" \
    --description "Create POST /auth/login that validates credentials and returns JWT" \
    --success-criteria "Returns 200 with valid JWT on correct credentials" \
    --success-criteria "Returns 401 on invalid credentials" \
    --success-criteria "Password hashed with bcrypt before comparison" \
    --deliverable "src/api/auth/login.ts" \
    --deliverable "tests/api/auth/login.test.ts" \
    --priority top

  # Interactive mode (prompts for required fields)
  octie create --interactive

  # Show validation errors for non-atomic task
  octie create --title "Fix stuff"
  # Error: Title "Fix stuff" is too vague. Be specific about what the task does.
  # Error: Description is required. Provide more detail about what this task does.
```

### 8.6 Recovery Mechanisms

```typescript
// Auto-recovery from corrupted files
export async function recoverProject(projectPath: string): Promise<RecoveryResult> {
  const mainFile = join(projectPath, '.octie', 'project.json');
  const backupFile = join(projectPath, '.octie', 'project.json.bak');

  try {
    // Try to load main file
    const data = await loadProject(mainFile);
    return { success: true, source: 'main', data };
  } catch (mainError) {
    console.warn('Main file corrupted, trying backup...');

    try {
      // Try backup file
      const data = await loadProject(backupFile);
      // Restore main file from backup
      await fs.copyFile(backupFile, mainFile);
      return { success: true, source: 'backup', data, warning: 'Restored from backup' };
    } catch (backupError) {
      return {
        success: false,
        error: 'Both main and backup files are corrupted',
        suggestion: 'Re-initialize project or restore from version control'
      };
    }
  }
}
```

---

## 9. Performance Optimization Summary

### 9.1 Optimization Techniques

| Technique | Implementation | Impact |
|-----------|----------------|--------|
| Lazy loading | Load tasks on-demand, not all at once | Reduces initial memory by 50%+ |
| Memoization | Cache topological sort results | 10x faster repeated operations |
| Indexing | Pre-compute status/priority indexes | O(k) filter instead of O(n) |
| Streaming | Stream large JSON files | Handles 10,000+ tasks |
| Atomic writes | Temp file + rename | Zero data corruption |

### 9.2 Performance Benchmarks (Target)

| Operation | 100 tasks | 1,000 tasks | 10,000 tasks |
|-----------|-----------|-------------|--------------|
| Single task get | 2ms | 5ms | 10ms |
| List all tasks | 10ms | 50ms | 200ms |
| Filter by status | 3ms | 15ms | 50ms |
| Topological sort | 5ms | 30ms | 150ms |
| Full graph load | 20ms | 80ms | 500ms |
| Save changes | 10ms | 40ms | 200ms |

---

## 10. Security Considerations

### 10.1 Input Validation

```typescript
import { z } from 'zod';

// Schema for task creation
const TaskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000),
  status: z.enum(['not_started', 'pending', 'in_progress', 'completed', 'blocked']),
  priority: z.enum(['top', 'second', 'later']),
  blockers: z.array(z.string().uuid()).default([]),
  related_files: z.array(z.string()).default([]),
  success_criteria: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([])
});

// Validate and sanitize input
export function validateTaskInput(input: unknown): TaskInput {
  return TaskCreateSchema.parse(input);
}

// Sanitize file paths (prevent directory traversal)
export function sanitizePath(path: string): string {
  const normalized = normalize(path);
  if (normalized.includes('..')) {
    throw new ValidationError('path', path, 'valid path without ..');
  }
  return normalized;
}
```

### 10.2 Safe File Operations

```typescript
// Prevent code execution through file paths
const ALLOWED_EXTENSIONS = ['.ts', '.js', '.json', '.md', '.txt'];

export function validateFilePath(path: string): boolean {
  const ext = extname(path).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }
  return true;
}

// No shell command execution from task data
export function isSafeTaskData(task: TaskNode): boolean {
  const dangerousPatterns = [
    /\$\(/,  // Command substitution
    /`/,     // Backticks
    /eval\(/,
    /exec\(/,
    /spawn\(/
  ];

  const checkString = JSON.stringify(task);
  return !dangerousPatterns.some(p => p.test(checkString));
}
```

---

## Appendix A: API Reference

### CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `octie init` | Initialize new project | `octie init --project ./my-project` |
| `octie create` | Create new task | `octie create --title "Task name" --priority top` |
| `octie list` | List tasks | `octie list --status pending --priority top` |
| `octie get <id>` | Get task details | `octie get task-001 --format md` |
| `octie update <id>` | Update task | `octie update task-001 --status in_progress` |
| `octie delete <id>` | Delete task | `octie delete task-001 --reconnect` |
| `octie merge <src> <tgt>` | Merge tasks | `octie merge task-001 task-002` |
| `octie graph` | Graph operations | `octie graph validate` |
| `octie export` | Export project | `octie export --format md --output tasks.md` |
| `octie import` | Import tasks | `octie import --file tasks.json` |
| `octie serve` | Start web server | `octie serve --port 3000` |

### Web API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/:id` | Get task by ID |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/merge` | Merge with another task |
| GET | `/api/graph` | Get graph structure |
| GET | `/api/graph/topology` | Get topological order |
| POST | `/api/graph/validate` | Validate graph structure |
| GET | `/api/graph/cycles` | Detect cycles |
| GET | `/api/stats` | Get project statistics |

---

## Appendix A-1: CLI Timestamp Handling Rules

**CRITICAL**: CLI commands MUST NOT allow manual timestamp manipulation.

### Forbidden Operations

| Command | Forbidden Flag | Reason |
|---------|---------------|--------|
| `octie create` | `--created-at` | System sets created_at automatically |
| `octie create` | `--updated-at` | System sets updated_at automatically |
| `octie create` | `--completed-at` | System sets completed_at based on completion |
| `octie update` | `--created-at` | created_at is immutable |
| `octie update` | `--set-updated-at` | updated_at is auto-managed |
| `octie update` | `--set-completed-at` | completed_at is auto-managed |
| `octie update` | `--completed-at <date>` | Use --complete-criterion/--complete-deliverable instead |
| `octie import` | Importing with timestamp values | Timestamps must be recalculated on import |

### Correct Usage Patterns

```bash
# ❌ WRONG: Manual timestamp setting
octie create --title "Task" --created-at "2026-01-01T00:00:00Z"
octie update task-001 --set-completed-at "2026-01-15T12:00:00Z"

# ✅ CORRECT: Let system manage timestamps
octie create --title "Task"                           # System sets created_at
octie update task-001 --status completed              # System updates updated_at
octie update task-001 --complete-criterion "sc-1"     # System checks completion, may set completed_at
```

### Completion Trigger Flow

```bash
# Step 1: Create task (created_at set, updated_at = created_at, completed_at = null)
octie create --title "My Task" \
  --success-criterion "Unit tests pass" \
  --success-criterion "Code review approved" \
  --deliverable "Implementation"

# Step 2: Mark first criterion complete (updated_at auto-updated, completed_at still null)
octie update task-001 --complete-criterion "sc-1"

# Step 3: Mark deliverable complete (updated_at auto-updated, completed_at still null)
octie update task-001 --complete-deliverable "del-1"

# Step 4: Mark second criterion complete (ALL complete → completed_at auto-set!)
octie update task-001 --complete-criterion "sc-2"
# Result: completed_at is now set to current ISO timestamp

# Step 5: If any item is un-completed, completed_at is auto-cleared
octie update task-001 --add-success-criterion "Add integration tests"
# Result: completed_at is back to null (new un-completed criterion added)
```

### Import Behavior

When importing tasks from JSON:

```bash
octie import --file backup.json
```

**Timestamp Handling on Import:**
- `created_at`: **PRESERVED** - Keep original creation time
- `updated_at`: **RESET** - Set to current import time (task is being modified)
- `completed_at`: **RECALCULATED** - Check if all success_criteria and deliverables are complete, set accordingly

This ensures data integrity while acknowledging the import operation as a modification.

---

## Appendix B: Configuration Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "project_name": {
      "type": "string",
      "description": "Name of the project"
    },
    "default_priority": {
      "type": "string",
      "enum": ["top", "second", "later"],
      "default": "second"
    },
    "auto_backup": {
      "type": "boolean",
      "default": true
    },
    "backup_count": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10,
      "default": 3
    },
    "web_server": {
      "type": "object",
      "properties": {
        "port": {
          "type": "integer",
          "default": 3000
        },
        "host": {
          "type": "string",
          "default": "localhost"
        },
        "open_browser": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "output": {
      "type": "object",
      "properties": {
        "default_format": {
          "type": "string",
          "enum": ["json", "md", "table"],
          "default": "table"
        },
        "color_scheme": {
          "type": "string",
          "enum": ["default", "dark", "light", "none"],
          "default": "default"
        }
      }
    }
  }
}
```

---

*Document Version: 1.0.0*
*Last Updated: 2026-02-15*
*Author: Technical Architecture Team*
