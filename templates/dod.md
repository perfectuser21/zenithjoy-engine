# DoD 验收清单

> 此文件用于 PR 前的 Layer 3 需求验收。每个验收项必须：
> 1. 勾选 `[x]`（表示完成）
> 2. 包含 `Evidence: \`Sx\`` 或 `Evidence: \`Cx\`` 引用（指向 .layer2-evidence.md 中的证据）

## 验收项

- [x] **功能 1 描述**
  - 验证方式：具体如何验证
  - Evidence: `S1`

- [x] **功能 2 描述**
  - 验证方式：具体如何验证
  - Evidence: `C1`

- [x] **功能 3 描述**
  - 验证方式：具体如何验证
  - Evidence: `S2`, `C2`

## 备注

- 所有项必须打勾才能提交 PR
- Evidence 引用必须在 .layer2-evidence.md 中存在
- pr-gate-v2.sh 会自动验证以上规则
