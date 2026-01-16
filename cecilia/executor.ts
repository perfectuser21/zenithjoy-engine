/**
 * Cecilia Executor
 * Core execution engine for running checkpoints
 */

import { spawn } from 'child_process';
import type {
  PRD,
  Checkpoint,
  ExecutionResult,
  ExecutionOptions,
  CeciliaConfig,
  CheckpointStatus,
} from './types';
import { ModelRouter } from './router';

const DEFAULT_TIMEOUTS = {
  small: 300_000, // 5 minutes
  medium: 600_000, // 10 minutes
  large: 1_200_000, // 20 minutes
};

export class Executor {
  private router: ModelRouter;
  private dashboardApiUrl: string;
  private timeouts: typeof DEFAULT_TIMEOUTS;

  constructor(config?: Partial<CeciliaConfig>) {
    this.router = new ModelRouter(config);
    this.dashboardApiUrl =
      config?.dashboardApiUrl || process.env.DASHBOARD_API_URL || '';
    this.timeouts = {
      ...DEFAULT_TIMEOUTS,
      ...config?.timeouts,
    };
  }

  /**
   * Run a single checkpoint
   */
  async runCheckpoint(
    prd: PRD,
    checkpointId: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const checkpoint = prd.checkpoints.find((cp) => cp.id === checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found in PRD`);
    }

    // Check dependencies
    if (checkpoint.depends_on) {
      const dep = prd.checkpoints.find((cp) => cp.id === checkpoint.depends_on);
      if (dep && dep.status !== 'done') {
        throw new Error(
          `Dependency ${checkpoint.depends_on} not completed (status: ${dep.status})`
        );
      }
    }

    // Get appropriate adapter
    const adapter = this.router.route(checkpoint, options.model);

    // Update status: in_progress
    await this.updateCheckpointStatus(checkpointId, 'in_progress');

    try {
      // Execute
      const result = await adapter.execute({
        checkpoint,
        prd,
        workDir: options.workDir,
        skill: 'dev',
        timeout: options.timeout || this.getTimeout(checkpoint),
        env: options.env || {},
      });

      // Verify if execution succeeded
      if (result.success) {
        const verified = await this.verifyCheckpoint(checkpoint, options.workDir);
        if (!verified) {
          result.success = false;
          result.error = 'Verification failed: verify_commands did not pass';
        }
      }

      // Update status
      const status: CheckpointStatus = result.success ? 'done' : 'failed';
      await this.updateCheckpointStatus(checkpointId, status, result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.updateCheckpointStatus(checkpointId, 'failed', {
        success: false,
        output: '',
        error: errorMessage,
        duration: 0,
      });
      throw error;
    }
  }

  /**
   * Run all checkpoints in a PRD
   */
  async runAll(
    prd: PRD,
    options: ExecutionOptions
  ): Promise<Map<string, ExecutionResult>> {
    const results = new Map<string, ExecutionResult>();

    // Sort by dependency order
    const ordered = this.topologicalSort(prd.checkpoints);

    for (const checkpoint of ordered) {
      // Skip already completed or skipped
      if (checkpoint.status === 'done' || checkpoint.status === 'skipped') {
        continue;
      }

      try {
        const result = await this.runCheckpoint(prd, checkpoint.id, options);
        results.set(checkpoint.id, result);

        // Stop on failure unless configured otherwise
        if (!result.success) {
          console.error(`Checkpoint ${checkpoint.id} failed, stopping.`);
          break;
        }
      } catch (error) {
        results.set(checkpoint.id, {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
        });
        break;
      }
    }

    return results;
  }

  /**
   * Verify checkpoint with verify_commands
   */
  private async verifyCheckpoint(
    checkpoint: Checkpoint,
    workDir: string
  ): Promise<boolean> {
    for (const cmd of checkpoint.verify_commands) {
      try {
        const result = await this.runCommand(cmd, workDir);
        if (result.exitCode !== 0) {
          console.error(`Verify command failed: ${cmd}`);
          console.error(result.stderr);
          return false;
        }
      } catch (error) {
        console.error(`Verify command error: ${cmd}`, error);
        return false;
      }
    }
    return true;
  }

  /**
   * Run a shell command
   */
  private runCommand(
    cmd: string,
    cwd: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', cmd], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      proc.on('error', reject);
    });
  }

  /**
   * Get timeout for checkpoint based on size
   */
  private getTimeout(checkpoint: Checkpoint): number {
    return this.timeouts[checkpoint.size] || this.timeouts.medium;
  }

  /**
   * Topological sort of checkpoints by dependency
   */
  private topologicalSort(checkpoints: Checkpoint[]): Checkpoint[] {
    const result: Checkpoint[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (cp: Checkpoint) => {
      if (temp.has(cp.id)) {
        throw new Error(`Circular dependency detected at ${cp.id}`);
      }
      if (visited.has(cp.id)) return;

      temp.add(cp.id);

      if (cp.depends_on) {
        const dep = checkpoints.find((c) => c.id === cp.depends_on);
        if (dep) visit(dep);
      }

      temp.delete(cp.id);
      visited.add(cp.id);
      result.push(cp);
    };

    for (const cp of checkpoints) {
      if (!visited.has(cp.id)) {
        visit(cp);
      }
    }

    return result;
  }

  /**
   * Update checkpoint status via Dashboard API
   */
  private async updateCheckpointStatus(
    checkpointId: string,
    status: CheckpointStatus,
    result?: Partial<ExecutionResult>
  ): Promise<void> {
    if (!this.dashboardApiUrl) {
      console.log(`[Cecilia] Checkpoint ${checkpointId}: ${status}`);
      return;
    }

    try {
      const response = await fetch(
        `${this.dashboardApiUrl}/cecilia/checkpoints/${checkpointId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, ...result }),
        }
      );

      if (!response.ok) {
        console.error(
          `Failed to update checkpoint status: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('Failed to update checkpoint status:', error);
    }
  }

  /**
   * Get router for health checks
   */
  getRouter(): ModelRouter {
    return this.router;
  }
}
