import { useEffect, useState, useCallback, useRef } from 'react'
import './App.css'
import { useTaskStore } from './store/taskStore'
import { useTheme } from './contexts/ThemeContext'
import Toolbar from './components/Toolbar'
import TaskList from './components/TaskList'
import TaskDetail from './components/TaskDetail'
import FilterPanel from './components/FilterPanel'
import StatusBar from './components/StatusBar'
import GraphView from './components/GraphView'
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
    clearError,
    startPolling,
    stopPolling,
  } = useTaskStore()

  const [view, setView] = useState<'list' | 'graph'>('list')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTasks()
    fetchGraph()
    fetchStats()

    // Start polling for real-time updates
    startPolling()

    // Cleanup on unmount
    return () => {
      stopPolling()
    }
  }, [fetchTasks, fetchGraph, fetchStats, startPolling, stopPolling])

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

  // Export handlers
  const handleExportPNG = useCallback(() => {
    graphViewRef.current?.exportAsPNG()
  }, [])

  const handleExportSVG = useCallback(() => {
    graphViewRef.current?.exportAsSVG()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' ||
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }

      // Ctrl/Cmd + R: Refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        handleRefresh()
      }

      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('search')
        searchInput?.focus()
      }

      // L: Toggle list view
      if (e.key === 'l' && !e.ctrlKey && !e.metaKey) {
        setView('list')
      }

      // G: Toggle graph view
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setView('graph')
      }

      // T: Toggle theme
      if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        toggleTheme()
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        setSelectedTask(null)
      }

      // Arrow keys: Navigate tasks in list view
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
  }, [view, tasks, selectedTaskId, handleRefresh, toggleTheme, setSelectedTask])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Octie Task Manager</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Graph-based task management system</p>
        </div>
      </header>

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

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">Error: {error}</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            Make sure the Octie CLI server is running: <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded">octie serve</code>
          </p>
          <button
            onClick={clearError}
            className="mt-3 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-800 dark:text-red-300 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - Filters and Task List */}
        {view === 'list' && (
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto hidden md:block">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filters</h2>
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
            <div className="p-4">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tasks ({tasks.length})
              </h2>
              <TaskList
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onTaskClick={setSelectedTask}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Graph View */}
        {view === 'graph' && (
          <div className="flex-1">
            <GraphView
              ref={graphViewRef}
              graphData={graphData}
              onNodeClick={setSelectedTask}
            />
          </div>
        )}

        {/* Task Detail Panel - hidden on mobile when no task selected */}
        {(view === 'list' || selectedTaskId) && (
          <div className={`border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto ${
            selectedTaskId ? 'w-96 fixed inset-y-0 right-0 md:relative md:block' : 'hidden md:block md:w-96'
          }`}>
            <div className="p-4">
              <TaskDetail
                task={tasks.find(t => t.id === selectedTaskId) || null}
                loading={loading}
              />
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <StatusBar stats={projectStats} loading={loading} />
    </div>
  )
}

export default App
