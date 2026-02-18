import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import './App.css'
import { useTaskStore } from './store/taskStore'
import { useProjectStore } from './store/projectStore'
import { useTheme } from './contexts/ThemeContext'
import Toolbar from './components/Toolbar'
import TaskList from './components/TaskList'
import TaskDetail from './components/TaskDetail'
import FilterPanel from './components/FilterPanel'
import StatusBar from './components/StatusBar'
import GraphView from './components/GraphView'
import Sidebar from './components/ProjectSidebar'
import Header from './components/AppHeader'
import HomePage from './pages/HomePage'
import type { TaskStatus, TaskPriority } from './types'

function App() {
  const { theme, toggleTheme } = useTheme()
  const graphViewRef = useRef<{
    exportAsPNG: () => void;
    exportAsSVG: () => void;
  } | null>(null)

  const {
    tasks,
    loading,
    error,
    selectedTaskId,
    graphData,
    projectStats,
    queryOptions,
    fetchTasks,
    fetchGraph,
    fetchStats,
    setQueryOptions,
    setSelectedTask,
    setCurrentProjectPath,
    clearError,
  } = useTaskStore()

  const {
    currentProjectPath,
    sidebarOpen,
    getProjectFromUrl,
    setCurrentProject,
    toggleSidebar,
  } = useProjectStore()

  const [view, setView] = useState<'list' | 'graph'>('list')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Client-side filtering of tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(task => task.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      result = result.filter(task => task.priority === filterPriority);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.notes?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tasks, filterStatus, filterPriority, searchQuery]);

  // Initialize project from URL on mount
  useEffect(() => {
    const projectFromUrl = getProjectFromUrl()
    if (projectFromUrl) {
      setCurrentProject(projectFromUrl)
    }
  }, [getProjectFromUrl, setCurrentProject])

  // Sync project path to task store when it changes
  useEffect(() => {
    setCurrentProjectPath(currentProjectPath)
  }, [currentProjectPath, setCurrentProjectPath])

  // Fetch data when project changes
  useEffect(() => {
    if (currentProjectPath) {
      fetchTasks()
      fetchGraph()
      fetchStats()
    }
  }, [currentProjectPath, fetchTasks, fetchGraph, fetchStats])

  const handleRefresh = useCallback(() => {
    fetchTasks()
    fetchGraph()
    fetchStats()
  }, [fetchTasks, fetchGraph, fetchStats])

  const handleStatusChange = useCallback((status: TaskStatus | 'all') => {
    setFilterStatus(status)
    setQueryOptions({
      ...queryOptions,
      status: status === 'all' ? undefined : status,
    })
  }, [queryOptions, setQueryOptions])

  const handlePriorityChange = useCallback((priority: TaskPriority | 'all') => {
    setFilterPriority(priority)
    setQueryOptions({
      ...queryOptions,
      priority: priority === 'all' ? undefined : priority,
    })
  }, [queryOptions, setQueryOptions])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setQueryOptions({
      ...queryOptions,
      search: query || undefined,
    })
  }, [queryOptions, setQueryOptions])

  const handleExportPNG = useCallback(() => {
    graphViewRef.current?.exportAsPNG()
  }, [])

  const handleExportSVG = useCallback(() => {
    graphViewRef.current?.exportAsSVG()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' ||
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        handleRefresh()
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('search')
        searchInput?.focus()
      }

      if (e.key === 'l' && !e.ctrlKey && !e.metaKey) {
        setView('list')
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setView('graph')
      }

      if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        toggleTheme()
      }

      if (e.key === 'Escape') {
        setSelectedTask(null)
      }

      if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
        toggleSidebar()
      }

      if (view === 'list' && tasks.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          const currentIndex = selectedTaskId ? tasks.findIndex(t => t.id === selectedTaskId) : -1
          const nextIndex = Math.min(currentIndex + 1, tasks.length - 1)
          setSelectedTask(tasks[nextIndex]?.id || null)
        }
        if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault()
          const currentIndex = selectedTaskId ? tasks.findIndex(t => t.id === selectedTaskId) : 0
          const prevIndex = Math.max(currentIndex - 1, 0)
          setSelectedTask(tasks[prevIndex]?.id || null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, tasks, selectedTaskId, handleRefresh, toggleTheme, setSelectedTask, toggleSidebar])

  // Show home page if no project selected
  const showHomePage = !currentProjectPath

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--surface-base)' }}
    >
      {/* Header */}
      <Header onMenuClick={toggleSidebar} />

      {/* Main layout with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

        {/* Main content */}
        {showHomePage ? (
          <main className="flex-1 overflow-y-auto">
            <HomePage />
          </main>
        ) : (
          <>
            {/* Error Display */}
            {error && (
              <div
                className="m-4 p-4 rounded-xl"
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid var(--accent-rose)',
                }}
              >
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-rose)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--accent-rose)' }}>
                      Error: {error}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Make sure the Octie CLI server is running:{' '}
                      <code
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          background: 'var(--surface-elevated)',
                          color: 'var(--accent-cyan)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        octie serve
                      </code>
                    </p>
                    <button
                      onClick={clearError}
                      className="mt-3 px-3 py-1.5 text-xs rounded-lg transition-colors"
                      style={{
                        background: 'var(--surface-elevated)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Toolbar */}
              <Toolbar
                view={view}
                onViewChange={setView}
                onRefresh={handleRefresh}
                loading={loading}
                onExportPNG={handleExportPNG}
                onExportSVG={handleExportSVG}
                onThemeToggle={toggleTheme}
                theme={theme}
              />

              {/* Status Bar - below toolbar, above content */}
              <StatusBar stats={projectStats} loading={loading} />

              {/* Content Area - Three-column layout */}
              <div className="flex-1 flex overflow-hidden min-w-0 min-h-0">
                {/* Left Sidebar - Filters and Task List (List view only) */}
                {view === 'list' && (
                  <aside
                    className="w-80 flex-shrink-0 overflow-y-auto hidden md:flex md:flex-col"
                    style={{
                      background: 'var(--surface-abyss)',
                      borderRight: '1px solid var(--border-default)',
                    }}
                  >
                    {/* Filters */}
                    <div
                      className="p-4 flex-shrink-0"
                      style={{ borderBottom: '1px solid var(--border-muted)' }}
                    >
                      <h2
                        className="text-xs font-medium uppercase tracking-wide mb-3"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                      >
                        Filters
                      </h2>
                      <FilterPanel
                        selectedStatus={filterStatus}
                        selectedPriority={filterPriority}
                        searchQuery={searchQuery}
                        onStatusChange={handleStatusChange}
                        onPriorityChange={handlePriorityChange}
                        onSearchChange={handleSearchChange}
                      />
                    </div>

                    {/* Task List */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <div className="p-4">
                        <h2
                          className="text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-2"
                          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                          Tasks
                          <span
                            className="tabular-nums"
                            style={{ color: 'var(--accent-cyan)' }}
                          >
                            {filteredTasks.length}
                            {filteredTasks.length !== tasks.length && (
                              <span style={{ color: 'var(--text-muted)' }}>/{tasks.length}</span>
                            )}
                          </span>
                        </h2>
                        <TaskList
                          tasks={filteredTasks}
                          selectedTaskId={selectedTaskId}
                          onTaskClick={setSelectedTask}
                          loading={loading}
                        />
                      </div>
                    </div>
                  </aside>
                )}

                {/* Center Content - Graph View or Empty State */}
                {view === 'graph' && (
                  <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                    <GraphView
                      ref={graphViewRef}
                      graphData={graphData}
                      onNodeClick={setSelectedTask}
                      colorMode={theme}
                    />
                  </div>
                )}

                {/* Right Panel - Task Detail */}
                <aside
                  className={`
                    w-80 flex-shrink-0 overflow-hidden hidden md:flex md:flex-col
                    ${selectedTaskId ? 'fixed inset-0 z-50 md:relative md:z-auto md:flex' : ''}
                  `}
                  style={{
                    background: 'var(--surface-abyss)',
                    borderLeft: '1px solid var(--border-default)',
                  }}
                >
                  {/* Mobile close button */}
                  {selectedTaskId && (
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="md:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg z-10"
                      style={{
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                  <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    <TaskDetail
                      task={tasks.find(t => t.id === selectedTaskId) || null}
                      loading={loading}
                    />
                  </div>
                </aside>
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  )
}

export default App
