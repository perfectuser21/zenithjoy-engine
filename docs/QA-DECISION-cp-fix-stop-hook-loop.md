---
id: qa-decision-fix-stop-hook-loop
version: 1.0.0
created: 2026-02-01
prd: .prd-fix-stop-hook-loop.md
---

# QA Decision

**Decision**: UPDATE_RCI
**Priority**: P0
**RepoType**: Engine

## Tests

| DoD Item | Method | Location |
|----------|--------|----------|
| Stop Hook 重试机制（20 次计数器） | auto | tests/hooks/stop-hook-retry.test.ts |
| Stop Hook 退出条件（cleanup_done）| auto | tests/hooks/stop-hook-exit.test.ts |
| 11 步 Checklist 追踪 | auto | tests/dev/checklist.test.ts |
| 步骤提示优化 | manual | manual: 检查 steps/*.md 末尾格式 |
| Cleanup 完善 | auto | tests/scripts/cleanup.test.ts |
| 完整流程测试（Step 1-11）| auto | tests/integration/full-flow.test.ts |
| 中断恢复测试 | auto | tests/integration/resume.test.ts |
| 失败场景测试（20 次重试）| auto | tests/integration/failure.test.ts |

## RCI

**new**: []

**update**:
- `H1-001` - Stop Hook 循环控制（添加 20 次重试验证）
- `H1-002` - .dev-mode 文件生命周期（添加 cleanup_done 检查）
- `W6-003` - 11 步流程完整性（新增 checklist 追踪）

## Reason

Stop Hook 循环机制是 /dev 工作流的核心保障，属于 Engine 核心功能，必须纳入回归契约。本次修复涉及 3 个 Critical 问题（重试次数、提前退出、checklist 缺失），直接影响所有使用 /dev 的开发流程，必须更新现有 RCI 确保不再回退。

## Risk Score Analysis

触发规则：
- **R6**: Core Workflow Changes（hooks/stop.sh + skills/dev/steps/*.md）
- **R3**: Cross-Module Changes（hooks/ + skills/ + scripts/）

**Risk Score**: 2（<3，但因 P0 优先级强制执行 QA Decision）

## Next Actions

1. **更新 regression-contract.yaml**：
   ```yaml
   rcis:
     - id: H1-001
       tests:
         - "npm run test -- tests/hooks/stop-hook-retry.test.ts"
         - "bash tests/hooks/verify-20-retries.sh"

     - id: H1-002
       tests:
         - "npm run test -- tests/hooks/stop-hook-exit.test.ts"
         - "bash tests/hooks/verify-cleanup-done.sh"

     - id: W6-003
       tests:
         - "npm run test -- tests/dev/checklist.test.ts"
         - "bash tests/integration/full-flow.sh"
   ```

2. **Golden Path 更新**（可选）：
   - GP-001 (`/dev` 完整流程) 已覆盖，无需新增

3. **测试编写优先级**：
   - P0: Stop Hook 重试机制测试（必须）
   - P0: 11 步 Checklist 测试（必须）
   - P1: 完整流程集成测试（重要）
   - P2: 失败场景测试（补充）
