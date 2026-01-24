---
id: phase-2-ready
version: 1.0.0
created: 2026-01-24
updated: 2026-01-24
changelog:
  - 1.0.0: Phase 2 准备完成
---

# Phase 2 - Repository Transfer READY

## 状态

✅ **Phase 0**: 完成（GAP-REPORT.md 已创建，API 证据完整）
✅ **Phase 1**: 完成（组织 ZenithJoycloud 已创建）
🔄 **Phase 2**: 准备就绪，等待手动迁移

---

## 已完成的准备工作

### 1. 文档创建
- ✅ `docs/trust/REPO-TRANSFER.md` - 完整的迁移步骤文档
- ✅ `scripts/verify-transfer.sh` - 自动化验证脚本

### 2. Pre-Transfer 证据收集
- ✅ 基线数据已收集（2026-01-24）
- ✅ 证据文件保存在 `/tmp/zenithjoy-engine-transfer-evidence/`

### 3. 基线数据

```json
{
  "repository": "perfectuser21/zenithjoy-engine",
  "owner_type": "User",
  "organization": null,
  "private": true,
  "collected_at": "2026-01-24",
  "metrics": {
    "commits": 301,
    "prs": 30,
    "issues": 0
  },
  "branch_protection": {
    "main": "enabled (A- level, restrictions: null)",
    "develop": "enabled (A- level, restrictions: null)"
  }
}
```

---

## 手动操作步骤

### 准备工作（已完成）

1. ✅ 组织创建：ZenithJoycloud
2. ✅ Pre-transfer 证据收集：`bash scripts/verify-transfer.sh pre`
3. ✅ 文档准备完成

### GitHub Token 配置（必须）

⚠️ **组织安全策略要求**：Personal Access Token 有效期必须 ≤366 天

如果遇到错误：
```
The 'ZenithJoycloud' organization forbids access via a fine-grained personal access tokens
if the token's lifetime is greater than 366 days.
```

**解决方案**：
1. 访问：https://github.com/settings/personal-access-tokens/8242706
2. 调整 token 有效期为 ≤366 天
3. 重新生成 token
4. 更新本地 gh CLI 认证：`gh auth login`

### 迁移操作（需要手动执行）

**步骤 1: 访问仓库设置页面**
```
https://github.com/perfectuser21/zenithjoy-engine/settings
```

**步骤 2: 滚动到 "Danger Zone" 区域**

**步骤 3: 点击 "Transfer ownership"**

**步骤 4: 填写迁移表单**
```
New owner: ZenithJoycloud
Repository name: zenithjoy-engine
Confirm: perfectuser21/zenithjoy-engine
```

**步骤 5: 确认迁移**

点击 "I understand, transfer this repository"

**步骤 6: 等待 GitHub 确认**

GitHub 会发送确认邮件。

---

## 迁移后验证

### 自动化验证（推荐）

```bash
bash scripts/verify-transfer.sh post
```

此脚本会自动：
1. 检查仓库是否为 PRIVATE
2. 验证 owner 是否为 Organization
3. 更新本地远程 URL
4. 对比 commits/PRs/issues 数量
5. 检查分支是否完整
6. 生成验证报告

### 期望结果

```
========================================
  VERIFICATION SUMMARY
========================================
Passed: 8+
Failed: 0

✅ Repository transfer VERIFIED
```

---

## 迁移后立即可用的功能

迁移到组织仓库后，以下功能立即解锁：

### 1. Push Restrictions

可以限制只有特定用户/团队/App 可以推送到分支：
```json
"restrictions": {
  "users": [],
  "teams": [],
  "apps": ["merge-bot"]
}
```

### 2. Rulesets（完整版）

可以使用组织级别的 Rulesets：
```json
{
  "bypass_actors": [...],
  "conditions": {"ref_name": {"include": ["refs/heads/main"]}},
  "rules": [...]
}
```

### 3. 精细权限控制

可以通过组织设置精确控制：
- 谁可以创建/删除分支
- 谁可以访问 secrets
- 谁可以管理 webhooks

---

## 下一步：Phase 3

迁移完成并验证通过后，立即进入 **Phase 3: A+ Zero-Escape 实现**

Phase 3 任务：
1. 配置 Rulesets 或增强型 Branch Protection
2. 启用 Push Restrictions（只允许 Merge Bot 写入）
3. 创建 Merge Bot（GitHub App 或机器人账号）
4. 创建 Trust Proof Suite v2（>=15 tests）
5. 更新 CI 配置

参考：`.prd.md` Phase 3 章节

---

## 回滚方案

如果迁移出现问题，可以将仓库转回个人账户：

1. 访问：`https://github.com/ZenithJoycloud/zenithjoy-engine/settings`
2. "Danger Zone" → "Transfer ownership"
3. New owner: `perfectuser21`
4. 确认迁移
5. 恢复本地 URL: `git remote set-url origin https://github.com/perfectuser21/zenithjoy-engine.git`

---

## 证据文件

所有证据文件保存在：
```
/tmp/zenithjoy-engine-transfer-evidence/
├── repo-info-before.json
├── commit-count-before.txt
├── pr-count-before.txt
├── issue-count-before.txt
├── branches-before.txt
├── remote-url-before.txt
├── branch-protection-main-before.json
└── branch-protection-develop-before.json
```

迁移后会额外生成：
```
├── repo-info-after.json
├── commit-count-after.txt
├── pr-count-after.txt
├── issue-count-after.txt
├── branches-after.txt
├── remote-url-after.txt
├── branch-protection-main-after.json (如果保留)
└── branch-protection-develop-after.json (如果保留)
```

---

## 联系信息

- 组织名称：ZenithJoycloud
- 目标仓库：ZenithJoycloud/zenithjoy-engine
- 迁移负责人：perfectuser21

---

## 时间线

- 2026-01-24: Phase 0 完成（Gap Analysis）
- 2026-01-24: Phase 1 完成（组织创建）
- 2026-01-24: Phase 2 准备完成（等待手动迁移）
- TBD: Phase 2 迁移执行
- TBD: Phase 3 A+ Zero-Escape 实现
