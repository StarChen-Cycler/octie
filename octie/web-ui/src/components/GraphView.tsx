import { useCallback, useMemo } from 'react';
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

function GraphView({ graphData, onNodeClick }: GraphViewProps) {
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

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-600">Loading graph...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler as any}
        nodeTypes={nodeTypes as any}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export default GraphView;
