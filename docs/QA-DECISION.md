# QA Decision

Decision: MUST_ADD_RCI
Priority: P1
RepoType: Engine

## Tests

- dod_item: "PRD 检查：最少 3 个 section (##)"
  method: auto
  location: tests/devgate/l2a-check.test.ts

- dod_item: "PRD 检查：每个 section 至少 2 行非空内容"
  method: auto
  location: tests/devgate/l2a-check.test.ts

- dod_item: "DoD 检查：最少 3 个验收项"
  method: auto
  location: tests/devgate/l2a-check.test.ts

- dod_item: "DoD 检查：每个验收项必须有 Test 映射"
  method: auto
  location: tests/devgate/l2a-check.test.ts

- dod_item: "Evidence 检查：必须有可复现命令或机器引用"
  method: auto
  location: tests/devgate/l2b-check.test.ts

- dod_item: "Evidence 检查：拒绝纯文字描述"
  method: auto
  location: tests/devgate/l2b-check.test.ts

- dod_item: "Evidence 检查：截图必须存在且非空"
  method: auto
  location: tests/devgate/l2b-check.test.ts

- dod_item: "移除 name.includes() 误判逻辑"
  method: auto
  location: tests/ci/scan-rci-coverage.test.ts

- dod_item: "实现路径精确匹配"
  method: auto
  location: tests/ci/scan-rci-coverage.test.ts

- dod_item: "实现目录匹配"
  method: auto
  location: tests/ci/scan-rci-coverage.test.ts

- dod_item: "实现 glob 匹配"
  method: auto
  location: tests/ci/scan-rci-coverage.test.ts

- dod_item: "假覆盖被正确检测"
  method: auto
  location: tests/ci/scan-rci-coverage.test.ts

## RCI

new:
  - C12-001  # L2A PRD 结构验证（≥3 sections, ≥2 lines each）
  - C12-002  # L2A DoD 结构验证（≥3 items, Test 映射）
  - C12-003  # L2B Evidence 可复现性验证（命令/机器引用）
  - C13-001  # RCI 覆盖率精确匹配（路径/目录/glob）

update: []

## Reason

P1-1 和 P1-2 是 CI 质量检查的结构性漏洞，允许低质量产物和假覆盖率通过检查。增强结构验证可防止空内容绕过，收紧匹配逻辑可消除误报。这些是核心质量保障机制，必须纳入回归契约确保不退化。
