// Task types matching the backend API
export type TaskStatus = 'not_started' | 'pending' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'top' | 'second' | 'later';
export type EdgeType = 'blocks' | 'depends_on' | 'parent_of' | 'related_to';

export interface SuccessCriterion {
  id: string;
  text: string;
  completed: boolean;
  completed_at?: string;
}

export interface Deliverable {
  id: string;
  text: string;
  completed: boolean;
  file_path?: string;
}

export interface C7Verification {
  library_id: string;
  verified_at: string;
  notes?: string;
}

export interface Task extends Record<string, unknown> {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  success_criteria: SuccessCriterion[];
  deliverables: Deliverable[];
  blockers: string[];
  dependencies: string[];
  edges: string[];
  sub_items: string[];
  related_files: string[];
  notes: string;
  c7_verified: C7Verification[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface GraphData {
  nodes: Task[];
  outgoingEdges: Record<string, string[]>;
  incomingEdges: Record<string, string[]>;
  metadata: {
    project_name: string;
    task_count: number;
    created_at: string;
    updated_at: string;
  };
}

export interface ProjectStats {
  project: {
    name: string;
    version: string;
    created: string;
    updated: string;
  };
  tasks: {
    total: number;
    root: number;
    orphan: number;
    rootTaskIds: string[];
    orphanTaskIds: string[];
    statusCounts: Record<TaskStatus, number>;
    priorityCounts: Record<TaskPriority, number>;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface TaskQueryOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TaskCreateInput {
  title: string;
  description: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  success_criteria: string[];
  deliverables: string[];
  blockers?: string[];
  dependencies?: string[];
  related_files?: string[];
  notes?: string;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  success_criteria?: Partial<SuccessCriterion>[];
  deliverables?: Partial<Deliverable>[];
  blockers?: string[];
  dependencies?: string[];
  related_files?: string[];
  notes?: string;
}
