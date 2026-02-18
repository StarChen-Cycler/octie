/**
 * Home Page - Landing page with project selection and tutorial
 */

import { useEffect } from 'react';
import { useProjectStore, type RegistryProject } from '../store/projectStore';

interface ProjectCardProps {
  project: RegistryProject;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!project.exists}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        project.exists
          ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer'
          : 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 cursor-not-allowed opacity-75'
      }`}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {project.name}
        </h3>
        {!project.exists && (
          <span className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 px-2 py-0.5 rounded">
            Missing
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate" title={project.path}>
        📁 {project.path}
      </p>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span>📊 {project.taskCount} tasks</span>
        <span>
          🕒 Last accessed: {new Date(project.lastAccessed).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}

export default function HomePage() {
  const { projects, loading, fetchProjects, setCurrentProject } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectClick = (project: RegistryProject) => {
    if (!project.exists) return;
    setCurrentProject(project.path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Welcome to Octie
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            A graph-based task management system for organizing complex projects
            with dependencies and visual workflows.
          </p>
        </div>

        {/* Quick start section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Start
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-blue-500 font-mono">1.</span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">
                Select a project from the sidebar or below
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-blue-500 font-mono">2.</span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">
                View tasks in list or graph mode
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-blue-500 font-mono">3.</span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">
                Filter by status, priority, or search
              </span>
            </div>
          </div>
        </div>

        {/* Projects section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your Projects
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {projects.length} registered
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create a project to get started with Octie
              </p>
              <code className="inline-block bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm">
                octie init
              </code>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.path}
                  project={project}
                  onClick={() => handleProjectClick(project)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tutorial placeholder */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400">
            📚 Tutorial section coming soon
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Full documentation will be available after core features are implemented
          </p>
        </div>
      </div>
    </div>
  );
}
