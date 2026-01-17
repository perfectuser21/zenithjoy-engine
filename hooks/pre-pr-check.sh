#!/usr/bin/env bash
# ZenithJoy Engine - PR 前检查 Hook（版本见 package.json）
# 在 gh pr create 之前，强制运行 test 和 typecheck
# 检查失败则阻止 PR 创建

set -euo pipefail

# 检查 jq 是否存在
if ! command -v jq &>/dev/null; then
  echo "⚠️ jq 未安装，PR 前检查 Hook 无法正常工作" >&2
  exit 0
fi

# Read JSON input from stdin
INPUT=$(cat)

# Extract command (with error handling)
if ! COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>&1); then
    echo "⚠️ Hook 无法解析输入 JSON: $COMMAND" >&2
    exit 0  # 不阻止操作，但警告用户
fi

# 只检查 gh pr create 命令
if [[ "$COMMAND" != *"gh pr create"* ]]; then
    exit 0
fi

# 获取项目根目录（从 git）
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

if [[ -z "$PROJECT_ROOT" ]]; then
    exit 0
fi

# 检查是否有 package.json
if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
    exit 0
fi

# 使用 subshell 避免改变调用者的工作目录
(
    cd "$PROJECT_ROOT" || exit 1

    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "  🔍 PR 前检查 (Pre-PR Hook)" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2

    FAILED=0

    # 1. 运行 typecheck（如果有这个 script）
    if grep -q '"typecheck"' "$PROJECT_ROOT/package.json"; then
        echo "  → npm run typecheck..." >&2
        if ! npm run typecheck >/dev/null 2>&1; then
            echo "  ❌ typecheck 失败" >&2
            echo "     运行: npm run typecheck 查看详情" >&2
            FAILED=1
        else
            echo "  ✅ typecheck 通过" >&2
        fi
    fi

    # 2. 运行 test（如果有这个 script）
    if grep -q '"test"' "$PROJECT_ROOT/package.json"; then
        echo "  → npm run test..." >&2
        if ! npm run test >/dev/null 2>&1; then
            echo "  ❌ test 失败" >&2
            echo "     运行: npm run test 查看详情" >&2
            FAILED=1
        else
            echo "  ✅ test 通过" >&2
        fi
    fi

    # 3. 检查是否有新增代码但没写测试
    echo "  → 检查测试覆盖..." >&2

    # 获取本次改动的 .ts 文件（排除 .test.ts 和 .d.ts）
    CHANGED_TS=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null | grep -E '\.tsx?$' | grep -v '\.test\.' | grep -v '\.d\.ts$' | grep -v 'node_modules' || true)

    if [[ -n "$CHANGED_TS" ]]; then
        # 检查是否也有对应的测试文件变动
        CHANGED_TESTS=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null | grep -E '\.test\.tsx?$' || true)

        if [[ -z "$CHANGED_TESTS" ]]; then
            echo "  ⚠️  有新增/修改的代码但没有测试:" >&2
            echo "$CHANGED_TS" | head -5 | sed 's/^/     /' >&2
            echo "" >&2
            echo "     建议: 为新代码编写测试" >&2
            echo "     跳过: 如果是配置文件或无需测试的改动，可以继续" >&2
            # 警告但不阻止（真正的强制在 CI 覆盖率检查）
        else
            echo "  ✅ 有测试文件变动" >&2
        fi
    else
        echo "  ✅ 无需检查测试（无新增代码文件）" >&2
    fi

    echo "" >&2

    if [[ $FAILED -eq 1 ]]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
        echo "  ❌ 检查未通过，PR 创建被阻止" >&2
        echo "  请先修复问题再创建 PR" >&2
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
        echo "" >&2
        exit 2  # 阻止操作
    fi
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  ✅ 所有检查通过，允许创建 PR" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2

exit 0
