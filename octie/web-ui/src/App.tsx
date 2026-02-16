import { useEffect, useState, useCallback } from 'react'
import './App.css'
import { useTaskStore } from './store/taskStore'
import Toolbar from './components/Toolbar'
import TaskList from './components/TaskList'
import TaskDetail from './components/TaskDetail'
import FilterPanel from './components/FilterPanel'
import StatusBar from './components/StatusBar'
import GraphView from './components/GraphView'
import type { TaskStatus, TaskPriority } from './types'

function App() {
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
  } = useTaskStore()

  const [view, setView] = useState<'list' | 'graph'>('list')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTasks()
    fetchGraph()
    fetchStats()
  }, [fetchTasks, fetchGraph, fetchStats])

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Octie Task Manager</h1>
          <p className="text-sm text-gray-600 mt-1">Graph-based task management system</p>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar
        view={view}
        onViewChange={setView}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <p className="text-sm text-red-600 mt-2">
            Make sure the Octie CLI server is running: <code>octie serve</code>
          </p>
          <button
            onClick={clearError}
            className="mt-3 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - Filters and Task List */}
        {view === 'list' && (
          <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Filters</h2>
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
              <h2 className="text-sm font-medium text-gray-700 mb-3">
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
              graphData={graphData}
              onNodeClick={setSelectedTask}
            />
          </div>
        )}

        {/* Task Detail Panel */}
        {(view === 'list' || selectedTaskId) && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
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
