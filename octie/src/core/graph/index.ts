/**
 * Task Graph data structure
 *
 * Implements a directed graph using adjacency lists for O(1) node lookup
 * and O(k) edge traversal where k is the number of edges.
 *
 * Graph Structure:
 * - nodes: Map<taskId, TaskNode> for O(1) node lookup
 * - outgoingEdges: Map<taskId, Set<targetTaskIds>> for forward traversal
 * - incomingEdges: Map<taskId, Set<sourceTaskIds>> for reverse traversal
 *
 * @module core/graph
 */

import type { TaskGraph, ProjectMetadata } from '../../types/index.js';
import { TaskNotFoundError, ValidationError } from '../../types/index.js';
import { TaskNode } from '../models/task-node.js';

/**
 * TaskGraphStore class
 *
 * Manages the task graph data structure with efficient lookup and traversal.
 * Uses Map and Set for optimal performance:
 * - O(1) node lookup by ID
 * - O(k) edge traversal where k = edge count
 * - O(1) edge existence checking
 */
export class TaskGraphStore {
  /** Primary node storage (hash map for O(1) lookup) */
  private _nodes: Map<string, TaskNode>;

  /** Outgoing edges: node -> nodes it points to */
  private _outgoingEdges: Map<string, Set<string>>;

  /** Incoming edges: node -> nodes pointing to it */
  private _incomingEdges: Map<string, Set<string>>;

  /** Graph metadata */
  private _metadata: ProjectMetadata;

  /**
   * Create a new TaskGraphStore
   * @param metadata - Optional project metadata
   */
  constructor(metadata?: ProjectMetadata) {
    this._nodes = new Map();
    this._outgoingEdges = new Map();
    this._incomingEdges = new Map();
    this._metadata = metadata || {
      project_name: 'Untitled Project',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get the number of tasks in the graph
   */
  get size(): number {
    return this._nodes.size;
  }

  /**
   * Get the graph metadata
   */
  get metadata(): ProjectMetadata {
    return { ...this._metadata };
  }

  /**
   * Update graph metadata
   * @param metadata - New metadata values (partial update)
   */
  setMetadata(metadata: Partial<ProjectMetadata>): void {
    this._metadata = {
      ...this._metadata,
      ...metadata,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get a task node by ID
   * @param id - Task ID to look up
   * @returns Task node or undefined if not found
   * @complexity O(1)
   */
  getNode(id: string): TaskNode | undefined {
    return this._nodes.get(id);
  }

  /**
   * Get a task node by ID or throw error
   * @param id - Task ID to look up
   * @returns Task node
   * @throws {TaskNotFoundError} If task not found
   * @complexity O(1)
   */
  getNodeOrThrow(id: string): TaskNode {
    const node = this._nodes.get(id);
    if (!node) {
      throw new TaskNotFoundError(id);
    }
    return node;
  }

  /**
   * Check if a task exists
   * @param id - Task ID to check
   * @returns True if task exists
   * @complexity O(1)
   */
  hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  /**
   * Get all task IDs in the graph
   * @returns Array of task IDs
   */
  getAllTaskIds(): string[] {
    return Array.from(this._nodes.keys());
  }

  /**
   * Get all task nodes in the graph
   * @returns Array of task nodes
   */
  getAllTasks(): TaskNode[] {
    return Array.from(this._nodes.values());
  }

  /**
   * Add a task node to the graph
   * @param node - Task node to add
   * @throws {ValidationError} If task ID already exists
   * @complexity O(1)
   */
  addNode(node: TaskNode): void {
    if (this._nodes.has(node.id)) {
      throw new ValidationError(
        `Task with ID '${node.id}' already exists in graph.`,
        'id'
      );
    }

    this._nodes.set(node.id, node);
    this._outgoingEdges.set(node.id, new Set(node.edges));

    // Only initialize incoming edges if not already set (from previous node additions)
    if (!this._incomingEdges.has(node.id)) {
      this._incomingEdges.set(node.id, new Set());
    }

    // Update incoming edges for all outgoing edges
    for (const targetId of node.edges) {
      if (!this._incomingEdges.has(targetId)) {
        this._incomingEdges.set(targetId, new Set());
      }
      this._incomingEdges.get(targetId)!.add(node.id);
    }

    this._metadata.updated_at = new Date().toISOString();
  }

  /**
   * Remove a task node from the graph
   * @param id - Task ID to remove
   * @throws {TaskNotFoundError} If task not found
   * @complexity O(k) where k is the number of edges
   */
  removeNode(id: string): void {
    if (!this._nodes.has(id)) {
      throw new TaskNotFoundError(id);
    }

    // Remove all edges pointing to this node
    const incomingSources = this._incomingEdges.get(id) || new Set();
    for (const sourceId of incomingSources) {
      this._outgoingEdges.get(sourceId)?.delete(id);
      // Also update the source node's edges field
      const sourceNode = this._nodes.get(sourceId);
      if (sourceNode) {
        sourceNode.edges = sourceNode.edges.filter(eid => eid !== id);
      }
    }

    // Remove all edges from this node
    const outgoingTargets = this._outgoingEdges.get(id) || new Set();
    for (const targetId of outgoingTargets) {
      this._incomingEdges.get(targetId)?.delete(id);
    }

    // Remove the node and edge maps
    this._nodes.delete(id);
    this._outgoingEdges.delete(id);
    this._incomingEdges.delete(id);

    this._metadata.updated_at = new Date().toISOString();
  }

  /**
   * Update a task node in the graph
   * @param node - Task node with updated values
   * @throws {TaskNotFoundError} If task not found
   * @complexity O(1)
   */
  updateNode(node: TaskNode): void {
    if (!this._nodes.has(node.id)) {
      throw new TaskNotFoundError(node.id);
    }

    this._nodes.set(node.id, node);
    this._metadata.updated_at = new Date().toISOString();
  }

  /**
   * Get outgoing edges for a node
   * @param nodeId - Source task ID
   * @returns Array of target task IDs
   * @complexity O(k) where k is the number of outgoing edges
   */
  getOutgoingEdges(nodeId: string): string[] {
    return Array.from(this._outgoingEdges.get(nodeId) || []);
  }

  /**
   * Get incoming edges for a node
   * @param nodeId - Target task ID
   * @returns Array of source task IDs
   * @complexity O(k) where k is the number of incoming edges
   */
  getIncomingEdges(nodeId: string): string[] {
    return Array.from(this._incomingEdges.get(nodeId) || []);
  }

  /**
   * Add an edge between two nodes
   * @param fromId - Source task ID
   * @param toId - Target task ID
   * @throws {TaskNotFoundError} If either task not found
   * @throws {ValidationError} If edge already exists
   * @complexity O(1)
   */
  addEdge(fromId: string, toId: string): void {
    if (!this._nodes.has(fromId)) {
      throw new TaskNotFoundError(fromId);
    }
    if (!this._nodes.has(toId)) {
      throw new TaskNotFoundError(toId);
    }

    // Initialize edge sets if needed
    if (!this._outgoingEdges.has(fromId)) {
      this._outgoingEdges.set(fromId, new Set());
    }
    if (!this._incomingEdges.has(toId)) {
      this._incomingEdges.set(toId, new Set());
    }

    // Check if edge already exists
    if (this._outgoingEdges.get(fromId)!.has(toId)) {
      throw new ValidationError(
        `Edge from '${fromId}' to '${toId}' already exists.`,
        'edges'
      );
    }

    // Add edge
    this._outgoingEdges.get(fromId)!.add(toId);
    this._incomingEdges.get(toId)!.add(fromId);

    // Update task node's edge list
    const fromNode = this._nodes.get(fromId)!;
    if (!fromNode.edges.includes(toId)) {
      fromNode.edges.push(toId);
    }

    this._metadata.updated_at = new Date().toISOString();
  }

  /**
   * Remove an edge between two nodes
   * @param fromId - Source task ID
   * @param toId - Target task ID
   * @throws {TaskNotFoundError} If either task not found
   * @throws {ValidationError} If edge doesn't exist
   * @complexity O(1)
   */
  removeEdge(fromId: string, toId: string): void {
    if (!this._nodes.has(fromId)) {
      throw new TaskNotFoundError(fromId);
    }
    if (!this._nodes.has(toId)) {
      throw new TaskNotFoundError(toId);
    }

    const outgoingSet = this._outgoingEdges.get(fromId);
    if (!outgoingSet || !outgoingSet.has(toId)) {
      throw new ValidationError(
        `Edge from '${fromId}' to '${toId}' does not exist.`,
        'edges'
      );
    }

    // Remove edge
    outgoingSet.delete(toId);
    this._incomingEdges.get(toId)?.delete(fromId);

    // Update task node's edge list
    const fromNode = this._nodes.get(fromId)!;
    const edgeIndex = fromNode.edges.indexOf(toId);
    if (edgeIndex > -1) {
      fromNode.edges.splice(edgeIndex, 1);
    }

    this._metadata.updated_at = new Date().toISOString();
  }

  /**
   * Check if an edge exists
   * @param fromId - Source task ID
   * @param toId - Target task ID
   * @returns True if edge exists
   * @complexity O(1)
   */
  hasEdge(fromId: string, toId: string): boolean {
    const outgoingSet = this._outgoingEdges.get(fromId);
    return outgoingSet ? outgoingSet.has(toId) : false;
  }

  /**
   * Get root tasks (tasks with no incoming edges)
   * @returns Array of root task IDs
   * @complexity O(n) where n is the number of tasks
   */
  getRootTasks(): string[] {
    const roots: string[] = [];
    for (const [id, incomingSet] of this._incomingEdges) {
      if (incomingSet.size === 0) {
        roots.push(id);
      }
    }
    return roots;
  }

  /**
   * Get orphan tasks (tasks with no edges at all)
   * @returns Array of orphan task IDs
   * @complexity O(n) where n is the number of tasks
   */
  getOrphanTasks(): string[] {
    const orphans: string[] = [];
    for (const [id] of this._nodes) {
      const outgoing = this._outgoingEdges.get(id)?.size ?? 0;
      const incoming = this._incomingEdges.get(id)?.size ?? 0;
      if (outgoing === 0 && incoming === 0) {
        orphans.push(id);
      }
    }
    return orphans;
  }

  /**
   * Get leaf tasks (tasks with no outgoing edges)
   * @returns Array of leaf task IDs
   * @complexity O(n) where n is the number of tasks
   */
  getLeafTasks(): string[] {
    const leaves: string[] = [];
    for (const [id, outgoingSet] of this._outgoingEdges) {
      if (outgoingSet.size === 0) {
        leaves.push(id);
      }
    }
    return leaves;
  }

  /**
   * Clear all tasks and edges from the graph
   * Keeps metadata but resets the graph structure
   */
  clear(): void {
    this._nodes.clear();
    this._outgoingEdges.clear();
    this._incomingEdges.clear();
    this._metadata.updated_at = new Date().toISOString();
  }

  /**
   * Convert graph to TaskGraph interface
   * @returns TaskGraph interface representation
   */
  toInterface(): TaskGraph {
    return {
      nodes: new Map(this._nodes),
      outgoingEdges: new Map(
        Array.from(this._outgoingEdges.entries()).map(([id, set]) => [id, new Set(set)])
      ),
      incomingEdges: new Map(
        Array.from(this._incomingEdges.entries()).map(([id, set]) => [id, new Set(set)])
      ),
      metadata: this._metadata,
    };
  }

  /**
   * Create TaskGraphStore from TaskGraph interface
   * @param graph - TaskGraph interface
   * @returns New TaskGraphStore instance
   */
  static fromInterface(graph: TaskGraph): TaskGraphStore {
    const store = new TaskGraphStore(graph.metadata);

    // Add all nodes (convert interface to class instance)
    for (const [id, node] of graph.nodes) {
      const taskNode = TaskNode.fromJSON(node);
      store._nodes.set(id, taskNode);
    }

    // Copy edge maps
    for (const [id, set] of graph.outgoingEdges) {
      store._outgoingEdges.set(id, new Set(set));
    }
    for (const [id, set] of graph.incomingEdges) {
      store._incomingEdges.set(id, new Set(set));
    }

    return store;
  }

  /**
   * Serialize graph to JSON-compatible object
   * @returns JSON-serializable object
   */
  toJSON(): {
    nodes: Record<string, TaskNode>;
    outgoingEdges: Record<string, string[]>;
    incomingEdges: Record<string, string[]>;
    metadata: ProjectMetadata;
  } {
    const nodes: Record<string, TaskNode> = {};
    for (const [id, node] of this._nodes) {
      nodes[id] = node;
    }

    const outgoingEdges: Record<string, string[]> = {};
    for (const [id, set] of this._outgoingEdges) {
      outgoingEdges[id] = Array.from(set);
    }

    const incomingEdges: Record<string, string[]> = {};
    for (const [id, set] of this._incomingEdges) {
      incomingEdges[id] = Array.from(set);
    }

    return {
      nodes,
      outgoingEdges,
      incomingEdges,
      metadata: this._metadata,
    };
  }

  /**
   * Deserialize graph from JSON object
   * @param json - JSON object from toJSON()
   * @returns New TaskGraphStore instance
   */
  static fromJSON(json: {
    nodes: Record<string, TaskNode>;
    outgoingEdges: Record<string, string[]>;
    incomingEdges: Record<string, string[]>;
    metadata: ProjectMetadata;
  }): TaskGraphStore {
    const store = new TaskGraphStore(json.metadata);

    // Add nodes
    for (const [id, node] of Object.entries(json.nodes)) {
      store._nodes.set(id, node);
    }

    // Add edges
    for (const [id, targets] of Object.entries(json.outgoingEdges)) {
      store._outgoingEdges.set(id, new Set(targets));
    }
    for (const [id, sources] of Object.entries(json.incomingEdges)) {
      store._incomingEdges.set(id, new Set(sources));
    }

    return store;
  }
}
