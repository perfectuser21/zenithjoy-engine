---
id: phase-3-zero-escape-a-plus
version: 1.0.0
created: 2026-01-24
updated: 2026-01-24
changelog:
  - 1.0.0: Phase 3 模板创建
---

# Phase 3 - Zero-Escape A+ Implementation

## 目标

实现 A+ (100%) Zero-Escape 保护：
- ✅ 任何人（包括 owner）都无法 push main/develop
- ✅ 任何人（包括 owner）都无法绕过 CI 合并
- ✅ 只有 Merge Bot 能完成最终 merge
- ✅ 所有规则在服务器侧强制（不依赖本地 hook）

---

## 前置条件

- [x] Phase 0: Gap Analysis 完成
- [x] Phase 1: 组织创建完成
- [ ] Phase 2: 仓库迁移完成并验证
- [ ] Repository: `ZenithJoycloud/zenithjoy-engine`
- [ ] Owner Type: `Organization`
- [ ] Private: `true`

---

## 实施步骤

### Task 3.1: 配置 Rulesets（或增强型 Branch Protection）

**选项 A: 使用 Rulesets（推荐）**

Rulesets 是组织仓库的现代保护机制，提供更灵活的配置。

**创建 Ruleset**：
```json
{
  "name": "Zero-Escape Protection",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [
    {
      "actor_id": <MERGE_BOT_APP_ID>,
      "actor_type": "Integration",
      "bypass_mode": "always"
    }
  ],
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main", "refs/heads/develop"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [
          {"context": "test"}
        ],
        "strict_required_status_checks_policy": true
      }
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "deletion"
    }
  ]
}
```

**API 命令**：
```bash
# 创建 Ruleset
gh api -X POST repos/ZenithJoycloud/zenithjoy-engine/rulesets \
  --input ruleset-config.json

# 查看 Rulesets
gh api repos/ZenithJoycloud/zenithjoy-engine/rulesets
```

**选项 B: 使用 Branch Protection + Restrictions**

如果不使用 Rulesets，可以继续使用 Branch Protection 但启用 Push Restrictions。

**配置 Push Restrictions**：
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 0
  },
  "restrictions": {
    "users": [],
    "teams": [],
    "apps": ["merge-bot"]
  },
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

**API 命令**：
```bash
# 为 main 分支启用 restrictions
gh api -X PUT repos/ZenithJoycloud/zenithjoy-engine/branches/main/protection \
  --input protection-with-restrictions.json

# 为 develop 分支启用 restrictions
gh api -X PUT repos/ZenithJoycloud/zenithjoy-engine/branches/develop/protection \
  --input protection-with-restrictions.json
```

**验证**：
```bash
# 检查 main 分支的 restrictions
gh api repos/ZenithJoycloud/zenithjoy-engine/branches/main/protection \
  --jq '.restrictions'

# 应该输出（而不是 null）：
{
  "users": [],
  "teams": [],
  "apps": [{"id": ..., "slug": "merge-bot", "name": "Merge Bot"}]
}
```

---

### Task 3.2: 创建 Merge Bot

**选项 A: GitHub App（推荐）**

GitHub App 提供最细粒度的权限控制。

**创建步骤**：
1. 访问：`https://github.com/organizations/ZenithJoycloud/settings/apps/new`
2. 填写表单：
   - **App name**: `zenithjoy-merge-bot`
   - **Homepage URL**: `https://github.com/ZenithJoycloud/zenithjoy-engine`
   - **Webhook**: 不需要（取消勾选）
3. 设置权限：
   - `Contents`: Read and write（用于 merge）
   - `Pull requests`: Read（用于读取 PR 状态）
   - `Checks`: Read（用于验证 CI 状态）
4. 创建后记录：
   - App ID
   - 生成 Private Key（下载 .pem 文件）
5. 安装到仓库：
   - 访问 App 设置页面 → "Install App"
   - 选择 `ZenithJoycloud/zenithjoy-engine`
   - 只授权此仓库（不要选 "All repositories"）

**验证**：
```bash
# 查看已安装的 Apps
gh api repos/ZenithJoycloud/zenithjoy-engine/installation

# 记录 App ID 和 Installation ID
```

**选项 B: 机器人账号**

如果不想创建 GitHub App，可以使用专用的机器人账号。

**创建步骤**：
1. 创建新 GitHub 账号：`zenithjoy-bot`（需要不同的邮箱）
2. 将账号添加到组织：
   - 访问：`https://github.com/orgs/ZenithJoycloud/people`
   - Invite: `zenithjoy-bot`
3. 为机器人账号创建 Personal Access Token：
   - 权限：`repo`（完整仓库访问）
   - 有效期：≤366 天（符合组织策略）
4. 将机器人账号添加到 Branch Protection restrictions

**API 命令**：
```bash
# 将机器人账号添加为唯一写入者
gh api -X PUT repos/ZenithJoycloud/zenithjoy-engine/branches/main/protection \
  -f restrictions='{"users":["zenithjoy-bot"],"teams":[],"apps":[]}'
```

---

### Task 3.3: 配置 Merge Bot Workflow

创建 GitHub Actions workflow 用于自动 merge。

**文件**：`.github/workflows/auto-merge.yml`

```yaml
name: Auto Merge

on:
  pull_request:
    types: [labeled]

jobs:
  auto-merge:
    if: github.event.label.name == 'auto-merge'
    runs-on: ubuntu-latest
    steps:
      - name: Check CI Status
        id: ci
        run: |
          # 检查所有 required checks 是否通过
          gh pr checks ${{ github.event.pull_request.number }} --json state \
            | jq -e 'all(.state == "SUCCESS")'
        env:
          GH_TOKEN: ${{ secrets.MERGE_BOT_TOKEN }}

      - name: Merge PR
        if: steps.ci.outcome == 'success'
        run: |
          gh pr merge ${{ github.event.pull_request.number }} \
            --auto --squash
        env:
          GH_TOKEN: ${{ secrets.MERGE_BOT_TOKEN }}
```

**配置 Secret**：
```bash
# 如果使用 GitHub App，设置 App credentials
gh secret set MERGE_BOT_APP_ID --repo ZenithJoycloud/zenithjoy-engine
gh secret set MERGE_BOT_PRIVATE_KEY --repo ZenithJoycloud/zenithjoy-engine

# 如果使用机器人账号，设置 PAT
gh secret set MERGE_BOT_TOKEN --repo ZenithJoycloud/zenithjoy-engine
```

---

### Task 3.4: 创建 Trust Proof Suite v2

扩展原有的 Trust Proof Suite，增加组织特定的测试。

**文件**：`scripts/trust-proof-suite-v2.sh`

**新增测试项**（除了原有 10 项）：

```bash
# TP-11: Repository is owned by Organization
test_case "TP-11: Repository is Organization-owned" "pass" \
    "gh api repos/$REPO --jq -e '.owner.type == \"Organization\"'"

# TP-12: Push restrictions enabled for main
test_case "TP-12: Push restrictions enabled for main" "pass" \
    "gh api repos/$REPO/branches/main/protection --jq -e '.restrictions != null'"

# TP-13: Push restrictions enabled for develop
test_case "TP-13: Push restrictions enabled for develop" "pass" \
    "gh api repos/$REPO/branches/develop/protection --jq -e '.restrictions != null'"

# TP-14: Only Merge Bot can push to main
test_case "TP-14: Only Merge Bot in restrictions (main)" "pass" \
    "gh api repos/$REPO/branches/main/protection --jq -e '.restrictions.users | length == 0 or .restrictions.apps | length > 0'"

# TP-15: Rulesets enabled (if using Rulesets)
test_case "TP-15: Rulesets configured" "pass" \
    "gh api repos/$REPO/rulesets --jq -e 'length > 0'"
```

**运行**：
```bash
bash scripts/trust-proof-suite-v2.sh
```

**期望输出**：
```
========================================
  Trust Proof Suite v2
  Repository: ZenithJoycloud/zenithjoy-engine
========================================

[TP-01] Direct push to main MUST fail ..................... ✅ PASS
[TP-02] Direct push to develop MUST fail .................. ✅ PASS
...
[TP-15] Rulesets configured ............................... ✅ PASS

========================================
  SUMMARY
========================================
Passed: 15/15
Failed: 0/15

Status: A+ (100%) - Organization Zero-Escape compliant
```

---

### Task 3.5: 更新 CI 配置

将 Trust Proof Suite v2 集成到 CI 流程。

**修改**：`.github/workflows/ci.yml`

```yaml
jobs:
  test:
    # ... 现有测试

  trust-proof:
    name: Trust Proof Suite
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    steps:
      - uses: actions/checkout@v4
      - name: Run Trust Proof Suite v2
        run: bash scripts/trust-proof-suite-v2.sh
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**触发条件**：
- 只在向 `main` 分支提 PR 时运行
- 在所有测试通过后运行
- 作为额外的门控验证

---

## 验收标准

### 功能验收

- [ ] 任何人都无法 push main/develop
- [ ] 任何人都无法通过 API/CLI 绕过 checks 合并
- [ ] 只有 Merge Bot 能完成最终 merge
- [ ] Trust Proof Suite v2 全部通过（>=15 项）
- [ ] CI 集成完成

### 证据要求

- [ ] API 查询结果（证明 restrictions 生效）
- [ ] 实际测试（尝试直推失败）
- [ ] Merge Bot 成功 merge 测试
- [ ] Trust Proof Suite v2 输出截图

---

## 完成后状态

### 保护等级

**A+ (100%)**

| 维度 | 状态 | 证据 |
|------|------|------|
| 必须 PR | ✅ | `required_pull_request_reviews` |
| 必须 CI | ✅ | `required_status_checks` |
| 管理员受限 | ✅ | `enforce_admins: true` |
| Push Restrictions | ✅ | `restrictions.apps: ["merge-bot"]` |
| Merge Bot 唯一写入 | ✅ | Restrictions enforcement |
| Rulesets | ✅ | 组织级 Rulesets 配置 |

### API 证据

```bash
# 查看 main 分支保护（应显示 restrictions）
gh api repos/ZenithJoycloud/zenithjoy-engine/branches/main/protection

# 预期输出包含：
{
  "restrictions": {
    "users": [],
    "teams": [],
    "apps": [{"slug": "merge-bot"}]
  }
}
```

---

## 最终交付物

- [ ] `features/trust-layer/ZERO-ESCAPE-A+.md` - A+ 实施文档
- [ ] `scripts/trust-proof-suite-v2.sh` - 扩展测试套件
- [ ] `.github/workflows/auto-merge.yml` - Merge Bot workflow
- [ ] Merge Bot 配置（App 或账号）
- [ ] CI 集成更新
- [ ] 验证证据（API 输出 + 测试结果）

---

## 下一步

完成 Phase 3 后：
1. 运行完整验证：`bash scripts/trust-proof-suite-v2.sh`
2. 更新 CHANGELOG.md（记录为里程碑版本）
3. 创建 PR 合并 `feature/zero-escape-org-migration` → `develop`
4. 里程碑时合并 `develop` → `main`
5. 部署全局配置：`bash scripts/deploy.sh`
