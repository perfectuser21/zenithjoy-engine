#!/bin/bash
# ZenithJoy Core - 分支保护 Hook v4.0 (简化版)
# 只检查：必须在 cp-* 分支才能写代码

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .operation // empty')

# Only check Write/Edit operations
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
fi

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"

# Allow non-code files (config, docs, scripts, state)
case "$EXT" in
    md|json|txt|yml|yaml|sh|toml|ini|env)
        exit 0
        ;;
esac

# Get current git branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# No git = allow
if [[ -z "$CURRENT_BRANCH" ]]; then
    exit 0
fi

# Must be on cp-* branch to write code
if [[ ! "$CURRENT_BRANCH" =~ ^cp- ]]; then
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "  ❌ 只能在 checkpoint 分支写代码" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "当前分支: $CURRENT_BRANCH" >&2
    echo "" >&2
    echo "正确流程:" >&2
    echo "  1. 运行 /new-task 创建 checkpoint 分支" >&2
    echo "  2. 在 cp-xxx 分支上开发" >&2
    echo "  3. 运行 /finish 完成任务" >&2
    echo "" >&2
    echo "[SKILL_REQUIRED: new-task]" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 2
fi

# On cp-* branch = allow
exit 0
