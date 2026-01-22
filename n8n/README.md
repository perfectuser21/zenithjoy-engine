# N8N Workflows

> zenithjoy-engine 提供的 N8N 工作流模板

## 工作流列表

| 文件 | 说明 |
|------|------|
| `workflows/cecilia-dev-loop.json` | **推荐** - 完整开发循环，强制使用 /dev，支持 CI 失败自动重试 |
| `workflows/cecilia-auto-loop.json` | 旧版自动循环（已弃用） |
| `workflows/prd-executor-simple.json` | 简单 PRD 执行（单次调用，无重试） |

## 架构

```
┌─────────────┐     PRD      ┌─────────────┐     /dev      ┌─────────────┐
│   N8N       │ ──────────→  │  Cecilia    │ ──────────→   │  开发流程   │
│             │              │ (无头模式)   │               │             │
└─────────────┘              └─────────────┘               └─────────────┘
      ↑                            │                             │
      │         结果回传            │         CI 结果              │
      └────────────────────────────┴─────────────────────────────┘
                                   │
                            ┌──────┴──────┐
                            │ CI 失败？    │
                            └──────┬──────┘
                                   │ 是
                                   ▼
                     N8N 自动重试（带上次结果）
                     Cecilia 读取上次结果，继续修复
```

## 核心原则

**无头模式必须使用 /dev skill**。提示词模板强制这一点：

```
你正在执行无头模式任务。
...
**你必须使用 /dev skill 来执行此任务。** 这是强制性的。
```

## 使用方法

### 1. 启动 Cecilia HTTP 服务

```bash
# 在 VPS 上启动（监听 8899 端口）
cecilia --serve --port 8899
```

### 2. 导入工作流

```bash
# 方法 1: N8N CLI
n8n import:workflow --input=workflows/cecilia-dev-loop.json

# 方法 2: N8N Web UI
# Settings → Import → 选择 cecilia-dev-loop.json
```

### 3. 配置环境变量

在 N8N 中设置：

| 变量 | 说明 | 示例 |
|------|------|------|
| `FEISHU_WEBHOOK` | 飞书通知 webhook | `https://open.feishu.cn/...` |

### 4. 触发工作流

**首次执行（带 PRD）**：

```bash
curl -X POST http://n8n:5678/webhook/cecilia-dev \
  -H "Content-Type: application/json" \
  -d '{
    "project": "zenithjoy-core",
    "work_dir": "/home/xx/dev/zenithjoy-core",
    "task_id": "T-20260122-001",
    "prd": "# 任务\n添加登录功能\n\n## DoD\n- [x] 登录页面\n- [x] JWT 认证",
    "max_retries": 3
  }'
```

**继续执行（CI 失败后）**：

N8N 自动处理，会带上 `previous_result`：

```json
{
  "project": "zenithjoy-core",
  "task_id": "T-20260122-001",
  "previous_result": {
    "status": "failed",
    "pr_url": "https://github.com/.../pull/123",
    "ci_status": "red",
    "error": "test job failed"
  }
}
```

## 工作流详解

### cecilia-dev-loop.json（推荐）

```
Webhook (POST /cecilia-dev)
      │
      ▼
初始化任务 (task_id, project, work_dir, prd, max_retries)
      │
      ├──→ 返回任务ID（立即响应）
      │
      ▼
构建提示词（强制 /dev）
      │
      ▼
调用 Cecilia (HTTP POST localhost:8899)
      │
      ▼
解析结果 (提取 JSON)
      │
      ▼
检查状态 ─────────────────────────────────┐
      │                                    │
  ┌───┼───┬───────┬───────────┐           │
  ▼   ▼   ▼       ▼           ▼           │
完成 人工 CI绿    CI红        其他         │
  │   │   │       │           │           │
  │   │   │       └───→ 检查重试 ←────────┘
  │   │   │               │
  │   │   │       ┌───────┴───────┐
  │   │   │       ▼               ▼
  │   │   │   准备重试      超过上限
  │   │   │       │               │
  │   │   │       └──→ 回到构建提示词
  │   │   │
  └───┴───┴───→ 通知飞书 → 保存结果
```

**特点**：
- 强制使用 /dev skill
- CI 失败自动重试（默认 3 次）
- 支持读取上次结果继续修复
- 飞书通知（成功/失败/需人工）

## 输出格式

Cecilia 必须输出以下 JSON：

```json
{
  "success": true,
  "task_id": "T-20260122-001",
  "status": "completed",
  "mode": "new",
  "pr_url": "https://github.com/.../pull/123",
  "pr_number": 123,
  "ci_status": "green",
  "branch": "cp-xxx",
  "commit_sha": "abc123",
  "error": "",
  "next_action": "merge"
}
```

| 字段 | 说明 |
|------|------|
| `status` | completed / failed / need_human_help |
| `mode` | new / continue / fix / merge |
| `ci_status` | green / red / pending |
| `next_action` | merge / fix_ci / wait_review / none |

## 辅助脚本

| 脚本 | 说明 |
|------|------|
| `scripts/generate-prompt.sh` | 生成无头模式提示词 |
| `scripts/notify-n8n.sh` | 通知 N8N 结果 |

## 测试

```bash
# 健康检查
cecilia --health

# 测试提示词生成
bash n8n/scripts/generate-prompt.sh '{"project":"test","prd":"hello"}'
```

## 相关文档

- [提示词模板](templates/headless-prompt.md)
- [接口规范](../docs/INTERFACE-SPEC.md)
