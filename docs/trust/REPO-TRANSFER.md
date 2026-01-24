---
id: repo-transfer-zenithjoycloud
version: 1.0.0
created: 2026-01-24
updated: 2026-01-24
changelog:
  - 1.0.0: 初始版本 - 仓库迁移步骤
---

# 仓库迁移文档 - Phase 2

## 迁移路径

```
perfectuser21/zenithjoy-engine (个人仓库)
    ↓
ZenithJoycloud/zenithjoy-engine (组织仓库)
```

**关键要求**：
- ✅ 保持 PRIVATE
- ✅ 历史完整（所有 commits/PRs/issues）
- ✅ 所有分支保留
- ✅ GitHub Actions secrets 迁移

---

## Pre-Transfer 检查清单

**⚠️ 重要提示：GitHub Token 配置**

组织 ZenithJoycloud 要求使用有效期 ≤366 天的 Personal Access Token：
```
gh: The 'ZenithJoycloud' organization forbids access via a fine-grained personal access tokens
if the token's lifetime is greater than 366 days.
```

如果遇到此错误，请前往调整 token 有效期：
https://github.com/settings/personal-access-tokens/8242706

### 1. 备份当前状态（使用自动化脚本）

```bash
# 推荐：使用自动化脚本收集证据
bash scripts/verify-transfer.sh pre
```

**已收集的基线数据（2026-01-24）**：
```
Repository: perfectuser21/zenithjoy-engine
Owner Type: User
Organization: null
Private: true
Commits: 301
PRs: 30
Issues: 0
Branch Protection (main): ✅ enabled (restrictions: null)
Branch Protection (develop): ✅ enabled (restrictions: null)
```

**或手动收集**：
```bash
# 1.1 记录当前 commit 数量
COMMIT_COUNT_BEFORE=$(git rev-list --all --count)
echo "Commits before: $COMMIT_COUNT_BEFORE"

# 1.2 记录 PR 和 Issue 数量
PR_COUNT_BEFORE=$(gh pr list --state all --json number --jq 'length')
ISSUE_COUNT_BEFORE=$(gh issue list --state all --json number --jq 'length')
echo "PRs before: $PR_COUNT_BEFORE"
echo "Issues before: $ISSUE_COUNT_BEFORE"

# 1.3 记录所有分支
git branch -a > /tmp/branches-before-transfer.txt
echo "Branches saved to /tmp/branches-before-transfer.txt"

# 1.4 记录当前远程 URL
git remote -v > /tmp/git-remotes-before-transfer.txt
echo "Remotes saved to /tmp/git-remotes-before-transfer.txt"
```

### 2. 检查组织设置

```bash
# 2.1 确认组织允许 private repos
gh api orgs/ZenithJoycloud --jq '.plan.private_repos'
# 应该 > 0 或 unlimited

# 2.2 检查组织成员权限策略
gh api orgs/ZenithJoycloud --jq '{
  default_repository_permission,
  members_can_create_private_repositories
}'
```

**期望输出**：
```json
{
  "default_repository_permission": "read",
  "members_can_create_private_repositories": true
}
```

---

## 迁移步骤

### Step 1: GitHub UI 迁移

**⚠️ 注意**：仓库迁移无法通过 API 完成，必须使用 GitHub UI。

1. 打开仓库设置页面：
   ```
   https://github.com/perfectuser21/zenithjoy-engine/settings
   ```

2. 滚动到页面底部 "Danger Zone"

3. 点击 "Transfer ownership"

4. 填写迁移表单：
   - **New owner's GitHub username or organization name**: `ZenithJoycloud`
   - **Confirm repository name**: `zenithjoy-engine`
   - **Type repository name to confirm**: `perfectuser21/zenithjoy-engine`

5. 点击 "I understand, transfer this repository"

6. 等待 GitHub 确认迁移成功

**预期结果**：
- 仓库 URL 变为：`https://github.com/ZenithJoycloud/zenithjoy-engine`
- 仓库保持 PRIVATE
- 所有历史、分支、PRs、Issues 完整保留

---

## Post-Transfer 验证

### 1. 验证仓库状态

```bash
# 1.1 检查仓库是否为 PRIVATE
REPO_PRIVATE=$(gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.private')
if [[ "$REPO_PRIVATE" == "true" ]]; then
    echo "✅ Repository is PRIVATE"
else
    echo "❌ FAIL: Repository is PUBLIC!"
    exit 1
fi

# 1.2 检查 owner 类型
OWNER_TYPE=$(gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.owner.type')
if [[ "$OWNER_TYPE" == "Organization" ]]; then
    echo "✅ Repository is owned by Organization"
else
    echo "❌ FAIL: Owner type is $OWNER_TYPE"
    exit 1
fi

# 1.3 检查 organization 字段
ORG_NAME=$(gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.organization.login')
if [[ "$ORG_NAME" == "ZenithJoycloud" ]]; then
    echo "✅ Organization field is correct"
else
    echo "❌ FAIL: Organization is $ORG_NAME"
    exit 1
fi
```

### 2. 验证历史完整性

```bash
# 2.1 更新本地远程 URL
git remote set-url origin https://github.com/ZenithJoycloud/zenithjoy-engine.git

# 2.2 拉取最新数据
git fetch origin

# 2.3 检查 commit 数量
COMMIT_COUNT_AFTER=$(git rev-list --all --count)
if [[ "$COMMIT_COUNT_AFTER" -eq "$COMMIT_COUNT_BEFORE" ]]; then
    echo "✅ Commit count unchanged: $COMMIT_COUNT_AFTER"
else
    echo "⚠️  Commit count changed: $COMMIT_COUNT_BEFORE → $COMMIT_COUNT_AFTER"
fi

# 2.4 检查 PR 数量
PR_COUNT_AFTER=$(gh pr list --repo ZenithJoycloud/zenithjoy-engine --state all --json number --jq 'length')
if [[ "$PR_COUNT_AFTER" -eq "$PR_COUNT_BEFORE" ]]; then
    echo "✅ PR count unchanged: $PR_COUNT_AFTER"
else
    echo "⚠️  PR count changed: $PR_COUNT_BEFORE → $PR_COUNT_AFTER"
fi

# 2.5 检查 Issue 数量
ISSUE_COUNT_AFTER=$(gh issue list --repo ZenithJoycloud/zenithjoy-engine --state all --json number --jq 'length')
if [[ "$ISSUE_COUNT_AFTER" -eq "$ISSUE_COUNT_BEFORE" ]]; then
    echo "✅ Issue count unchanged: $ISSUE_COUNT_AFTER"
else
    echo "⚠️  Issue count changed: $ISSUE_COUNT_BEFORE → $ISSUE_COUNT_AFTER"
fi

# 2.6 检查分支
git branch -a > /tmp/branches-after-transfer.txt
diff /tmp/branches-before-transfer.txt /tmp/branches-after-transfer.txt
if [[ $? -eq 0 ]]; then
    echo "✅ All branches preserved"
else
    echo "⚠️  Branch differences detected, review /tmp/branches-*.txt"
fi
```

### 3. 更新本地所有工作区

```bash
# 3.1 主工作区
cd /home/xx/dev/zenithjoy-engine
git remote set-url origin https://github.com/ZenithJoycloud/zenithjoy-engine.git
git fetch origin
echo "✅ Main workspace updated"

# 3.2 如果有 worktrees（检查是否存在）
WORKTREES=$(git worktree list --porcelain | grep "^worktree" | awk '{print $2}')
if [[ -n "$WORKTREES" ]]; then
    echo "Found worktrees, updating remote URL..."
    for wt in $WORKTREES; do
        if [[ "$wt" != "/home/xx/dev/zenithjoy-engine" ]]; then
            echo "Updating worktree: $wt"
            cd "$wt"
            git remote set-url origin https://github.com/ZenithJoycloud/zenithjoy-engine.git
            git fetch origin
        fi
    done
    cd /home/xx/dev/zenithjoy-engine
    echo "✅ All worktrees updated"
else
    echo "✅ No worktrees to update"
fi
```

---

## 验证清单

| 检查项 | 命令 | 期望结果 |
|--------|------|----------|
| 仓库为 PRIVATE | `gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.private'` | `true` |
| Owner 是组织 | `gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.owner.type'` | `"Organization"` |
| Organization 字段 | `gh api repos/ZenithJoycloud/zenithjoy-engine --jq '.organization.login'` | `"ZenithJoycloud"` |
| Commit 数量 | `git rev-list --all --count` | 与迁移前相同 |
| PR 数量 | `gh pr list --state all --jq 'length'` | 与迁移前相同 |
| Issue 数量 | `gh issue list --state all --jq 'length'` | 与迁移前相同 |
| 本地远程 URL | `git remote get-url origin` | `https://github.com/ZenithJoycloud/zenithjoy-engine.git` |

---

## 新仓库地址

**迁移后仓库 URL**：
```
https://github.com/ZenithJoycloud/zenithjoy-engine
```

**本地更新命令**（所有开发机器都需要执行）：
```bash
git remote set-url origin https://github.com/ZenithJoycloud/zenithjoy-engine.git
```

---

## Rollback 方案

如果迁移出现问题，可以将仓库转回个人账户：

1. 打开组织仓库设置：
   ```
   https://github.com/ZenithJoycloud/zenithjoy-engine/settings
   ```

2. "Danger Zone" → "Transfer ownership"

3. 填写：
   - **New owner**: `perfectuser21`
   - **Repository name**: `zenithjoy-engine`

4. 确认迁移

5. 恢复本地远程 URL：
   ```bash
   git remote set-url origin https://github.com/perfectuser21/zenithjoy-engine.git
   ```

---

## GitHub Actions Secrets

**迁移后需要重新配置的 Secrets**：

迁移后，GitHub Actions secrets **不会自动迁移**，需要在组织仓库重新设置：

```bash
# 1. 列出原仓库的 secrets（只能看到名字，看不到值）
gh api repos/perfectuser21/zenithjoy-engine/actions/secrets --jq '.secrets[].name'

# 2. 在新仓库中重新设置 secrets
gh secret set SECRET_NAME --repo ZenithJoycloud/zenithjoy-engine
# 输入 secret 值
```

**需要迁移的 Secrets**（根据实际情况）：
- `GH_TOKEN` - GitHub Personal Access Token（如果用于 CI）
- 其他 CI/CD 相关的 secrets

---

## 迁移后解锁的功能

迁移到组织后，以下功能立即可用：

### 1. Push Restrictions

```bash
# 现在可以设置只允许特定用户/团队/App 推送
gh api -X PUT repos/ZenithJoycloud/zenithjoy-engine/branches/main/protection \
  --input protection-with-restrictions.json
```

### 2. Rulesets

```bash
# 现在可以使用完整的 Rulesets API
gh api repos/ZenithJoycloud/zenithjoy-engine/rulesets
```

### 3. 组织级权限控制

可以通过组织设置精确控制：
- 谁可以创建/删除分支
- 谁可以管理 webhooks
- 谁可以访问组织 secrets

---

## 下一步

迁移完成后，继续 **Phase 3: 实现 A+ Zero-Escape**：
1. 配置 Rulesets 或增强型 Branch Protection
2. 启用 Push Restrictions（只允许 Merge Bot）
3. 创建 Merge Bot（GitHub App 或机器人账号）
4. 创建 Trust Proof Suite v2（>=15 tests）
5. 更新 CI 配置

参考：`.prd.md` Phase 3
