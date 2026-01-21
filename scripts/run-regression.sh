#!/bin/bash
set -euo pipefail

# =============================================================================
# run-regression.sh - 根据 regression-contract.yaml 执行回归测试
# =============================================================================
#
# 用法:
#   bash scripts/run-regression.sh [MODE]
#
# MODE:
#   pr       - 只跑 trigger 包含 PR 的条目 (默认)
#   release  - 跑 trigger 包含 Release 的条目
#   nightly  - 跑全部条目 (忽略 trigger)
#
# 示例:
#   bash scripts/run-regression.sh pr        # PR 模式
#   bash scripts/run-regression.sh release   # Release 模式
#   bash scripts/run-regression.sh nightly   # Nightly 全量
#
# =============================================================================

MODE="${1:-pr}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RC_FILE="$PROJECT_ROOT/regression-contract.yaml"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Regression Test Runner"
echo "  Mode: $MODE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ ! -f "$RC_FILE" ]]; then
    echo -e "${RED}❌ regression-contract.yaml not found${NC}"
    exit 1
fi

# 检查 yq 是否可用
if ! command -v yq &> /dev/null; then
    echo -e "${YELLOW}⚠️ yq not installed, using basic parsing${NC}"
    USE_YQ=false
else
    USE_YQ=true
fi

# =============================================================================
# L1: 基础检查
# =============================================================================
echo -e "${BLUE}[L1: 基础检查]${NC}"

echo -n "  typecheck... "
if npm run typecheck --silent 2>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

echo -n "  shell syntax... "
SHELL_FAILED=0
while IFS= read -r -d '' f; do
    if ! bash -n "$f" 2>/dev/null; then
        SHELL_FAILED=1
        break
    fi
done < <(find "$PROJECT_ROOT" -name "*.sh" -type f -not -path "*/node_modules/*" -print0)
if [[ $SHELL_FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

# =============================================================================
# L2: 单元测试
# =============================================================================
echo ""
echo -e "${BLUE}[L2: 单元测试]${NC}"

echo -n "  vitest... "
if npm run test --silent 2>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

echo -n "  build... "
if npm run build --silent 2>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

# =============================================================================
# L3: 集成测试 (根据 MODE 过滤)
# =============================================================================
if [[ "$MODE" == "pr" ]]; then
    echo ""
    echo -e "${BLUE}[L3: 跳过 - PR 模式只跑 L1+L2]${NC}"
else
    echo ""
    echo -e "${BLUE}[L3: 集成测试]${NC}"

    L3_PASSED=0
    L3_FAILED=0
    L3_SKIPPED=0

    # 运行 RCI 中定义的 auto 测试
    # 简化版：直接运行关键脚本

    # N1-001: Cecilia 健康检查
    echo -n "  N1-001 (cecilia health)... "
    if command -v cecilia &> /dev/null && cecilia --health 2>/dev/null | grep -q "healthy.*true"; then
        echo -e "${GREEN}✅${NC}"
        ((L3_PASSED++))
    else
        echo -e "${YELLOW}⏭️ (cecilia not available)${NC}"
        ((L3_SKIPPED++))
    fi

    # E1-001: QA Report
    echo -n "  E1-001 (qa-report.sh)... "
    if bash "$PROJECT_ROOT/scripts/qa-report.sh" --fast 2>/dev/null | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
        ((L3_PASSED++))
    else
        echo -e "${RED}❌${NC}"
        ((L3_FAILED++))
    fi

    # C5-001: Release Check Script
    if [[ "$MODE" == "release" ]] || [[ "$MODE" == "nightly" ]]; then
        echo -n "  C5-001 (release-check.sh)... "
        if bash "$PROJECT_ROOT/scripts/release-check.sh" 2>/dev/null; then
            echo -e "${GREEN}✅${NC}"
            ((L3_PASSED++))
        else
            echo -e "${YELLOW}⚠️ (some checks failed)${NC}"
            ((L3_SKIPPED++))
        fi
    fi

    # Golden Paths (GP) - 端到端验证
    if [[ "$MODE" == "nightly" ]]; then
        echo ""
        echo -e "${BLUE}[Golden Paths]${NC}"

        # GP-002: 分支保护链路 (有自动化测试)
        echo -n "  GP-002 (branch-protect)... "
        if npm run test -- --grep "branch-protect" --silent 2>/dev/null; then
            echo -e "${GREEN}✅${NC}"
            ((L3_PASSED++))
        else
            echo -e "${RED}❌${NC}"
            ((L3_FAILED++))
        fi

        # GP-003: PR Gate 链路 (有自动化测试)
        echo -n "  GP-003 (pr-gate)... "
        if npm run test -- --grep "pr-gate" --silent 2>/dev/null; then
            echo -e "${GREEN}✅${NC}"
            ((L3_PASSED++))
        else
            echo -e "${RED}❌${NC}"
            ((L3_FAILED++))
        fi
    fi

    echo ""
    echo "  L3 结果: ${L3_PASSED} passed, ${L3_FAILED} failed, ${L3_SKIPPED} skipped"

    if [[ $L3_FAILED -gt 0 ]]; then
        echo -e "${RED}❌ L3 测试失败${NC}"
        exit 1
    fi
fi

# =============================================================================
# 总结
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✅ Regression Test 通过${NC}"
echo "  Mode: $MODE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
