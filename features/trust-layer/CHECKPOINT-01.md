# Checkpoint 01: 修复 Branch Protection 漏洞

## 问题

Branch Protection 虽然设置了：
- ✅ required_status_checks (需要 CI)
- ✅ required_pull_request_reviews (需要 1 个 approval)

但没有设置：
- ❌ Push restrictions - 所以任何人都能直接 push，绕过 PR

**后果**：可以直接 `git push origin develop` 绕过所有门禁。

## 修复方案

启用 push restrictions，只允许通过 PR 合并：

```bash
gh api -X PUT repos/perfectuser21/zenithjoy-engine/branches/develop/protection \
  --input branch-protection-config.json
```

配置：
```json
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "build"},
      {"context": "test"}
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": {
    "users": [],
    "teams": [],
    "apps": []
  },
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false,
  "required_conversation_resolution": false
}
```

**关键**：`restrictions` 设为空数组 = 没有人能直接 push，只能通过 PR。

## GitHub 限制发现

**个人仓库无法启用 Push Restrictions**

- `restrictions` 字段只支持组织仓库
- 个人仓库的 owner 始终可以直接 push
- API 返回: `"Only organization repositories can have users and team restrictions"` (HTTP 422)

## 替代方案

### 方案 A: 迁移到组织仓库（推荐）

迁移 `perfectuser21/zenithjoy-engine` → `zenithjoy-org/zenithjoy-engine`

优点：
- 完全支持 push restrictions
- 可以设置团队权限
- 符合企业级标准

缺点：
- 需要创建组织（免费）
- 需要迁移仓库
- 需要更新所有 remote URL

### 方案 B: 增强本地 Hook + CI 组合（当前）

1. **本地 Hook**: 前置检查 + 证据收集
2. **CI**: 真正的门禁（required_status_checks）
3. **规范**: 禁止直接 push develop/main（靠纪律）

配置：
- required_status_checks: ✅ CI 必须绿
- enforce_admins: ✅ Admin 也要遵守
- required_pull_request_reviews: ❌ 不强制（避免自己给自己 approve）

## 当前应用配置

```bash
# 最大化可用保护
gh api -X PUT repos/perfectuser21/zenithjoy-engine/branches/develop/protection \
  -f required_status_checks[strict]=true \
  -f required_status_checks[checks][][context]=test \
  -f enforce_admins=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

## 验收

- [x] 已应用最大化保护（个人仓库限制内）
- [x] required_status_checks: CI 必须绿
- [x] enforce_admins: Admin 也要遵守
- [ ] 文档化"不要直接 push"规范

## 状态

- [x] 完成（受 GitHub 限制）

## 建议

**长期**：迁移到组织仓库，获得完整 push restrictions。
**短期**：依赖 Hook + CI + 规范。
