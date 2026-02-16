import type { Task } from '../types';

interface TaskDetailProps {
  task: Task | null;
  loading?: boolean;
}

function TaskDetail({ task, loading }: TaskDetailProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>Select a task to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`px-2 py-1 rounded-md text-xs font-medium ${
              task.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : task.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-800'
                  : task.status === 'blocked'
                    ? 'bg-red-100 text-red-800'
                    : task.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
            }`}
          >
            {task.status.replace('_', ' ')}
          </span>
          <span
            className={`px-2 py-1 rounded-md text-xs font-medium ${
              task.priority === 'top'
                ? 'bg-red-100 text-red-800'
                : task.priority === 'second'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {task.priority} priority
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
      </div>

      {/* Success Criteria */}
      {task.success_criteria.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Success Criteria ({task.success_criteria.filter((c) => c.completed).length}/{task.success_criteria.length})
          </h3>
          <ul className="space-y-1">
            {task.success_criteria.map((criterion) => (
              <li key={criterion.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={criterion.completed}
                  readOnly
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className={criterion.completed ? 'text-gray-500 line-through' : 'text-gray-700'}>
                  {criterion.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deliverables */}
      {task.deliverables.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Deliverables ({task.deliverables.filter((d) => d.completed).length}/{task.deliverables.length})
          </h3>
          <ul className="space-y-1">
            {task.deliverables.map((deliverable) => (
              <li key={deliverable.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deliverable.completed}
                  readOnly
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className={deliverable.completed ? 'text-gray-500 line-through' : 'text-gray-700'}>
                  {deliverable.text}
                </span>
                {deliverable.file_path && (
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                    {deliverable.file_path}
                  </code>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">Created:</span>{' '}
            {new Date(task.created_at).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Updated:</span>{' '}
            {new Date(task.updated_at).toLocaleString()}
          </div>
          {task.completed_at && (
            <div>
              <span className="font-medium">Completed:</span>{' '}
              {new Date(task.completed_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Related Files */}
      {task.related_files.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Related Files</h3>
          <ul className="space-y-1">
            {task.related_files.map((file, idx) => (
              <li key={idx}>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {file}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.notes}</p>
        </div>
      )}
    </div>
  );
}

export default TaskDetail;
