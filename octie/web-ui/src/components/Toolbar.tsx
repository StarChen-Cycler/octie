interface ToolbarProps {
  view: 'list' | 'graph';
  onViewChange: (view: 'list' | 'graph') => void;
  onRefresh: () => void;
  loading?: boolean;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onThemeToggle?: () => void;
  theme?: 'light' | 'dark';
}

function Toolbar({ view, onViewChange, onRefresh, loading, onExportPNG, onExportSVG, onThemeToggle, theme = 'light' }: ToolbarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => onViewChange('list')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${
                view === 'list'
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-500 z-10'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              List <span className="text-xs opacity-50 ml-1">(L)</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange('graph')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg border -ml-px ${
                view === 'graph'
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-500 z-10'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Graph <span className="text-xs opacity-50 ml-1">(G)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Buttons (only show in graph view) */}
          {view === 'graph' && (
            <>
              <button
                type="button"
                onClick={onExportPNG}
                className="px-3 py-2 text-sm font-medium rounded-md border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                title="Export as PNG"
              >
                📷 PNG
              </button>
              <button
                type="button"
                onClick={onExportSVG}
                className="px-3 py-2 text-sm font-medium rounded-md border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                title="Export as SVG"
              >
                📐 SVG
              </button>
            </>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onThemeToggle}
            className="px-3 py-2 text-sm font-medium rounded-md border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme (T)`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`px-3 py-2 text-sm font-medium rounded-md border ${
              loading
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title="Refresh (Ctrl+R)"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 dark:border-gray-500"></div>
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
