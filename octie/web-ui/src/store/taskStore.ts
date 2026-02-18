import { create } from 'zustand';
import type {
  Task,
  GraphData,
  ProjectStats,
  TaskQueryOptions,
  TaskCreateInput,
  TaskUpdateInput,
  ApiResponse,
} from '../types';

interface TaskState {
  // State
  tasks: Task[];
  selectedTaskId: string | null;
  loading: boolean;
  error: string | null;
  queryOptions: TaskQueryOptions;
  currentProjectPath: string | null;

  // Graph state
  graphData: GraphData | null;
  projectStats: ProjectStats | null;

  // Actions
  setQueryOptions: (options: TaskQueryOptions) => void;
  setSelectedTask: (taskId: string | null) => void;
  setCurrentProjectPath: (path: string | null) => void;
  clearError: () => void;

  // API actions
  fetchTasks: () => Promise<void>;
  fetchTask: (id: string) => Promise<Task>;
  createTask: (input: TaskCreateInput) => Promise<Task>;
  updateTask: (id: string, input: TaskUpdateInput) => Promise<Task>;
  deleteTask: (id: string, reconnect?: boolean) => Promise<void>;

  // Graph actions
  fetchGraph: () => Promise<void>;
  fetchStats: () => Promise<void>;
  validateGraph: () => Promise<{ isValid: boolean; hasCycle: boolean; cycleStats?: unknown }>;
}

const API_BASE = '/api';

/**
 * Build URL with project path query parameter
 */
function buildUrl(endpoint: string, projectPath: string | null, additionalParams?: URLSearchParams): string {
  const params = additionalParams || new URLSearchParams();
  if (projectPath) {
    params.set('project', projectPath);
  }
  const queryString = params.toString();
  return `${API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`;
}

export const useTaskStore = create<TaskState>()((set, get) => {
  return {
  // Initial state
  tasks: [],
  selectedTaskId: null,
  loading: false,
  error: null,
  queryOptions: {},
  currentProjectPath: null,
  graphData: null,
  projectStats: null,

  // Actions
  setQueryOptions: (options) => {
    set({ queryOptions: options });
    get().fetchTasks();
  },

  setSelectedTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  setCurrentProjectPath: (path) => {
    set({ currentProjectPath: path });
  },

  clearError: () => {
    set({ error: null });
  },

  // API actions
  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const { queryOptions, currentProjectPath } = get();
      const params = new URLSearchParams();
      if (queryOptions.status) params.append('status', queryOptions.status);
      if (queryOptions.priority) params.append('priority', queryOptions.priority);
      if (queryOptions.search) params.append('search', queryOptions.search);
      if (queryOptions.limit) params.append('limit', queryOptions.limit.toString());
      if (queryOptions.offset) params.append('offset', queryOptions.offset.toString());

      const url = buildUrl('/tasks', currentProjectPath, params);
      const response = await fetch(url);
      const result: ApiResponse<{ tasks: Task[]; total: number }> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch tasks');
      }

      set({ tasks: result.data?.tasks || [], loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },

  fetchTask: async (id) => {
    const { currentProjectPath } = get();
    const response = await fetch(buildUrl(`/tasks/${id}`, currentProjectPath));
    const result: ApiResponse<Task> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to fetch task');
    }

    return result.data!;
  },

  createTask: async (input) => {
    set({ loading: true, error: null });
    try {
      const { currentProjectPath } = get();
      const response = await fetch(buildUrl('/tasks', currentProjectPath), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result: ApiResponse<Task> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create task');
      }

      set((state) => ({
        tasks: [...state.tasks, result.data!],
        loading: false,
      }));

      return result.data!;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
      throw error;
    }
  },

  updateTask: async (id, input) => {
    set({ loading: true, error: null });
    try {
      const { currentProjectPath } = get();
      const response = await fetch(buildUrl(`/tasks/${id}`, currentProjectPath), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result: ApiResponse<Task> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update task');
      }

      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? result.data! : t)),
        loading: false,
      }));

      return result.data!;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
      throw error;
    }
  },

  deleteTask: async (id, reconnect = true) => {
    set({ loading: true, error: null });
    try {
      const { currentProjectPath } = get();
      const params = new URLSearchParams();
      if (reconnect) params.set('reconnect', 'true');
      const response = await fetch(buildUrl(`/tasks/${id}`, currentProjectPath, params), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result: ApiResponse<never> = await response.json();
        throw new Error(result.error?.message || 'Failed to delete task');
      }

      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
      throw error;
    }
  },

  // Graph actions
  fetchGraph: async () => {
    set({ loading: true, error: null });
    try {
      const { currentProjectPath } = get();
      const response = await fetch(buildUrl('/graph', currentProjectPath));
      const result: ApiResponse<GraphData> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch graph');
      }

      set({ graphData: result.data || null, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const { currentProjectPath } = get();
      const response = await fetch(buildUrl('/stats', currentProjectPath));
      const result: ApiResponse<ProjectStats> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch stats');
      }

      set({ projectStats: result.data || null, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },

  validateGraph: async () => {
    const { currentProjectPath } = get();
    const response = await fetch(buildUrl('/graph/validate', currentProjectPath), {
      method: 'POST',
    });
    const result: ApiResponse<{ isValid: boolean; hasCycle: boolean; cycleStats?: unknown }> =
      await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to validate graph');
    }

    return result.data!;
  },
  };
});
