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

  // Graph state
  graphData: GraphData | null;
  projectStats: ProjectStats | null;

  // Real-time updates
  pollingEnabled: boolean;
  pollingInterval: number;
  startPolling: () => void;
  stopPolling: () => void;

  // Actions
  setQueryOptions: (options: TaskQueryOptions) => void;
  setSelectedTask: (taskId: string | null) => void;
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
const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds

export const useTaskStore = create<TaskState>()((set, get) => {
  let pollingTimer: ReturnType<typeof setInterval> | null = null;

  return {
  // Initial state
  tasks: [],
  selectedTaskId: null,
  loading: false,
  error: null,
  queryOptions: {},
  graphData: null,
  projectStats: null,
  pollingEnabled: false,
  pollingInterval: DEFAULT_POLLING_INTERVAL,

  // Real-time polling
  startPolling: () => {
    const { pollingEnabled, pollingInterval } = get();
    if (pollingEnabled || pollingTimer) return;

    set({ pollingEnabled: true });

    pollingTimer = setInterval(() => {
      const { fetchTasks, fetchGraph, fetchStats } = get();
      fetchTasks();
      fetchGraph();
      fetchStats();
    }, pollingInterval);
  },

  stopPolling: () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    set({ pollingEnabled: false });
  },

  // Actions
  setQueryOptions: (options) => {
    set({ queryOptions: options });
    get().fetchTasks();
  },

  setSelectedTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  clearError: () => {
    set({ error: null });
  },

  // API actions
  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const { queryOptions } = get();
      const params = new URLSearchParams();
      if (queryOptions.status) params.append('status', queryOptions.status);
      if (queryOptions.priority) params.append('priority', queryOptions.priority);
      if (queryOptions.search) params.append('search', queryOptions.search);
      if (queryOptions.limit) params.append('limit', queryOptions.limit.toString());
      if (queryOptions.offset) params.append('offset', queryOptions.offset.toString());

      const url = `${API_BASE}/tasks${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const result: ApiResponse<Task[]> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch tasks');
      }

      set({ tasks: result.data || [], loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },

  fetchTask: async (id) => {
    const response = await fetch(`${API_BASE}/tasks/${id}`);
    const result: ApiResponse<Task> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to fetch task');
    }

    return result.data!;
  },

  createTask: async (input) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
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
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
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
      const params = reconnect ? '?reconnect=true' : '';
      const response = await fetch(`${API_BASE}/tasks/${id}${params}`, {
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
      const response = await fetch(`${API_BASE}/graph`);
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
      const response = await fetch(`${API_BASE}/stats`);
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
    const response = await fetch(`${API_BASE}/graph/validate`, {
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
