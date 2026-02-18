import { useCallback, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphData, Task } from '../types';
import TaskNode from './TaskNode';

const nodeTypes = {
  taskNode: TaskNode,
};

interface GraphViewProps {
  graphData: GraphData | null;
  onNodeClick?: (taskId: string) => void;
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

const GraphView = forwardRef<GraphViewRef, GraphViewProps>(({ graphData, onNodeClick }, ref) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Convert graph data to ReactFlow nodes and edges
  const initialNodes = useMemo(() => {
    if (!graphData) return [];

    // Handle both array and object formats for nodes
    const nodesArray = ensureNodesArray(graphData.nodes as Task[] | Record<string, Task>);

    return nodesArray.map(
      (task): Node => ({
        id: task.id,
        type: 'taskNode',
        position: { x: 0, y: 0 }, // Will be auto-layouted by fitView
        data: task,
      })
    );
  }, [graphData]);

  const initialEdges = useMemo(() => {
    if (!graphData) return [];

    const edges: Edge[] = [];
    Object.entries(graphData.outgoingEdges || {}).forEach(([fromId, toIds]) => {
      (toIds || []).forEach((toId) => {
        edges.push({
          id: `${fromId}-${toId}`,
          source: fromId,
          target: toId,
          type: 'smoothstep',
          animated: true,
        });
      });
    });
    return edges;
  }, [graphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when graphData changes
  useEffect(() => {
    if (graphData) {
      const nodesArray = ensureNodesArray(graphData.nodes as Task[] | Record<string, Task>);
      const newNodes = nodesArray.map(
        (task): Node => ({
          id: task.id,
          type: 'taskNode',
          position: { x: 0, y: 0 },
          data: task,
        })
      );

      const newEdges: Edge[] = [];
      Object.entries(graphData.outgoingEdges || {}).forEach(([fromId, toIds]) => {
        (toIds || []).forEach((toId) => {
          newEdges.push({
            id: `${fromId}-${toId}`,
            source: fromId,
            target: toId,
            type: 'smoothstep',
            animated: true,
          });
        });
      });

      setNodes(newNodes);
      setEdges(newEdges);
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

  // Export as PNG using html-to-image library approach
  const exportAsPNG = useCallback(() => {
    if (nodes.length === 0 || !reactFlowWrapper.current) return;

    // Get the ReactFlow container
    const flowElement = reactFlowWrapper.current.querySelector('.react-flow');
    if (!flowElement) return;

    // Use canvas to draw the SVG
    const svgElement = flowElement.querySelector('svg');
    if (!svgElement) return;

    // Get bounds
    const bbox = flowElement.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = bbox.width * 2; // 2x for retina
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Serialize SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      // Download
      const link = document.createElement('a');
      link.download = `octie-graph-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }, [nodes]);

  // Export as SVG
  const exportAsSVG = useCallback(() => {
    if (nodes.length === 0 || !reactFlowWrapper.current) return;

    const flowElement = reactFlowWrapper.current.querySelector('.react-flow');
    if (!flowElement) return;

    const svgElement = flowElement.querySelector('svg');
    if (!svgElement) return;

    // Clone and prepare SVG
    const clone = svgElement.cloneNode(true) as SVGElement;
    const bbox = flowElement.getBoundingClientRect();

    clone.setAttribute('width', String(bbox.width));
    clone.setAttribute('height', String(bbox.height));
    clone.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);

    // Serialize and download
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `octie-graph-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
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
        fitView
        style={{ background: 'var(--surface-base)' }}
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
