#!/usr/bin/env bash
# 生成无头模式提示词
# 用法: bash generate-prompt.sh <json-input>
#
# JSON 输入格式:
# {
#   "project": "zenithjoy-core",
#   "work_dir": "/home/xx/dev/zenithjoy-core",
#   "task_id": "T-20260122-001",
#   "prd": "PRD 内容...",
#   "previous_result": { ... }  // 可选
# }

set -euo pipefail

INPUT="${1:-}"

if [[ -z "$INPUT" ]]; then
    echo "错误: 请提供 JSON 输入" >&2
    exit 1
fi

# 解析 JSON
PROJECT=$(echo "$INPUT" | jq -r '.project // "unknown"')
WORK_DIR=$(echo "$INPUT" | jq -r '.work_dir // "/home/xx/dev/" + .project')
TASK_ID=$(echo "$INPUT" | jq -r '.task_id // "T-" + now')
PRD=$(echo "$INPUT" | jq -r '.prd // ""')
PREVIOUS_RESULT=$(echo "$INPUT" | jq -r '.previous_result // empty')

# 生成提示词
cat << 'PROMPT_START'
你正在执行无头模式任务。

## 项目信息
PROMPT_START

echo "- 项目: $PROJECT"
echo "- 工作目录: $WORK_DIR"
echo "- 任务 ID: $TASK_ID"
echo ""

# 如果有上次结果
if [[ -n "$PREVIOUS_RESULT" ]]; then
    PREV_STATUS=$(echo "$PREVIOUS_RESULT" | jq -r '.status // "unknown"')
    PREV_PR=$(echo "$PREVIOUS_RESULT" | jq -r '.pr_url // "N/A"')
    PREV_CI=$(echo "$PREVIOUS_RESULT" | jq -r '.ci_status // "unknown"')
    PREV_ERROR=$(echo "$PREVIOUS_RESULT" | jq -r '.error // ""')

    cat << EOF
## 上次执行结果
- 状态: $PREV_STATUS
- PR: $PREV_PR
- CI 状态: $PREV_CI
- 错误信息: $PREV_ERROR

你需要根据上次的结果继续工作。如果 CI 失败，请修复问题。

EOF
fi

# 如果有 PRD
if [[ -n "$PRD" ]]; then
    cat << EOF
## PRD 内容
$PRD

EOF
fi

cat << 'PROMPT_END'
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
  "task_id": "<task_id>",
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
PROMPT_END
