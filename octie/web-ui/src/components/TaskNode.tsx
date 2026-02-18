import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Task } from '../types';

function TaskNode({ data, selected }: NodeProps) {
  const task = data as Task;

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 min-w-[200px] max-w-[300px] ${
        selected
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-300 shadow-md'
      } ${
        task.status === 'completed'
          ? 'bg-green-50 border-green-300'
          : task.status === 'in_progress'
            ? 'bg-blue-50 border-blue-300'
            : task.status === 'blocked'
              ? 'bg-red-50 border-red-300'
              : 'bg-white'
      }`}
      style={{
        background: 'var(--surface-elevated)',
        borderColor: selected ? 'var(--accent-cyan)' : 'var(--border-default)',
      }}
    >
      {/* Target Handle - connects FROM other nodes TO this node */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white"
        style={{ background: 'var(--accent-cyan)' }}
      />

      <div className="flex items-center justify-between mb-2">
        <h3
          className="font-semibold text-sm truncate flex-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {task.title}
        </h3>
        <span
          className={`ml-2 px-1.5 py-0.5 rounded text-xs flex-shrink-0`}
          style={{
            background: task.priority === 'top'
              ? 'var(--accent-red)'
              : task.priority === 'second'
                ? 'var(--accent-yellow)'
                : 'var(--surface-base)',
            color: task.priority === 'later' ? 'var(--text-muted)' : 'white',
          }}
        >
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p
          className="text-xs line-clamp-2 mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {task.description}
        </p>
      )}

      <div
        className="flex items-center justify-between text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        <span className="capitalize">{task.status.replace('_', ' ')}</span>
        <span>
          {task.success_criteria?.filter((c) => c.completed).length || 0}/
          {task.success_criteria?.length || 0}
        </span>
      </div>

      {/* Source Handle - connects FROM this node TO other nodes */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white"
        style={{ background: 'var(--accent-cyan)' }}
      />
    </div>
  );
}

export default memo(TaskNode);
