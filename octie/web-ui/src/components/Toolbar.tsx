interface ToolbarProps {
  view: 'list' | 'graph';
  onViewChange: (view: 'list' | 'graph') => void;
  onRefresh: () => void;
  loading?: boolean;
}

function Toolbar({ view, onViewChange, onRefresh, loading }: ToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => onViewChange('list')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${
                view === 'list'
                  ? 'bg-blue-50 text-blue-700 border-blue-600 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => onViewChange('graph')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg border -ml-px ${
                view === 'graph'
                  ? 'bg-blue-50 text-blue-700 border-blue-600 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Graph
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`px-3 py-2 text-sm font-medium rounded-md border ${
              loading
                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                Refreshing...
              </span>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
