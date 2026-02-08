#!/usr/bin/env bash
# ============================================================================
# Stop Hook: /okr 完成条件检查
# ============================================================================
# 检测 .okr-mode 文件，决定是否允许会话结束
#
# 完成条件：
# - PRD 写完了吗？
# - DoD 初稿写完了吗？
# - Feature 创建了吗？
# - Tasks 创建了吗？
#
# 全部满足 → 删除 .okr-mode → exit 0（允许结束）
# 未满足 → JSON API + exit 0（强制循环，继续执行）
# ============================================================================

set -euo pipefail

# ===== 获取项目根目录 =====
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OKR_MODE_FILE="$PROJECT_ROOT/.okr-mode"

# ===== 检查 .okr-mode 文件 =====
if [[ ! -f "$OKR_MODE_FILE" ]]; then
    # 没有 .okr-mode，允许结束
    exit 0
fi

# ===== 读取 .okr-mode 内容 =====
OKR_MODE=$(head -1 "$OKR_MODE_FILE" 2>/dev/null || echo "")

if [[ "$OKR_MODE" != "okr" ]]; then
    # 不是 okr 模式，允许结束
    exit 0
fi

echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  [Stop Hook: /okr 完成条件检查]" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2

# ===== TODO: 实现 /okr 完成条件检查 =====
# 1. PRD 写完了吗？
# 2. DoD 初稿写完了吗？
# 3. Feature 创建了吗？
# 4. Tasks 创建了吗？

# 占位实现：直接允许结束
echo "  ⚠️  /okr Stop Hook 尚未实现，暂时允许结束" >&2
echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

# 删除 .okr-mode 并允许结束
rm -f "$OKR_MODE_FILE"
exit 0
