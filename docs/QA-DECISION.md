# QA Decision

Decision: MANUAL_ONLY
Priority: P1
RepoType: Engine

Tests:
  - dod_item: "auto-merge.yml 工作流文件存在"
    method: manual
    location: manual:file-check
  - dod_item: "工作流监听正确的事件"
    method: manual
    location: manual:code-review
  - dod_item: "检查逻辑正确"
    method: manual
    location: manual:code-review
  - dod_item: "使用 squash merge 策略"
    method: manual
    location: manual:code-review
  - dod_item: "创建测试 PR"
    method: manual
    location: manual:github-pr
  - dod_item: "CI 通过后手动 approve"
    method: manual
    location: manual:github-pr
  - dod_item: "工作流自动触发"
    method: manual
    location: manual:github-actions
  - dod_item: "PR 自动合并成功"
    method: manual
    location: manual:github-pr
  - dod_item: "CI 全绿"
    method: auto
    location: contract:C2-001
  - dod_item: "代码审计通过"
    method: manual
    location: manual:audit

RCI:
  new: []
  update: []

Reason: P1 配置任务 - 添加 GitHub Actions 自动合并工作流。配置文件类任务，无核心业务逻辑，手动测试即可，不需要添加 RCI 条目。
