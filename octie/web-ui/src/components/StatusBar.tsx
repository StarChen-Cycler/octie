import type { ProjectStats } from '../types';

interface StatusBarProps {
  stats: ProjectStats | null;
  loading?: boolean;
}

function StatusBar({ stats, loading }: StatusBarProps) {
  if (loading) {
    return (
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          <span>Loading stats...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <span className="text-gray-600">
            <span className="font-medium">{stats.totalTasks}</span> tasks
          </span>
          <div className="flex items-center gap-3">
            <span className="text-gray-600">
              <span className="font-medium text-green-600">{stats.statusCounts.completed}</span> done
            </span>
            <span className="text-gray-600">
              <span className="font-medium text-blue-600">{stats.statusCounts.in_progress}</span> in
              progress
            </span>
            <span className="text-gray-600">
              <span className="font-medium text-red-600">{stats.statusCounts.blocked}</span>{' '}
              blocked
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-600">
          <span>
            <span className="font-medium text-red-600">{stats.priorityCounts.top}</span> top
          </span>
          <span>
            <span className="font-medium text-yellow-600">{stats.priorityCounts.second}</span>{' '}
            second
          </span>
          {stats.rootTasks.length > 0 && (
            <span>
              <span className="font-medium">{stats.rootTasks.length}</span> root
            </span>
          )}
          {stats.orphanTasks.length > 0 && (
            <span>
              <span className="font-medium text-orange-600">{stats.orphanTasks.length}</span>{' '}
              orphan
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatusBar;
