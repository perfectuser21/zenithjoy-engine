# 无头模式提示词模板

> 此模板由 N8N 调用 Cecilia 时使用，强制走 /dev 工作流

## 模板

```
你正在执行无头模式任务。

## 项目信息
- 项目: {{project}}
- 工作目录: {{work_dir}}
- 任务 ID: {{task_id}}

## 上下文
{{#if previous_result}}
### 上次执行结果
- 状态: {{previous_result.status}}
- PR: {{previous_result.pr_url}}
- CI 状态: {{previous_result.ci_status}}
- 错误信息: {{previous_result.error}}

你需要根据上次的结果继续工作。如果 CI 失败，请修复问题。
{{/if}}

{{#if prd}}
### PRD 内容
{{prd}}
{{/if}}

## 核心要求

**你必须使用 /dev skill 来执行此任务。** 这是强制性的。

执行步骤：
1. 运行 /dev skill
2. /dev 会自动检测模式（new/continue/fix/merge）
3. 按照 /dev 的流程完成任务
4. 完成后输出结构化 JSON 结果

## 输出格式

完成后，你必须输出以下 JSON 格式（用 ```json 包裹）：

```json
{
  "success": true|false,
  "task_id": "{{task_id}}",
  "status": "completed|failed|need_human_help",
  "mode": "new|continue|fix|merge",
  "pr_url": "https://github.com/.../pull/123",
  "pr_number": 123,
  "ci_status": "green|red|pending",
  "branch": "cp-xxx",
  "commit_sha": "abc123",
  "error": "如果失败，填写错误信息",
  "next_action": "merge|fix_ci|wait_review|none"
}
```

## 注意

- 不要跳过 /dev skill，它是流程的核心
- 如果遇到需要人工介入的情况，设置 status 为 "need_human_help"
- 确保输出的 JSON 是完整的，N8N 会解析它来决定下一步
```

## 变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `project` | 项目名称 | zenithjoy-core |
| `work_dir` | 工作目录 | /home/xx/dev/zenithjoy-core |
| `task_id` | 任务唯一 ID | T-20260122-001 |
| `previous_result` | 上次执行结果（可选） | {status, pr_url, ci_status, error} |
| `prd` | PRD 内容（首次执行时） | 完整的 PRD 文本 |

## 使用示例

### 首次执行（有 PRD）

```json
{
  "project": "zenithjoy-core",
  "work_dir": "/home/xx/dev/zenithjoy-core",
  "task_id": "T-20260122-001",
  "prd": "# 任务\n添加用户登录功能\n\n## 验收标准\n- [x] 登录页面\n- [x] JWT 认证"
}
```

### 继续执行（CI 失败后）

```json
{
  "project": "zenithjoy-core",
  "work_dir": "/home/xx/dev/zenithjoy-core",
  "task_id": "T-20260122-001",
  "previous_result": {
    "status": "failed",
    "pr_url": "https://github.com/xxx/pull/123",
    "ci_status": "red",
    "error": "test job failed: TypeError in auth.test.ts"
  }
}
```
