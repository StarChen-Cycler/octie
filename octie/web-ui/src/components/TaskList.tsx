import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
  loading?: boolean;
}

function TaskList({ tasks, selectedTaskId, onTaskClick, loading }: TaskListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No tasks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onTaskClick(task.id)}
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            selectedTaskId === task.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">{task.title}</h3>
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{task.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1 ml-2">
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  task.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : task.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : task.status === 'blocked'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                }`}
              >
                {task.status.replace('_', ' ')}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
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
          </div>
        </div>
      ))}
    </div>
  );
}

export default TaskList;
