import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
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
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-gray-900 truncate">{task.title}</h3>
        <span
          className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
            task.priority === 'top'
              ? 'bg-red-100 text-red-700'
              : task.priority === 'second'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{task.status.replace('_', ' ')}</span>
        <span>
          {task.success_criteria.filter((c) => c.completed).length}/
          {task.success_criteria.length}
        </span>
      </div>
    </div>
  );
}

export default memo(TaskNode);
