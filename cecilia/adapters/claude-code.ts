/**
 * Claude Code Adapter
 * Executes checkpoints using Claude Code CLI
 */

import { spawn } from 'child_process';
import type {
  ModelAdapter,
  ExecutionContext,
  ExecutionResult,
  Checkpoint,
} from '../types';

export class ClaudeCodeAdapter implements ModelAdapter {
  name = 'claude-code';

  async execute(ctx: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const prompt = this.buildPrompt(ctx);

    try {
      const result = await this.runClaude(prompt, ctx);
      const duration = Date.now() - startTime;

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        duration,
        tokensUsed: this.parseTokens(result.stdout),
        cost: this.parseCost(result.stdout),
        prUrl: this.parsePrUrl(result.stdout),
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.spawnProcess('claude', ['--version'], {});
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  private buildPrompt(ctx: ExecutionContext): string {
    const { checkpoint: cp, prd } = ctx;

    return `
# 执行 Checkpoint: ${cp.id} - ${cp.name}

## 背景
${prd.background || '无'}

## 当前任务
${cp.description}

## 完成标准 (DoD)
${cp.dod.map((d) => `- [ ] ${d}`).join('\n')}

## 验证命令
\`\`\`bash
${cp.verify_commands.join('\n')}
\`\`\`

## 依赖
${cp.depends_on ? `依赖 ${cp.depends_on} 完成` : '无依赖'}

---

请使用 /dev skill 完成此 checkpoint。
完成后确保所有 DoD 项目都已满足，验证命令全部通过。
`.trim();
  }

  private async runClaude(
    prompt: string,
    ctx: ExecutionContext
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const args = [
      '--print', // 非交互模式
      '--dangerously-skip-permissions', // 跳过权限确认
      '-p',
      prompt,
    ];

    return this.spawnProcess('claude', args, {
      cwd: ctx.workDir,
      timeout: ctx.timeout,
      env: {
        ...process.env,
        ...ctx.env,
      },
    });
  }

  private spawnProcess(
    command: string,
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
      env?: NodeJS.ProcessEnv;
    }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | null = null;

      if (options.timeout) {
        timeoutId = setTimeout(() => {
          proc.kill('SIGTERM');
          reject(new Error(`Timeout after ${options.timeout}ms`));
        }, options.timeout);
      }

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      });

      proc.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  private parseTokens(output: string): number | undefined {
    // 尝试从输出中解析 token 用量
    const match = output.match(/tokens?:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private parseCost(output: string): number | undefined {
    // 尝试从输出中解析成本
    const match = output.match(/cost:\s*\$?([\d.]+)/i);
    return match ? parseFloat(match[1]) : undefined;
  }

  private parsePrUrl(output: string): string | undefined {
    // 尝试从输出中解析 PR URL
    const match = output.match(
      /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/
    );
    return match?.[0];
  }
}
