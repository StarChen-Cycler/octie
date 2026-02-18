import { useCallback, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Position,
  type Connection,
  type Edge,
  type Node,
  type ColorMode,
  useNodesState,
  useEdgesState,
  type ReactFlowInstance,
} from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import type { GraphData, Task } from '../types';
import TaskNode from './TaskNode';

const nodeTypes = {
  taskNode: TaskNode,
};

// Dagre layout constants
const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const RANK_SPACING = 80;  // Vertical spacing between ranks (layers)
const NODE_SPACING = 30;  // Horizontal spacing between nodes (reduced for compact layout)

interface GraphViewProps {
  graphData: GraphData | null;
  onNodeClick?: (taskId: string) => void;
  colorMode?: ColorMode;
}

export interface GraphViewRef {
  exportAsPNG: () => void;
  exportAsSVG: () => void;
}

// Helper to ensure nodes is always an array
function ensureNodesArray(nodes: Task[] | Record<string, Task>): Task[] {
  if (Array.isArray(nodes)) {
    return nodes;
  }
  // If it's an object, convert to array
  return Object.values(nodes);
}

/**
 * Apply dagre layout to position nodes in a hierarchical structure
 * Direction: TB (Top-Bottom) for dependency graphs
 */
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph layout
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: RANK_SPACING,
    nodesep: NODE_SPACING,
    marginx: 50,
    marginy: 50,
    align: 'UL',           // Align nodes to upper-left for more compact layout
    ranker: 'tight-tree',  // Use tight-tree algorithm for compact layout
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run dagre layout
  dagre.layout(dagreGraph);

  // Apply positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Set handle positions based on direction
    return {
      ...node,
      targetPosition: direction === 'TB' ? Position.Top : Position.Left,
      sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

/**
 * Filter edges to only include those where both source and target nodes exist
 * and are valid (not null, undefined, or empty strings)
 */
function filterValidEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const nodeIds = new Set(nodes.map(n => n.id));

  return edges.filter(edge => {
    // Check for null/undefined/empty source or target
    if (!edge.source || !edge.target ||
        edge.source === 'null' || edge.target === 'null' ||
        edge.source === 'undefined' || edge.target === 'undefined') {
      console.warn(`[GraphView] Filtering edge with invalid IDs:`, edge);
      return false;
    }

    // Check if nodes exist
    const sourceExists = nodeIds.has(edge.source);
    const targetExists = nodeIds.has(edge.target);

    if (!sourceExists || !targetExists) {
      console.warn(`[GraphView] Filtering edge with missing nodes: ${edge.source} -> ${edge.target}`);
      return false;
    }

    return true;
  });
}

const GraphView = forwardRef<GraphViewRef, GraphViewProps>(({ graphData, onNodeClick, colorMode = 'dark' }, ref) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Convert graph data to ReactFlow nodes and edges with layout
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!graphData) {
      return { initialNodes: [], initialEdges: [] };
    }

    // Debug: Log raw graph data
    console.log('[GraphView] Raw graphData:', {
      nodeCount: graphData.nodes ? (Array.isArray(graphData.nodes) ? graphData.nodes.length : Object.keys(graphData.nodes).length) : 0,
      outgoingEdgesKeys: graphData.outgoingEdges ? Object.keys(graphData.outgoingEdges) : [],
    });

    // Handle both array and object formats for nodes
    const nodesArray = ensureNodesArray(graphData.nodes as Task[] | Record<string, Task>);

    // Create nodes with placeholder positions
    const nodes: Node[] = nodesArray.map((task): Node => ({
      id: task.id,
      type: 'taskNode',
      position: { x: 0, y: 0 },
      data: task,
    }));

    // Create edges from outgoingEdges, filtering out invalid entries
    const edges: Edge[] = [];
    Object.entries(graphData.outgoingEdges || {}).forEach(([fromId, toIds]) => {
      // Skip if source is null/undefined/empty
      if (!fromId || fromId === 'null' || fromId === 'undefined') {
        return;
      }

      (toIds || []).forEach((toId) => {
        // Skip if target is null/undefined/empty
        if (!toId || toId === 'null' || toId === 'undefined') {
          return;
        }

        edges.push({
          id: `${fromId}-${toId}`,
          source: fromId,
          target: toId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'var(--accent-cyan)', strokeWidth: 2 },
        });
      });
    });

    // Filter out invalid edges (edges referencing non-existent nodes)
    const validEdges = filterValidEdges(nodes, edges);

    // Apply dagre layout
    const layouted = getLayoutedElements(nodes, validEdges, 'TB');

    return {
      initialNodes: layouted.nodes,
      initialEdges: layouted.edges,
    };
  }, [graphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when graphData changes
  useEffect(() => {
    if (graphData) {
      const nodesArray = ensureNodesArray(graphData.nodes as Task[] | Record<string, Task>);

      // Create nodes
      const nodes: Node[] = nodesArray.map((task): Node => ({
        id: task.id,
        type: 'taskNode',
        position: { x: 0, y: 0 },
        data: task,
      }));

      // Create edges, filtering out invalid entries
      const edges: Edge[] = [];
      Object.entries(graphData.outgoingEdges || {}).forEach(([fromId, toIds]) => {
        // Skip if source is null/undefined/empty
        if (!fromId || fromId === 'null' || fromId === 'undefined') {
          return;
        }

        (toIds || []).forEach((toId) => {
          // Skip if target is null/undefined/empty
          if (!toId || toId === 'null' || toId === 'undefined') {
            return;
          }

          edges.push({
            id: `${fromId}-${toId}`,
            source: fromId,
            target: toId,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'var(--accent-cyan)', strokeWidth: 2 },
          });
        });
      });

      // Filter invalid edges
      const validEdges = filterValidEdges(nodes, edges);

      // Apply layout
      const layouted = getLayoutedElements(nodes, validEdges, 'TB');

      setNodes(layouted.nodes);
      setEdges(layouted.edges);

      // Fit view after layout is applied
      requestAnimationFrame(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2, duration: 200 });
      });
    }
  }, [graphData, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds: Edge[]) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onNodeClickHandler = useCallback(
    (_: unknown, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  // Export as PNG using html-to-image library
  const exportAsPNG = useCallback(async () => {
    if (nodes.length === 0 || !reactFlowWrapper.current) return;

    const flowElement = reactFlowWrapper.current.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    try {
      const dataUrl = await toPng(flowElement, {
        backgroundColor: '#0d0d14', // var(--surface-base)
        pixelRatio: 2, // 2x for retina
        filter: (node) => {
          // Filter out controls and minimap from export
          if (
            node.classList?.contains('react-flow__controls') ||
            node.classList?.contains('react-flow__minimap')
          ) {
            return false;
          }
          return true;
        },
      });

      const link = document.createElement('a');
      link.download = `octie-graph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('[GraphView] Failed to export PNG:', error);
    }
  }, [nodes]);

  // Export as SVG using html-to-image library
  const exportAsSVG = useCallback(async () => {
    if (nodes.length === 0 || !reactFlowWrapper.current) return;

    const flowElement = reactFlowWrapper.current.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    try {
      const dataUrl = await toSvg(flowElement, {
        backgroundColor: '#0d0d14', // var(--surface-base)
        filter: (node) => {
          // Filter out controls and minimap from export
          if (
            node.classList?.contains('react-flow__controls') ||
            node.classList?.contains('react-flow__minimap')
          ) {
            return false;
          }
          return true;
        },
      });

      const link = document.createElement('a');
      link.download = `octie-graph-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('[GraphView] Failed to export SVG:', error);
    }
  }, [nodes]);

  // Expose functions via ref
  useImperativeHandle(ref, () => ({
    exportAsPNG,
    exportAsSVG,
  }));

  if (!graphData) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: 'var(--surface-base)' }}
      >
        <p style={{ color: 'var(--text-muted)' }}>Loading graph...</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: 'var(--surface-base)' }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-elevated)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>No tasks to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler as any}
        nodeTypes={nodeTypes as any}
        colorMode={colorMode}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        style={{ background: 'var(--surface-base)' }}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
      >
        <Background style={{ background: 'var(--surface-base)' }} />
        <Controls />
        <MiniMap
          nodeColor="var(--accent-cyan)"
          style={{ background: 'var(--surface-elevated)' }}
        />
      </ReactFlow>
    </div>
  );
});

GraphView.displayName = 'GraphView';

export default GraphView;
