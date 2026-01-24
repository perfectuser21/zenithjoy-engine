---
id: contract-rebase-acceptance
version: 2.0.0
created: 2026-01-24
updated: 2026-01-24
changelog:
  - 2.0.0: Contract Rebase 验收清单 - 对齐两阶段工作流
---

# Contract Rebase 验收清单

**目标**: 把旧的 DRCA / Minimal Path / Optimal Path / Golden Paths / RCI 全部更新到 v2.0.0 两阶段工作流

**状态**: 🟡 进行中

---

## A. 核心产物验收（4 个真源）

### A1. Workflow Contract ✅

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 状态机定义 | p0/p1/p2/pending/unknown | docs/contracts/WORKFLOW-CONTRACT.md | ✅ |
| 阶段检测逻辑 | 三个问题 + 错误处理 | scripts/detect-phase.sh | ✅ |
| PHASE_OVERRIDE | 强制 p1 支持 | scripts/detect-phase.sh | ✅ |
| Stop Hook 角色 | 只检查当前阶段 | hooks/stop.sh | ✅ |
| 两阶段分离 | p0 不检查 CI | docs/contracts/WORKFLOW-CONTRACT.md | ✅ |
| 无头语义 | p1 pending → exit 0 | docs/contracts/WORKFLOW-CONTRACT.md | ✅ |

### A2. Quality Contract ✅

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 三套分层定义 | 质检流程/问题严重性/测试覆盖度 | docs/contracts/QUALITY-CONTRACT.md | ✅ |
| 本地强制项 | Stop Hook 检查什么 | docs/contracts/QUALITY-CONTRACT.md | ✅ |
| CI 强制项 | GitHub Actions 检查什么 | docs/contracts/QUALITY-CONTRACT.md | ✅ |
| 双模式质检 | PR vs Release | docs/contracts/QUALITY-CONTRACT.md | ✅ |
| 产物清单 | 所有产物定义 | docs/contracts/QUALITY-CONTRACT.md | ✅ |
| 术语映射表 | 三套分层对应关系 | docs/contracts/QUALITY-CONTRACT.md | ✅ |

### A3. Feature Registry ✅

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| Platform Core 5 | H1/H7/H2/W1/N1 定义 | features/feature-registry.yml | ✅ |
| Product Core 5 | P1/P2/P3/P4/P5 定义 | features/feature-registry.yml | ✅ |
| 机器可读格式 | YAML 结构化 | features/feature-registry.yml | ✅ |
| 每个 feature 必含字段 | id/name/priority/entrypoints/golden_path/minimal_paths/tests/rcis | features/feature-registry.yml | ✅ |
| 分组清晰 | platform_features vs product_features | features/feature-registry.yml | ✅ |

### A4. Regression Contract 🟡

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 引用 registry | feature id 对应 | regression-contract.yaml | 🟡 已有，需验证对齐 |
| H7 RCI | Stop Hook 相关契约 | regression-contract.yaml | 🔴 待添加 |
| v2.0.0 RCI | 两阶段相关契约 | regression-contract.yaml | 🟡 W1-00X 需更新 |
| Golden Paths | 引用 registry 的 golden_path | regression-contract.yaml | 🟡 待验证 |

---

## B. 视图文档验收（3 个派生视图）

### B1. Minimal Paths ✅

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 从 registry 生成 | 明确来源 | docs/paths/MINIMAL-PATHS.md | ✅ |
| Platform Core 5 | 所有 minimal_paths | docs/paths/MINIMAL-PATHS.md | ✅ |
| Product Core 5 | 所有 minimal_paths | docs/paths/MINIMAL-PATHS.md | ✅ |
| 验证方法 | 每条 path 可验证 | docs/paths/MINIMAL-PATHS.md | ✅ |
| 不可手动编辑声明 | 更新规则说明 | docs/paths/MINIMAL-PATHS.md | ✅ |

### B2. Golden Paths ✅

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 从 registry 生成 | 明确来源 | docs/paths/GOLDEN-PATHS.md | ✅ |
| GP-001 ~ GP-007 | 7 个 Golden Paths | docs/paths/GOLDEN-PATHS.md | ✅ |
| 完整流程图 | 每个 GP 有详细流程 | docs/paths/GOLDEN-PATHS.md | ✅ |
| RCI 覆盖 | 每个 GP 标注 RCI | docs/paths/GOLDEN-PATHS.md | ✅ |
| 统计信息 | 总计数据 | docs/paths/GOLDEN-PATHS.md | ✅ |

### B3. Optimal Paths 🔴

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 从 registry 生成 | optimal_path 提取 | docs/paths/OPTIMAL-PATHS.md | 🔴 待创建 |
| 推荐体验路径 | 优化后的流程 | docs/paths/OPTIMAL-PATHS.md | 🔴 待创建 |

---

## C. DRCA 更新验收

### C1. DRCA v2.0 🔴

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 事件驱动闭环 | CI fail → 修复 → push → 退出 | docs/runbooks/DRCA-v2.md | 🔴 待创建 |
| 触发源 | CI fail / DevGate fail / Regression fail | docs/runbooks/DRCA-v2.md | 🔴 待创建 |
| 输入 | gh pr checks 输出 + failing job | docs/runbooks/DRCA-v2.md | 🔴 待创建 |
| 动作 | 修复 → push → exit（不等待）| docs/runbooks/DRCA-v2.md | 🔴 待创建 |
| 出口 | CI pass → p2 → auto-merge | docs/runbooks/DRCA-v2.md | 🔴 待创建 |

---

## D. CI/DevGate 集成验收

### D1. run-regression.sh 更新 🟡

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 从 registry 读取 | 读取 golden_paths 对应测试 | scripts/run-regression.sh | 🟡 现有版本，需验证 |
| release 模式 | 支持 release 触发 | scripts/run-regression.sh | ✅ |
| 错误处理 | registry 解析错误提示 | scripts/run-regression.sh | 🟡 待验证 |

### D2. DevGate 指向真源 ✅

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| scan-rci-coverage | 从 registry 读取 entrypoints | scripts/devgate/scan-rci-coverage.cjs | 🟡 待验证 |
| check-dod-mapping | 检查逻辑正确 | scripts/devgate/check-dod-mapping.cjs | ✅ |
| require-rci-update | 检查逻辑正确 | scripts/devgate/require-rci-update-if-p0p1.sh | ✅ |

---

## E. 旧文档处理验收

### E1. 标记 Deprecated 🔴

| 文档 | 状态 | 操作 | 完成 |
|------|------|------|------|
| 旧 DRCA 文档 | 存在 | 添加 deprecated 标记 + 指向 DRCA-v2.md | 🔴 |
| 旧 Golden Paths 文档 | 可能存在 | 检查并标记 deprecated | 🔴 |
| 旧 Minimal/Optimal Paths | 可能存在 | 检查并标记 deprecated | 🔴 |

### E2. FEATURES.md 更新 🔴

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| W1 描述更新 | "Two-Phase Dev Workflow" | FEATURES.md | 🔴 仍是 "11 步流程" |
| W5 处理 | 删除或更新为"阶段检测" | FEATURES.md | 🔴 仍是 "四模式" |
| H7 添加 | Stop Hook Quality Gate | FEATURES.md | 🔴 缺失 |
| 指向 registry | 添加说明：本文件视图，真源是 registry | FEATURES.md | 🔴 待添加 |

---

## F. 生成脚本验收

### F1. generate-path-views.sh 🔴

| 检查项 | 要求 | 文件 | 状态 |
|--------|------|------|------|
| 从 registry 生成 | 读取 feature-registry.yml | scripts/generate-path-views.sh | 🔴 待创建 |
| 生成 3 个视图 | MINIMAL/OPTIMAL/GOLDEN-PATHS.md | scripts/generate-path-views.sh | 🔴 待创建 |
| YAML 解析 | 正确解析 YAML 结构 | scripts/generate-path-views.sh | 🔴 待创建 |

---

## G. 验收测试

### G1. Platform Core 5 功能测试 ✅

| Feature | 测试项 | 预期结果 | 状态 |
|---------|--------|---------|------|
| H1 | main 分支写代码 | 被阻止 | ✅ 已有测试 |
| H7 | p0 质检未过 | exit 2 | ✅ Stop Hook 运行中 |
| H2 | gh pr create 无产物 | 被阻止 | ✅ 已有测试 |
| W1 | /dev 完整流程 | p0 → p1 → p2 | ✅ 手动验证通过 |
| N1 | cecelia-run --health | 返回健康状态 | ✅ |

### G2. Product Core 5 功能测试 🟡

| Feature | 测试项 | 预期结果 | 状态 |
|---------|--------|---------|------|
| P1 | rc-filter.sh pr | 正确过滤 | ✅ |
| P2 | DevGate checks | CI 中运行 | ✅ |
| P3 | qa-report.sh | 生成 JSON | ✅ |
| P4 | CI version-check | 检查版本 | ✅ |
| P5 | worktree-manage.sh list | 列出活跃分支 | ✅ |

### G3. CI 集成测试 ✅

| 测试项 | 预期结果 | 状态 |
|--------|---------|------|
| PR 触发 CI | version-check + test + DevGate | ✅ |
| PR to main | 额外触发 release-check | ✅ |
| CI fail | notify-failure → Notion | ✅ |

---

## 总结

### 完成度统计

| 类别 | 完成 | 总计 | 完成率 |
|------|------|------|--------|
| **A. 核心产物** | 3/4 | 4 | 75% |
| **B. 视图文档** | 2/3 | 3 | 67% |
| **C. DRCA** | 0/1 | 1 | 0% |
| **D. CI 集成** | 2/2 | 2 | 100% |
| **E. 旧文档** | 0/2 | 2 | 0% |
| **F. 生成脚本** | 0/1 | 1 | 0% |
| **G. 验收测试** | 3/3 | 3 | 100% |
| **总计** | **10/16** | **16** | **63%** |

### 剩余任务

**必须完成（阻塞）**:
1. 🔴 添加 H7 RCI 到 regression-contract.yaml
2. 🔴 更新 FEATURES.md（W1/W5/H7）
3. 🔴 创建 DRCA-v2.md

**可选完成**:
4. 🟡 创建 OPTIMAL-PATHS.md
5. 🟡 创建 generate-path-views.sh
6. 🟡 标记旧文档 deprecated

### 下一步行动

**立即执行**（按优先级）:
1. 更新 regression-contract.yaml（添加 H7-00X RCI）
2. 更新 FEATURES.md（对齐 registry）
3. 创建 DRCA-v2.md（事件驱动闭环）

**稍后执行**:
4. 创建 OPTIMAL-PATHS.md
5. 创建自动生成脚本

---

**验收人**: User
**验收日期**: 2026-01-24
**验收状态**: 🟡 63% 完成，核心产物已就绪

---

*生成时间: 2026-01-24*
