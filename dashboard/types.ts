/**
 * Dashboard Types
 * For task visualization and progress tracking
 */

// =============================================================================
// Run Types
// =============================================================================

export type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type CheckpointStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped';

export interface TaskRun {
  id: string;
  prd_id: string;
  repo: string;
  feature_branch: string;
  status: RunStatus;
  current_checkpoint: string | null;
  started_at: Date;
  ended_at: Date | null;
  model_used: string;
  total_cost: number;
  total_tokens: number;
  total_duration_ms: number;
  checkpoints_total: number;
  checkpoints_done: number;
  metadata?: Record<string, unknown>;
}

export interface CheckpointProgress {
  id: string;
  run_id: string;
  checkpoint_id: string;
  checkpoint_name: string;
  checkpoint_type: 'code' | 'test' | 'config' | 'docs' | 'review';
  status: CheckpointStatus;
  started_at: Date | null;
  ended_at: Date | null;
  duration_ms: number | null;
  model: string | null;
  tokens_used: number | null;
  cost: number | null;
  error: string | null;
  pr_url: string | null;
  logs: string | null;
}

// =============================================================================
// Dashboard Views
// =============================================================================

export interface DashboardOverview {
  active_runs: TaskRunWithProgress[];
  recent_completed: TaskRunWithProgress[];
  stats: DashboardStats;
}

export interface TaskRunWithProgress extends TaskRun {
  checkpoints: CheckpointProgress[];
  progress_percent: number;
}

export interface DashboardStats {
  total_runs: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  avg_duration_ms: number;
  total_cost: number;
  total_tokens: number;
  by_model: ModelStats[];
}

export interface ModelStats {
  model: string;
  runs: number;
  success_count: number;
  tokens: number;
  cost: number;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateRunRequest {
  prd_id: string;
  repo: string;
  feature_branch: string;
  checkpoints: Array<{
    id: string;
    name: string;
    type: 'code' | 'test' | 'config' | 'docs' | 'review';
  }>;
  model?: string;
}

export interface UpdateCheckpointRequest {
  status: CheckpointStatus;
  model?: string;
  tokens_used?: number;
  cost?: number;
  error?: string;
  pr_url?: string;
  logs?: string;
}

export interface QueryRunsOptions {
  status?: RunStatus;
  repo?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Event Types (for real-time updates)
// =============================================================================

export type EventType =
  | 'run.created'
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'checkpoint.started'
  | 'checkpoint.completed'
  | 'checkpoint.failed';

export interface DashboardEvent {
  type: EventType;
  run_id: string;
  checkpoint_id?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}
