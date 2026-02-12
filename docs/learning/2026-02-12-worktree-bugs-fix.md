# 学习记录：修复 Worktree 创建的三个 Bug

**日期**: 2026-02-12  
**PR**: #574  
**版本**: 12.24.0 → 12.24.1

## 问题发现

在讨论工作流时，发现 worktree 创建机制存在三个关键 bug：

### Bug 1: /dev 不强制创建 worktree

**现象**：单任务、无其他会话时，不创建 worktree，直接在主仓库工作。

**原因**：Step 0 使用复杂的检测逻辑，只在特定条件下创建 worktree（检测到其他会话或活跃 .dev-mode 文件）。

**影响**：
- 主仓库被污染
- 无法并行开发

### Bug 2: worktree-manage.sh 不更新 develop

**现象**：连续多个任务时，新 worktree 拿不到前一个任务的代码。

**原因**：创建 worktree 前，不更新主仓库的 develop 分支。

**影响**：
```
Task 1: 主仓库 develop (v1.0) → worktree-1 → PR 合并 → remote develop (v1.1)
Task 2: 主仓库 develop (还是 v1.0!) → worktree-2 → 拿不到 Task 1 的代码 ❌
```

### Bug 3: /exploratory 同样问题

**现象**：Exploratory worktree 创建时也不更新 develop，且没有指定 base 分支。

**原因**：Step 1 中直接 `git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"`，没有指定 base。

## 解决方案

### Bug 1 修复：简化为强制创建

**修改文件**：`skills/dev/steps/00-worktree-auto.md`

**关键改动**：
- 删除复杂的多会话检测、.dev-mode 僵尸检测逻辑
- 简化为：不在 worktree → 就创建 worktree
- 每次 /dev 都在独立 worktree 中工作

**新逻辑**：
```
检测是否在 worktree 中？
  ├─ 是 → 跳过，继续 Step 1
  └─ 否 → 强制创建 worktree → cd → npm install → 继续 Step 1
```

### Bug 2 修复：创建前更新 develop

**修改文件**：`skills/dev/scripts/worktree-manage.sh`

**关键改动**：
- 在 `cmd_create()` 函数中，`git worktree add` 之前添加更新逻辑
- 区分两种情况：
  - 当前在 develop 分支 → `git pull --ff-only`
  - 当前在其他分支 → `git fetch` + `git branch -f`
- 添加错误处理：更新失败时 fallback 到当前版本

**代码片段**：
```bash
# 获取主仓库路径
local main_wt
main_wt=$(get_main_worktree)

# 在主仓库中更新 develop
if git -C "$main_wt" rev-parse --verify "$base_branch" &>/dev/null; then
    local current_branch
    current_branch=$(git -C "$main_wt" rev-parse --abbrev-ref HEAD)

    if [[ "$current_branch" == "$base_branch" ]]; then
        # 当前在 develop，用 pull
        git -C "$main_wt" pull origin "$base_branch" --ff-only 2>&2
    else
        # 不在 develop，用 fetch + branch -f
        if git -C "$main_wt" fetch origin "$base_branch" 2>&2; then
            git -C "$main_wt" branch -f "$base_branch" "origin/$base_branch" 2>&2
        fi
    fi
fi
```

### Bug 3 修复：/exploratory 同步修复

**修改文件**：`skills/exploratory/steps/01-init.md`

**关键改动**：
- 创建前添加 `git pull origin develop --ff-only`
- 明确指定 base 分支：`git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" develop`

## 遇到的坑

### 坑 1: CI 版本检查失败

**问题**：`regression-contract.yaml` 版本不同步。

**解决**：更新 `regression-contract.yaml` 版本号和 updated 日期。

### 坑 2: Impact Check 失败

**问题**：修改了 `features/feature-registry.yml`，但没有更新派生视图。

**解决**：运行 `bash scripts/generate-path-views.sh` 生成派生视图。

### 坑 3: Config Audit 失败

**问题**：PR 标题没有 `[CONFIG]` 前缀。

**解决**：
1. 用 `gh pr edit` 更新 PR 标题
2. 但 CI 中使用的是 `${{ github.event.pull_request.title }}`（固定值）
3. 需要推送新 commit 重新触发 CI

**教训**：修改 PR 标题后，需要推送新 commit（可以是空 commit）才能让 CI 拿到新标题。

### 坑 4: branch-protect Hook 要求 PRD/DoD 文件名匹配分支名

**问题**：创建的 PRD 文件名是 `.prd-fix-worktree-bugs.md`，但 Hook 要求 `.prd-cp-02121533-fix-worktree-bugs.md`。

**解决**：重命名 PRD/DoD 文件以匹配分支名。

## 关键经验

### 1. 强制 worktree 比复杂检测更可靠

**之前**：复杂的检测逻辑（多会话、.dev-mode、僵尸），容易漏判。

**现在**：强制创建，简单可靠。

**好处**：
- 避免在主仓库工作
- 天然支持并行开发
- 逻辑简单，易维护

### 2. 创建 worktree 前必须更新 base 分支

**教训**：如果不更新，连续任务会拿不到前一个任务的代码。

**解决**：
- 在主仓库中 fetch + 更新 develop
- 区分当前分支是否是 develop（pull vs fetch + branch -f）

### 3. CI 检查很严格，但有助于质量

本次修复触发了多个 CI 检查失败：
- version-check：版本号同步
- impact-check：feature-registry 变更需要更新派生视图
- config-audit：关键配置变更需要 [CONFIG] 标记
- contract-drift-check：派生视图必须同步

**好处**：这些检查帮助发现了遗漏的更新，确保了代码质量。

### 4. PR 标题修改后需要重新触发 CI

**原因**：CI 使用的是 GitHub event payload 中的固定值，不会动态查询。

**解决**：推送新 commit（可以是空 commit）重新触发 CI。

## 测试结果

- ✅ 所有 CI 检查通过
- ✅ PR #574 成功合并到 develop
- ✅ 版本号更新：12.24.0 → 12.24.1

## 后续改进

无，修复已完成并验证。

## 总结

这次修复解决了 worktree 创建机制的三个关键 bug，使得：
1. 每次 /dev 都在独立 worktree 中工作（强制隔离）
2. 连续任务能正确拿到前一个任务的代码（自动更新 develop）
3. /exploratory 也同步修复（保持一致性）

这将大大提升并行开发的可靠性，避免主仓库污染和依赖缺失问题。
