#!/usr/bin/env bash
# ============================================================================
# 测试层级检测脚本
# ============================================================================
#
# 功能：检测项目能跑哪些测试层级
#
# 层级定义：
#   L1 - 静态分析（typecheck, lint, format）
#   L2 - 单元测试（unit test）
#   L3 - 集成测试（integration test）
#   L4 - E2E 测试（end-to-end test）
#   L5 - 性能测试（benchmark）
#   L6 - 安全测试（audit）
#
# 用法：
#   ./detect-test-level.sh [项目目录]
#   ./detect-test-level.sh --save  # 检测并保存到 .test-level.json
#
# ============================================================================

set -euo pipefail

PROJECT_ROOT="${1:-$(pwd)}"
SAVE_MODE=false

if [[ "${1:-}" == "--save" ]]; then
    SAVE_MODE=true
    PROJECT_ROOT="${2:-$(pwd)}"
fi

cd "$PROJECT_ROOT"

# 初始化层级
L1=false  # 静态分析
L2=false  # 单元测试
L3=false  # 集成测试
L4=false  # E2E 测试
L5=false  # 性能测试
L6=false  # 安全测试

# 检测详情
L1_DETAILS=()
L2_DETAILS=()
L3_DETAILS=()
L4_DETAILS=()
L5_DETAILS=()
L6_DETAILS=()

# ===== L1 静态分析检测 =====
if [[ -f "package.json" ]]; then
    # TypeScript typecheck
    if grep -q '"typecheck"' package.json 2>/dev/null; then
        L1=true
        L1_DETAILS+=("typecheck")
    fi
    # ESLint
    if grep -q '"lint"' package.json 2>/dev/null || [[ -f ".eslintrc.js" ]] || [[ -f ".eslintrc.json" ]] || [[ -f "eslint.config.js" ]]; then
        L1=true
        L1_DETAILS+=("lint")
    fi
    # Prettier
    if grep -q '"format"' package.json 2>/dev/null || [[ -f ".prettierrc" ]] || [[ -f "prettier.config.js" ]]; then
        L1=true
        L1_DETAILS+=("format")
    fi
fi

# Python 静态分析
if [[ -f "pyproject.toml" ]] || [[ -f "setup.py" ]]; then
    if [[ -f ".flake8" ]] || grep -q "flake8" pyproject.toml 2>/dev/null; then
        L1=true
        L1_DETAILS+=("flake8")
    fi
    if [[ -f "mypy.ini" ]] || grep -q "mypy" pyproject.toml 2>/dev/null; then
        L1=true
        L1_DETAILS+=("mypy")
    fi
fi

# Go 静态分析
if [[ -f "go.mod" ]]; then
    L1=true
    L1_DETAILS+=("go vet")
fi

# Shell 脚本
if find . -name "*.sh" -type f -not -path "*/node_modules/*" 2>/dev/null | grep -q .; then
    L1=true
    L1_DETAILS+=("shellcheck")
fi

# ===== L2 单元测试检测 =====
if [[ -f "package.json" ]]; then
    if grep -q '"test"' package.json 2>/dev/null; then
        # 检测测试框架
        if grep -q "vitest" package.json 2>/dev/null; then
            L2=true
            L2_DETAILS+=("vitest")
        elif grep -q "jest" package.json 2>/dev/null; then
            L2=true
            L2_DETAILS+=("jest")
        elif grep -q "mocha" package.json 2>/dev/null; then
            L2=true
            L2_DETAILS+=("mocha")
        else
            L2=true
            L2_DETAILS+=("npm test")
        fi
    fi
fi

# Python 测试
if [[ -d "tests" ]] || [[ -d "test" ]] || [[ -f "pytest.ini" ]] || [[ -f "pyproject.toml" ]]; then
    if command -v pytest &>/dev/null || grep -q "pytest" pyproject.toml 2>/dev/null; then
        L2=true
        L2_DETAILS+=("pytest")
    fi
fi

# Go 测试
if [[ -f "go.mod" ]]; then
    if find . -name "*_test.go" -type f 2>/dev/null | grep -q .; then
        L2=true
        L2_DETAILS+=("go test")
    fi
fi

# ===== L3 集成测试检测 =====
if [[ -f "package.json" ]]; then
    if grep -q '"test:integration"' package.json 2>/dev/null || grep -q '"test:int"' package.json 2>/dev/null; then
        L3=true
        L3_DETAILS+=("integration script")
    fi
fi

# 有 API 目录通常需要集成测试
if [[ -d "src/api" ]] || [[ -d "api" ]] || [[ -d "src/routes" ]] || [[ -d "routes" ]]; then
    L3=true
    L3_DETAILS+=("api routes")
fi

# Docker compose 通常用于集成测试
if [[ -f "docker-compose.yml" ]] || [[ -f "docker-compose.test.yml" ]]; then
    L3=true
    L3_DETAILS+=("docker-compose")
fi

# ===== L4 E2E 测试检测 =====
# Playwright
if [[ -f "playwright.config.ts" ]] || [[ -f "playwright.config.js" ]] || [[ -d "e2e" ]]; then
    L4=true
    L4_DETAILS+=("playwright")
fi

# Cypress
if [[ -f "cypress.config.ts" ]] || [[ -f "cypress.config.js" ]] || [[ -d "cypress" ]]; then
    L4=true
    L4_DETAILS+=("cypress")
fi

# Puppeteer
if grep -q "puppeteer" package.json 2>/dev/null; then
    L4=true
    L4_DETAILS+=("puppeteer")
fi

# 有前端页面通常需要 E2E
if [[ -d "src/pages" ]] || [[ -d "src/app" ]] || [[ -d "pages" ]] || [[ -d "app" ]]; then
    if [[ -f "package.json" ]] && (grep -q "react" package.json 2>/dev/null || grep -q "vue" package.json 2>/dev/null || grep -q "next" package.json 2>/dev/null); then
        L4=true
        L4_DETAILS+=("frontend pages")
    fi
fi

# ===== L5 性能测试检测 =====
if [[ -f "package.json" ]]; then
    if grep -q '"benchmark"' package.json 2>/dev/null || grep -q '"perf"' package.json 2>/dev/null; then
        L5=true
        L5_DETAILS+=("benchmark script")
    fi
fi

if [[ -d "benchmark" ]] || [[ -d "benchmarks" ]] || [[ -d "perf" ]]; then
    L5=true
    L5_DETAILS+=("benchmark dir")
fi

# k6, artillery 等性能测试工具
if [[ -f "k6.js" ]] || [[ -f "artillery.yml" ]]; then
    L5=true
    L5_DETAILS+=("load testing")
fi

# ===== L6 安全测试检测 =====
if [[ -f "package.json" ]]; then
    if grep -q '"audit"' package.json 2>/dev/null; then
        L6=true
        L6_DETAILS+=("npm audit")
    fi
fi

# Snyk
if [[ -f ".snyk" ]]; then
    L6=true
    L6_DETAILS+=("snyk")
fi

# Trivy, Grype 等
if [[ -f ".trivyignore" ]] || [[ -f ".grype.yaml" ]]; then
    L6=true
    L6_DETAILS+=("container scan")
fi

# ===== 计算最高层级 =====
MAX_LEVEL=0
[[ "$L1" == "true" ]] && MAX_LEVEL=1
[[ "$L2" == "true" ]] && MAX_LEVEL=2
[[ "$L3" == "true" ]] && MAX_LEVEL=3
[[ "$L4" == "true" ]] && MAX_LEVEL=4
[[ "$L5" == "true" ]] && MAX_LEVEL=5
[[ "$L6" == "true" ]] && MAX_LEVEL=6

# ===== 输出结果 =====
join_array() {
    local IFS=','
    echo "$*"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  测试层级检测结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  项目: $(basename "$PROJECT_ROOT")"
echo "  最高层级: L$MAX_LEVEL"
echo ""
echo "  L1 静态分析: $([[ "$L1" == "true" ]] && echo "✅ (${L1_DETAILS[*]:-})" || echo "❌")"
echo "  L2 单元测试: $([[ "$L2" == "true" ]] && echo "✅ (${L2_DETAILS[*]:-})" || echo "❌")"
echo "  L3 集成测试: $([[ "$L3" == "true" ]] && echo "✅ (${L3_DETAILS[*]:-})" || echo "❌")"
echo "  L4 E2E测试:  $([[ "$L4" == "true" ]] && echo "✅ (${L4_DETAILS[*]:-})" || echo "❌")"
echo "  L5 性能测试: $([[ "$L5" == "true" ]] && echo "✅ (${L5_DETAILS[*]:-})" || echo "❌")"
echo "  L6 安全测试: $([[ "$L6" == "true" ]] && echo "✅ (${L6_DETAILS[*]:-})" || echo "❌")"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ===== 保存模式 =====
if [[ "$SAVE_MODE" == "true" ]]; then
    # 辅助函数：数组转 JSON
    array_to_json() {
        local arr=("$@")
        if [[ ${#arr[@]} -eq 0 ]]; then
            echo "[]"
        else
            printf '["%s"' "${arr[0]}"
            for ((i=1; i<${#arr[@]}; i++)); do
                printf ',"%s"' "${arr[$i]}"
            done
            printf ']'
        fi
    }

    cat > "$PROJECT_ROOT/.test-level.json" << EOF
{
  "detected_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "max_level": $MAX_LEVEL,
  "levels": {
    "L1": $L1,
    "L2": $L2,
    "L3": $L3,
    "L4": $L4,
    "L5": $L5,
    "L6": $L6
  },
  "details": {
    "L1": $(array_to_json "${L1_DETAILS[@]}"),
    "L2": $(array_to_json "${L2_DETAILS[@]}"),
    "L3": $(array_to_json "${L3_DETAILS[@]}"),
    "L4": $(array_to_json "${L4_DETAILS[@]}"),
    "L5": $(array_to_json "${L5_DETAILS[@]}"),
    "L6": $(array_to_json "${L6_DETAILS[@]}")
  }
}
EOF
    echo ""
    echo "  已保存到: .test-level.json"
fi
