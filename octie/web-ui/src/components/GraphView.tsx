import { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
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
import type { GraphData } from '../types';
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

const GraphView = forwardRef<GraphViewRef, GraphViewProps>(({ graphData, onNodeClick }, ref) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Convert graph data to ReactFlow nodes and edges
  const initialNodes = useMemo(() => {
    if (!graphData) return [];

    return graphData.nodes.map(
      (task): Node => ({
        id: task.id,
        type: 'taskNode',
        position: { x: 0, y: 0 }, // Will be auto-layouted
        data: task,
      })
    );
  }, [graphData]);

  const initialEdges = useMemo(() => {
    if (!graphData) return [];

    const edges: Edge[] = [];
    Object.entries(graphData.outgoingEdges).forEach(([fromId, toIds]) => {
      toIds.forEach((toId) => {
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

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading graph...</p>
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
        className="dark:bg-gray-900"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
});

GraphView.displayName = 'GraphView';

export default GraphView;
