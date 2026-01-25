# QA Decision

Decision: MUST_ADD_RCI
Priority: P0
RepoType: Engine

Tests:
  - dod_item: "scripts/devgate/l2a-check.sh 存在并可执行"
    method: auto
    location: tests/devgate/l2a-check.test.ts

  - dod_item: "l2a-check.sh pr 模式检查 4 个文件"
    method: auto
    location: tests/devgate/l2a-check.test.ts

  - dod_item: "l2a-check.sh release 模式更严格"
    method: auto
    location: tests/devgate/l2a-check.test.ts

  - dod_item: "CI test job 调用 l2a-check.sh pr"
    method: manual
    location: manual:check-ci-yml-test-job

  - dod_item: "CI release-check job 调用 l2a-check.sh release"
    method: manual
    location: manual:check-ci-yml-release-job

  - dod_item: "regression-pr job 存在（if: base_ref == develop）"
    method: manual
    location: manual:check-ci-yml-regression-pr-job

  - dod_item: "ci-passed job 条件 needs 正确"
    method: manual
    location: manual:check-ci-yml-ci-passed-needs

RCI:
  new:
    - C2-002  # CI L2A Gate (pr 模式)
    - C2-003  # CI L2A Gate (release 模式)
    - C4-001  # develop PR regression
  update:
    - C2-001  # CI test job (新增 l2a-check 步骤)

Reason: 补齐 CI L2A 远端检查，堵住 `gh pr merge --auto` 绕过路径。develop PR 增加 L3 子集防止分支腐烂。这是建立"远端可信防线"的关键一步。
