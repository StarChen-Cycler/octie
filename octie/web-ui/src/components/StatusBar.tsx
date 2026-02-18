import type { ProjectStats } from '../types';

interface StatusBarProps {
  stats: ProjectStats | null;
  loading?: boolean;
}

function StatusBar({ stats, loading }: StatusBarProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          <span>Loading stats...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { tasks } = stats;

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <span className="text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">{tasks.total}</span> tasks
          </span>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-green-600">{tasks.statusCounts.completed}</span> done
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-blue-600">{tasks.statusCounts.in_progress}</span> in
              progress
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-red-600">{tasks.statusCounts.blocked}</span>{' '}
              blocked
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <span>
            <span className="font-medium text-red-600">{tasks.priorityCounts.top}</span> top
          </span>
          <span>
            <span className="font-medium text-yellow-600">{tasks.priorityCounts.second}</span>{' '}
            second
          </span>
          {tasks.root > 0 && (
            <span>
              <span className="font-medium">{tasks.root}</span> root
            </span>
          )}
          {tasks.orphan > 0 && (
            <span>
              <span className="font-medium text-orange-600">{tasks.orphan}</span>{' '}
              orphan
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatusBar;
