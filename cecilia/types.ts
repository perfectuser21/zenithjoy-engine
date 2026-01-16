/**
 * Cecilia - Multi-Model AI Code Executor
 * Type Definitions
 */

// =============================================================================
// PRD Types (matches templates/prd-schema.json)
// =============================================================================

export interface PRDMeta {
  project: string;
  feature_branch: string;
  created_at?: string;
  status: 'draft' | 'approved' | 'in_progress' | 'done' | 'failed';
  notion_page_id?: string;
}

export interface Checkpoint {
  id: string; // CP-001 format
  name: string;
  type: 'code' | 'test' | 'config' | 'docs' | 'review';
  depends_on: string | null;
  size: 'small' | 'medium' | 'large';
  description: string;
  dod: string[];
  verify_commands: string[];
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped';
  branch_name: string | null;
  pr_url: string | null;
  error: string | null;
  retry_count: number;
  model?: string; // optional: force specific model
}

export interface PRD {
  meta: PRDMeta;
  background?: string;
  goals?: string[];
  non_goals?: string[];
  checkpoints: Checkpoint[];
}

// =============================================================================
// Execution Types
// =============================================================================

export interface ExecutionContext {
  checkpoint: Checkpoint;
  prd: PRD;
  workDir: string;
  skill: string;
  timeout: number;
  env: Record<string, string>;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  tokensUsed?: number;
  cost?: number;
  prUrl?: string;
}

export interface ExecutionOptions {
  model?: string;
  workDir: string;
  env?: Record<string, string>;
  timeout?: number;
}

// =============================================================================
// Model Adapter Interface
// =============================================================================

export interface ModelAdapter {
  name: string;
  execute(context: ExecutionContext): Promise<ExecutionResult>;
  healthCheck(): Promise<boolean>;
}

// =============================================================================
// Dashboard Types
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
}

export interface CheckpointProgress {
  id: string;
  run_id: string;
  checkpoint_id: string;
  checkpoint_name: string;
  status: CheckpointStatus;
  started_at: Date | null;
  ended_at: Date | null;
  duration_ms: number | null;
  model: string | null;
  tokens_used: number | null;
  cost: number | null;
  error: string | null;
  logs: string | null;
}

export interface DashboardOverview {
  active_runs: TaskRun[];
  recent_completed: TaskRun[];
  stats: {
    total_runs: number;
    success_rate: number;
    avg_duration: number;
    total_cost: number;
  };
}

// =============================================================================
// Config Types
// =============================================================================

export interface CeciliaConfig {
  defaultModel: string;
  dashboardApiUrl: string;
  timeouts: {
    small: number;
    medium: number;
    large: number;
  };
  models: {
    claudeCode: {
      enabled: boolean;
      cliPath: string;
    };
    codex: {
      enabled: boolean;
      apiKey?: string;
    };
    gemini: {
      enabled: boolean;
      apiKey?: string;
      model: string;
    };
  };
}
