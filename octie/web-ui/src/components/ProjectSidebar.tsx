/**
 * Sidebar - Project navigation sidebar
 */

import { useEffect } from 'react';
import { useProjectStore, type RegistryProject } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

function ProjectItem({ project, isActive, onClick }: {
  project: RegistryProject;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors group ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium truncate">{project.name}</span>
        {!project.exists && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400 flex-shrink-0 ml-2">
            ⚠️
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{project.taskCount} tasks</span>
        {project.exists && (
          <>
            <span>•</span>
            <span className="truncate" title={project.path}>
              {project.path.split(/[\\/]/).pop()}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const {
    projects,
    currentProjectPath,
    loading,
    fetchProjects,
    setCurrentProject,
  } = useProjectStore();

  const { fetchTasks, fetchGraph, fetchStats } = useTaskStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectClick = (project: RegistryProject) => {
    if (!project.exists) {
      return; // Don't allow selecting missing projects
    }
    setCurrentProject(project.path);
    // Refresh task data for new project
    fetchTasks();
    fetchGraph();
    fetchStats();
  };

  const handleHomeClick = () => {
    setCurrentProject(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 md:z-auto h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'
        } overflow-hidden`}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Projects
            </h2>
          </div>

          {/* Home button */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleHomeClick}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                !currentProjectPath
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No projects registered</p>
                <p className="text-xs mt-1">Run `octie init` to create a project</p>
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => (
                  <ProjectItem
                    key={project.path}
                    project={project}
                    isActive={currentProjectPath === project.path}
                    onClick={() => handleProjectClick(project)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {projects.length} project{projects.length !== 1 ? 's' : ''} registered
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
