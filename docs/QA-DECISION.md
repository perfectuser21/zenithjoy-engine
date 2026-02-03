# QA Decision

Decision: MUST_ADD_RCI
Priority: P2
RepoType: Engine

## Tests

- dod_item: "Evidence 时间戳验证"
  method: auto
  location: tests/devgate/l2b-check.test.ts

- dod_item: "Evidence 目录验证"
  method: auto
  location: tests/devgate/l2b-check.test.ts

- dod_item: "CI Run ID 支持"
  method: auto
  location: tests/devgate/l2b-check.test.ts

## RCI

new:
  - C3-001  # Evidence 时间戳验证
  - C3-002  # Evidence 文件存在性验证
  - C3-003  # Evidence metadata 完整性验证

update: []

## Reason

P2 级别的 Evidence 系统安全强化，防止伪造证据，必须纳入回归契约确保验证机制不被绕过。

## Analysis

**RepoType: Engine**

根据仓库结构判断：
- ✅ 包含 `regression-contract.yaml`
- ✅ 包含 `hooks/` 和 `skills/` 目录
- ✅ 包含 workflow/gate 相关文件
→ RepoType = Engine

**Priority: P2**

根据严重性映射规则：
- 问题严重性：MEDIUM (影响 Evidence 可信度，但不影响核心 CI 流程)
- 业务优先级：P2 (中等优先级，计划修复)

**Decision: MUST_ADD_RCI**

符合 RCI 判定标准：
1. **Must-never-break**: Evidence 验证机制不能被绕过
   - 时间戳验证防止使用旧证据
   - 文件存在性验证防止空引用
   - Metadata 验证确保证据来源可追溯

2. **Verifiable**: 可以通过自动化测试验证
   - 时间戳验证：测试旧/新 Evidence 文件
   - 目录验证：测试缺失文件场景
   - Metadata 验证：测试缺失/无效 metadata

3. **Stable Surface**: 涉及稳定的 CI 质检流程
   - l2b-check.sh 是 Release 模式的关键检查
   - Evidence 系统是 L2B 层的核心组件
   - 验证逻辑变更影响所有 Release PR

**RCI ID 建议**:

- **C3-001**: CI/Release - Evidence 时间戳验证
  - 位置: `scripts/devgate/l2b-check.sh`
  - 验证: Evidence 文件修改时间在 commit 时间之后
  - Priority: P2, Trigger: [Release]

- **C3-002**: CI/Release - Evidence 文件存在性验证
  - 位置: `scripts/devgate/l2b-check.sh`
  - 验证: 所有引用的 `docs/evidence/` 文件都存在
  - Priority: P2, Trigger: [Release]

- **C3-003**: CI/Release - Evidence metadata 完整性
  - 位置: `scripts/devgate/l2b-check.sh`
  - 验证: YAML frontmatter 包含 commit, timestamp, ci_run_id
  - Priority: P2, Trigger: [Release]

**测试覆盖策略**:

- **Unit Tests**: l2b-check.sh 的各个验证点
  - 时间戳验证逻辑
  - 文件解析和存在性检查
  - Metadata 解析和验证

- **Regression Tests**: 纳入 Release 回归
  - C3-001, C3-002, C3-003 在 Release 时触发
  - 确保 Evidence 系统验证不被绕过

- **E2E Tests**: 不需要独立 E2E
  - 这些是 L2B 检查的一部分
  - 通过 Release workflow 验证即可

**Next Actions**:

1. 创建测试文件 tests/devgate/l2b-check.test.ts
2. 更新 `scripts/devgate/l2b-check.sh` 添加验证逻辑
3. 更新 `regression-contract.yaml` 添加 C3-001, C3-002, C3-003
4. 验证 CI 全绿
