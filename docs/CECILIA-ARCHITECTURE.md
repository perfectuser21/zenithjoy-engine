# Cecilia Architecture

> 多模型 AI 代码执行器 - N8N → Cecilia → Code

---

## 概述

Cecilia 是无头 AI 代码执行器，通过 N8N 调度，支持多种 AI 模型后端。

```
┌─────────────────────────────────────────────────────────────────┐
│                           N8N                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Parse PRD   │───▶│ Loop CPs    │───▶│ Update      │         │
│  │ from Notion │    │             │    │ Status      │         │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
└────────────────────────────┼────────────────────────────────────┘
                             │ SSH
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Cecilia                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Router      │───▶│ Model       │───▶│ Executor    │         │
│  │             │    │ Adapter     │    │             │         │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                            │                                    │
│            ┌───────────────┼───────────────┐                   │
│            ▼               ▼               ▼                   │
│     ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│     │ Claude    │   │ Codex     │   │ Gemini    │             │
│     │ Code      │   │ (OpenAI)  │   │ (Google)  │             │
│     └───────────┘   └───────────┘   └───────────┘             │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Dashboard                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Task List   │    │ Progress    │    │ Logs        │         │
│  │             │    │ Tracker     │    │             │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 目录结构

```
zenithjoy-engine/
├── cecilia/                    # Cecilia 执行器
│   ├── adapters/               # 模型适配器
│   │   ├── claude-code.ts      # Claude Code CLI
│   │   ├── codex.ts            # OpenAI Codex CLI
│   │   └── gemini.ts           # Google Gemini API
│   ├── router.ts               # 模型路由
│   ├── executor.ts             # 执行引擎
│   ├── types.ts                # 类型定义
│   └── cli.ts                  # SSH 入口
│
├── dashboard/                  # Dashboard 模块
│   ├── api/                    # API 层
│   │   ├── tasks.ts            # 任务 API
│   │   ├── progress.ts         # 进度 API
│   │   └── logs.ts             # 日志 API
│   ├── services/               # 服务层
│   │   ├── task-tracker.ts     # 任务追踪
│   │   ├── checkpoint-status.ts# Checkpoint 状态
│   │   └── notion-sync.ts      # Notion 同步
│   └── types.ts                # 类型定义
│
├── n8n/                        # N8N 工作流定义
│   ├── workflows/
│   │   ├── prd-executor.json   # PRD 执行工作流
│   │   └── checkpoint-runner.json
│   └── README.md
│
└── templates/                  # (已存在)
    ├── prd-schema.json
    └── prd-example.json
```

---

## 核心组件

### 1. Model Adapters

每个适配器实现统一接口：

```typescript
interface ModelAdapter {
  name: string;
  execute(context: ExecutionContext): Promise<ExecutionResult>;
  healthCheck(): Promise<boolean>;
}

interface ExecutionContext {
  checkpoint: Checkpoint;
  workDir: string;
  skill: string;           // 默认 "dev"
  timeout: number;         // 毫秒
  env: Record<string, string>;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  tokensUsed?: number;
  cost?: number;
}
```

#### Claude Code Adapter

```typescript
// cecilia/adapters/claude-code.ts
export class ClaudeCodeAdapter implements ModelAdapter {
  name = 'claude-code';

  async execute(ctx: ExecutionContext): Promise<ExecutionResult> {
    const prompt = this.buildPrompt(ctx.checkpoint);

    // 调用 Claude Code CLI
    const result = await spawn('claude', [
      '--print',
      '--dangerously-skip-permissions',
      '-p', prompt,
      '--cwd', ctx.workDir,
    ]);

    return this.parseResult(result);
  }

  private buildPrompt(cp: Checkpoint): string {
    return `
执行 Checkpoint: ${cp.id} - ${cp.name}

任务描述:
${cp.description}

完成标准:
${cp.dod.map(d => `- ${d}`).join('\n')}

验证命令:
${cp.verify_commands.join('\n')}

请使用 /dev skill 完成此任务。
`.trim();
  }
}
```

#### Codex Adapter (OpenAI)

```typescript
// cecilia/adapters/codex.ts
export class CodexAdapter implements ModelAdapter {
  name = 'codex';

  async execute(ctx: ExecutionContext): Promise<ExecutionResult> {
    // 使用 OpenAI Codex CLI (假设未来有)
    // 或通过 API 调用 + 文件操作
    const result = await spawn('codex', [
      '--project', ctx.workDir,
      '--task', this.formatTask(ctx.checkpoint),
    ]);

    return this.parseResult(result);
  }
}
```

#### Gemini Adapter (Google)

```typescript
// cecilia/adapters/gemini.ts
export class GeminiAdapter implements ModelAdapter {
  name = 'gemini';

  async execute(ctx: ExecutionContext): Promise<ExecutionResult> {
    // 使用 Google Gemini API
    const response = await gemini.generateContent({
      model: 'gemini-2.0-flash',
      contents: this.formatPrompt(ctx.checkpoint),
      tools: this.getCodeTools(),
    });

    return this.executeCodeActions(response, ctx.workDir);
  }
}
```

---

### 2. Router

根据配置或任务类型选择模型：

```typescript
// cecilia/router.ts
export class ModelRouter {
  private adapters: Map<string, ModelAdapter> = new Map();

  constructor() {
    this.register(new ClaudeCodeAdapter());
    this.register(new CodexAdapter());
    this.register(new GeminiAdapter());
  }

  route(checkpoint: Checkpoint, preference?: string): ModelAdapter {
    // 优先级：显式指定 > checkpoint.model > 默认
    const modelName = preference
      || checkpoint.model
      || this.getDefault(checkpoint);

    return this.adapters.get(modelName) || this.adapters.get('claude-code')!;
  }

  private getDefault(cp: Checkpoint): string {
    // 根据任务类型选择最优模型
    switch (cp.type) {
      case 'code':
        return 'claude-code';  // 代码任务用 Claude
      case 'test':
        return 'claude-code';  // 测试也用 Claude
      case 'docs':
        return 'gemini';       // 文档可以用 Gemini（便宜）
      default:
        return 'claude-code';
    }
  }
}
```

---

### 3. Executor

执行引擎，协调整个流程：

```typescript
// cecilia/executor.ts
export class Executor {
  private router: ModelRouter;
  private dashboard: DashboardClient;

  async runCheckpoint(
    prd: PRD,
    cpId: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const checkpoint = prd.checkpoints.find(cp => cp.id === cpId)!;
    const adapter = this.router.route(checkpoint, options.model);

    // 更新状态：开始执行
    await this.dashboard.updateCheckpointStatus(cpId, 'in_progress');

    try {
      // 执行
      const result = await adapter.execute({
        checkpoint,
        workDir: options.workDir,
        skill: 'dev',
        timeout: this.getTimeout(checkpoint),
        env: options.env,
      });

      // 验证
      if (result.success) {
        const verified = await this.verify(checkpoint, options.workDir);
        result.success = verified;
      }

      // 更新状态
      const status = result.success ? 'done' : 'failed';
      await this.dashboard.updateCheckpointStatus(cpId, status, result);

      return result;

    } catch (error) {
      await this.dashboard.updateCheckpointStatus(cpId, 'failed', { error });
      throw error;
    }
  }

  private async verify(cp: Checkpoint, workDir: string): Promise<boolean> {
    for (const cmd of cp.verify_commands) {
      const result = await spawn('bash', ['-c', cmd], { cwd: workDir });
      if (result.exitCode !== 0) return false;
    }
    return true;
  }
}
```

---

### 4. CLI Entry Point

N8N 通过 SSH 调用的入口：

```typescript
// cecilia/cli.ts
#!/usr/bin/env bun

import { Executor } from './executor';
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    prd: { type: 'string', short: 'p' },        // PRD 文件路径或 Notion ID
    checkpoint: { type: 'string', short: 'c' }, // Checkpoint ID
    model: { type: 'string', short: 'm' },      // 强制使用的模型
    workdir: { type: 'string', short: 'w' },    // 工作目录
  },
});

async function main() {
  const executor = new Executor();

  const prd = await loadPRD(values.prd!);
  const result = await executor.runCheckpoint(prd, values.checkpoint!, {
    model: values.model,
    workDir: values.workdir || process.cwd(),
  });

  // 输出 JSON 结果供 N8N 解析
  console.log(JSON.stringify(result));
  process.exit(result.success ? 0 : 1);
}

main().catch(console.error);
```

SSH 调用示例：

```bash
ssh vps "cd /path/to/project && cecilia -p ./prd.json -c CP-001 -m claude-code"
```

---

## Dashboard 模块

### 数据模型

```typescript
// dashboard/types.ts

interface TaskRun {
  id: string;
  prd_id: string;
  repo: string;
  feature_branch: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  current_checkpoint: string | null;
  started_at: Date;
  ended_at: Date | null;
  model_used: string;
  total_cost: number;
}

interface CheckpointProgress {
  id: string;
  run_id: string;
  checkpoint_id: string;
  checkpoint_name: string;
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped';
  started_at: Date | null;
  ended_at: Date | null;
  duration_ms: number | null;
  model: string | null;
  tokens_used: number | null;
  cost: number | null;
  error: string | null;
  logs: string | null;
}

interface DashboardOverview {
  active_runs: TaskRun[];
  recent_completed: TaskRun[];
  stats: {
    total_runs: number;
    success_rate: number;
    avg_duration: number;
    total_cost: number;
  };
}
```

### API 设计

```typescript
// dashboard/api/tasks.ts

// GET /api/cecilia/runs
// 获取所有任务运行
async function getRuns(query: {
  status?: string;
  repo?: string;
  limit?: number;
}): Promise<TaskRun[]>

// GET /api/cecilia/runs/:runId
// 获取单个运行详情（含 checkpoints）
async function getRunDetail(runId: string): Promise<{
  run: TaskRun;
  checkpoints: CheckpointProgress[];
}>

// POST /api/cecilia/runs
// 创建新运行（N8N 调用）
async function createRun(data: {
  prd: PRD;
  repo: string;
  feature_branch: string;
}): Promise<TaskRun>

// PATCH /api/cecilia/checkpoints/:cpId
// 更新 checkpoint 状态（Cecilia 回调）
async function updateCheckpoint(cpId: string, data: {
  status: string;
  result?: ExecutionResult;
}): Promise<void>
```

---

## N8N Workflow 设计

### PRD 执行工作流

```
┌──────────────┐
│  Webhook     │  ← Notion/手动触发
│  Trigger     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Load PRD    │  ← 从 Notion 或本地加载
│              │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Create Run  │  ← POST /api/cecilia/runs
│              │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Loop        │  ← 遍历 checkpoints
│  Checkpoints │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  Check Deps  │────▶│  Skip if     │
│              │     │  Not Ready   │
└──────┬───────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│  SSH Execute │  ← cecilia -p ... -c CP-XXX
│  Cecilia     │
└──────┬───────┘
       │
       ├─────────────────┐
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  Success     │  │  Failure     │
│  Continue    │  │  Retry/Stop  │
└──────┬───────┘  └──────────────┘
       │
       ▼
┌──────────────┐
│  All Done?   │
│              │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Notify      │  ← 通知完成/失败
│              │
└──────────────┘
```

### N8N 节点配置要点

1. **SSH Node**:
   - Host: VPS IP
   - Command: `cecilia -p /path/to/prd.json -c {{ $json.checkpoint.id }}`
   - Parse JSON output

2. **HTTP Request Node**:
   - Update dashboard: `PATCH /api/cecilia/checkpoints/:cpId`

3. **Loop Node**:
   - Items: `{{ $json.prd.checkpoints }}`
   - Continue on fail: configurable

---

## 环境变量

```bash
# cecilia/.env

# 模型 API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# Dashboard API
DASHBOARD_API_URL=http://localhost:3000/api

# 默认模型
DEFAULT_MODEL=claude-code

# 超时设置（毫秒）
CHECKPOINT_TIMEOUT_SMALL=300000    # 5 分钟
CHECKPOINT_TIMEOUT_MEDIUM=600000   # 10 分钟
CHECKPOINT_TIMEOUT_LARGE=1200000   # 20 分钟
```

---

## 使用流程

### 1. 手动执行单个 Checkpoint

```bash
# 在项目目录
cecilia -p ./prd.json -c CP-001
```

### 2. N8N 自动执行整个 PRD

```
1. Notion 页面状态改为 "approved"
2. N8N Webhook 触发
3. 加载 PRD，创建 Run
4. 依次执行每个 Checkpoint
5. Dashboard 实时显示进度
6. 完成后通知
```

### 3. Dashboard 查看

```
访问: http://vps:3000/cecilia

显示:
┌─────────────────────────────────────────────────────────┐
│ Active Runs                                             │
├─────────────────────────────────────────────────────────┤
│ zenithjoy-engine / feature/user-auth                    │
│ ○ CP-001: 初始化模块    ✓                              │
│ ● CP-002: 实现注册 ⏳ (running)                         │
│ ○ CP-003: 实现登录                                      │
│ ○ CP-004: 集成测试                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 下一步

1. [ ] 实现 Claude Code Adapter
2. [ ] 实现 Executor 核心逻辑
3. [ ] 创建 Dashboard API
4. [ ] 创建 N8N workflow JSON
5. [ ] 集成测试

---

## 参考

- [zenithjoy-autopilot dashboard](../../../zenithjoy-autopilot/apps/dashboard/)
- [PRD Schema](../templates/prd-schema.json)
- [/dev Skill](../skills/dev/SKILL.md)
