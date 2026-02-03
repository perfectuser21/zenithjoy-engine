# QA Decision

Decision: NO_RCI
Priority: P2
RepoType: Engine

## Tests

- dod_item: "nightly.yml 文件已删除"
  method: manual
  location: manual:确认 .github/workflows/nightly.yml 文件不存在

- dod_item: "ci.yml 的快速检查改为并行执行"
  method: manual
  location: manual:检查 ci.yml 中使用 matrix strategy 并行执行 5 个快速检查

- dod_item: "创建了 setup-project composite action"
  method: manual
  location: manual:确认 .github/actions/setup-project/action.yml 存在

- dod_item: "ci.yml 中使用了 setup-project action"
  method: manual
  location: manual:确认 ci.yml 使用 uses: ./.github/actions/setup-project

- dod_item: "regression-contract.yaml 移除 Nightly trigger"
  method: manual
  location: manual:检查 regression-contract.yaml 不再有 trigger: [Nightly]

- dod_item: "CI 运行时间减少约 5 分钟（从 PRD 要求）"
  method: manual
  location: manual:对比 baseline run #21627475457 (74s) 与优化后 CI 时间，预期减少 50-60 秒

- dod_item: "并行执行的 5 个快速检查独立运行成功"
  method: manual
  location: manual:确认 matrix 中 5 个检查各自独立完成

- dod_item: "setup-project action 在所有使用它的 job 中正常工作"
  method: manual
  location: manual:检查所有使用 setup-project 的 jobs 成功完成

- dod_item: "npm run qa 通过"
  method: auto
  location: contract:C2-001

- dod_item: "CI 通过，无新增失败"
  method: manual
  location: manual:等待 GitHub Actions CI 完成

- dod_item: "验证 CI 结构完整性"
  method: manual
  location: manual:确认优化后 CI 行为一致，无功能退化

## RCI

new: []
update: []

## Reason

这是 CI 配置优化（删除失败的 Nightly workflow、提升并行度、减少代码冗余），不涉及核心功能变更或回归风险。修改范围限于 workflow 配置文件，影响是性能提升和可维护性改善。无需新增回归契约，现有 CI 测试（C2-001）足够覆盖。
