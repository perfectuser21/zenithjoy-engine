/**
 * Task Tracker Service
 * Manages task runs and checkpoint progress
 *
 * Note: This is an in-memory implementation.
 * For production, integrate with a database or the existing autopilot dashboard.
 */

import { randomUUID } from 'crypto';
import type {
  TaskRun,
  TaskRunWithProgress,
  CheckpointProgress,
  CreateRunRequest,
  UpdateCheckpointRequest,
  QueryRunsOptions,
  DashboardOverview,
  DashboardStats,
  RunStatus,
} from '../types';

class TaskTrackerService {
  private runs: Map<string, TaskRun> = new Map();
  private checkpoints: Map<string, CheckpointProgress[]> = new Map();

  /**
   * Create a new task run
   */
  createRun(request: CreateRunRequest): TaskRun {
    const id = randomUUID();
    const now = new Date();

    const run: TaskRun = {
      id,
      prd_id: request.prd_id,
      repo: request.repo,
      feature_branch: request.feature_branch,
      status: 'pending',
      current_checkpoint: null,
      started_at: now,
      ended_at: null,
      model_used: request.model || 'claude-code',
      total_cost: 0,
      total_tokens: 0,
      total_duration_ms: 0,
      checkpoints_total: request.checkpoints.length,
      checkpoints_done: 0,
    };

    this.runs.set(id, run);

    // Create checkpoint progress entries
    const cpProgress: CheckpointProgress[] = request.checkpoints.map((cp) => ({
      id: randomUUID(),
      run_id: id,
      checkpoint_id: cp.id,
      checkpoint_name: cp.name,
      checkpoint_type: cp.type,
      status: 'pending',
      started_at: null,
      ended_at: null,
      duration_ms: null,
      model: null,
      tokens_used: null,
      cost: null,
      error: null,
      pr_url: null,
      logs: null,
    }));

    this.checkpoints.set(id, cpProgress);

    return run;
  }

  /**
   * Get a run by ID with progress
   */
  getRunWithProgress(runId: string): TaskRunWithProgress | null {
    const run = this.runs.get(runId);
    if (!run) return null;

    const checkpoints = this.checkpoints.get(runId) || [];
    const doneCount = checkpoints.filter((cp) => cp.status === 'done').length;
    const progressPercent =
      checkpoints.length > 0 ? (doneCount / checkpoints.length) * 100 : 0;

    return {
      ...run,
      checkpoints,
      progress_percent: progressPercent,
    };
  }

  /**
   * Query runs with filters
   */
  queryRuns(options: QueryRunsOptions = {}): TaskRunWithProgress[] {
    let results = Array.from(this.runs.values());

    // Filter by status
    if (options.status) {
      results = results.filter((r) => r.status === options.status);
    }

    // Filter by repo
    if (options.repo) {
      results = results.filter((r) => r.repo === options.repo);
    }

    // Sort by started_at descending
    results.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    results = results.slice(offset, offset + limit);

    // Add progress info
    return results.map((run) => this.getRunWithProgress(run.id)!);
  }

  /**
   * Update run status
   */
  updateRunStatus(runId: string, status: RunStatus): TaskRun | null {
    const run = this.runs.get(runId);
    if (!run) return null;

    run.status = status;

    if (status === 'success' || status === 'failed' || status === 'cancelled') {
      run.ended_at = new Date();
      run.total_duration_ms =
        run.ended_at.getTime() - new Date(run.started_at).getTime();
    }

    return run;
  }

  /**
   * Update checkpoint status
   */
  updateCheckpoint(
    runId: string,
    checkpointId: string,
    update: UpdateCheckpointRequest
  ): CheckpointProgress | null {
    const checkpoints = this.checkpoints.get(runId);
    if (!checkpoints) return null;

    const cp = checkpoints.find((c) => c.checkpoint_id === checkpointId);
    if (!cp) return null;

    // Update fields
    cp.status = update.status;

    if (update.status === 'in_progress' && !cp.started_at) {
      cp.started_at = new Date();
    }

    if (update.status === 'done' || update.status === 'failed') {
      cp.ended_at = new Date();
      if (cp.started_at) {
        cp.duration_ms = cp.ended_at.getTime() - cp.started_at.getTime();
      }
    }

    if (update.model) cp.model = update.model;
    if (update.tokens_used !== undefined) cp.tokens_used = update.tokens_used;
    if (update.cost !== undefined) cp.cost = update.cost;
    if (update.error) cp.error = update.error;
    if (update.pr_url) cp.pr_url = update.pr_url;
    if (update.logs) cp.logs = update.logs;

    // Update run aggregates
    const run = this.runs.get(runId);
    if (run) {
      run.current_checkpoint = checkpointId;
      run.checkpoints_done = checkpoints.filter(
        (c) => c.status === 'done'
      ).length;
      run.total_tokens = checkpoints.reduce(
        (sum, c) => sum + (c.tokens_used || 0),
        0
      );
      run.total_cost = checkpoints.reduce((sum, c) => sum + (c.cost || 0), 0);

      // Check if all done
      const allDone = checkpoints.every(
        (c) => c.status === 'done' || c.status === 'skipped'
      );
      const anyFailed = checkpoints.some((c) => c.status === 'failed');

      if (anyFailed) {
        run.status = 'failed';
        run.ended_at = new Date();
      } else if (allDone) {
        run.status = 'success';
        run.ended_at = new Date();
      } else if (run.status === 'pending') {
        run.status = 'running';
      }
    }

    return cp;
  }

  /**
   * Get dashboard overview
   */
  getOverview(): DashboardOverview {
    const allRuns = this.queryRuns({ limit: 100 });

    const activeRuns = allRuns.filter((r) =>
      ['pending', 'running'].includes(r.status)
    );
    const completedRuns = allRuns.filter((r) =>
      ['success', 'failed'].includes(r.status)
    );

    return {
      active_runs: activeRuns.slice(0, 10),
      recent_completed: completedRuns.slice(0, 10),
      stats: this.calculateStats(allRuns),
    };
  }

  /**
   * Calculate statistics
   */
  private calculateStats(runs: TaskRunWithProgress[]): DashboardStats {
    const totalRuns = runs.length;
    const successCount = runs.filter((r) => r.status === 'success').length;
    const failedCount = runs.filter((r) => r.status === 'failed').length;

    const completedRuns = runs.filter((r) => r.ended_at);
    const avgDuration =
      completedRuns.length > 0
        ? completedRuns.reduce((sum, r) => sum + r.total_duration_ms, 0) /
          completedRuns.length
        : 0;

    const totalCost = runs.reduce((sum, r) => sum + r.total_cost, 0);
    const totalTokens = runs.reduce((sum, r) => sum + r.total_tokens, 0);

    // Group by model
    const byModel = new Map<
      string,
      { runs: number; success: number; tokens: number; cost: number }
    >();
    for (const run of runs) {
      const model = run.model_used;
      const existing = byModel.get(model) || {
        runs: 0,
        success: 0,
        tokens: 0,
        cost: 0,
      };
      existing.runs++;
      if (run.status === 'success') existing.success++;
      existing.tokens += run.total_tokens;
      existing.cost += run.total_cost;
      byModel.set(model, existing);
    }

    return {
      total_runs: totalRuns,
      success_count: successCount,
      failed_count: failedCount,
      success_rate: totalRuns > 0 ? (successCount / totalRuns) * 100 : 0,
      avg_duration_ms: avgDuration,
      total_cost: totalCost,
      total_tokens: totalTokens,
      by_model: Array.from(byModel.entries()).map(([model, stats]) => ({
        model,
        runs: stats.runs,
        success_count: stats.success,
        tokens: stats.tokens,
        cost: stats.cost,
      })),
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.runs.clear();
    this.checkpoints.clear();
  }
}

// Export singleton instance
export const taskTracker = new TaskTrackerService();
