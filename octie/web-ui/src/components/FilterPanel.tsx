import type { TaskStatus, TaskPriority } from '../types';

interface FilterPanelProps {
  selectedStatus: TaskStatus | 'all';
  selectedPriority: TaskPriority | 'all';
  searchQuery: string;
  onStatusChange: (status: TaskStatus | 'all') => void;
  onPriorityChange: (priority: TaskPriority | 'all') => void;
  onSearchChange: (query: string) => void;
}

function FilterPanel({
  selectedStatus,
  selectedPriority,
  searchQuery,
  onStatusChange,
  onPriorityChange,
  onSearchChange,
}: FilterPanelProps) {
  const statuses: (TaskStatus | 'all')[] = ['all', 'not_started', 'pending', 'in_progress', 'completed', 'blocked'];
  const priorities: (TaskPriority | 'all')[] = ['all', 'top', 'second', 'later'];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Search <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Ctrl+K)</span>
        </label>
        <input
          id="search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Status Filter */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Status
        </label>
        <select
          id="status"
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus | 'all')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'All Statuses' : status.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Filter */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Priority
        </label>
        <select
          id="priority"
          value={selectedPriority}
          onChange={(e) => onPriorityChange(e.target.value as TaskPriority | 'all')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority === 'all' ? 'All Priorities' : priority}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {(selectedStatus !== 'all' || selectedPriority !== 'all' || searchQuery) && (
        <button
          onClick={() => {
            onStatusChange('all');
            onPriorityChange('all');
            onSearchChange('');
          }}
          className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

export default FilterPanel;
