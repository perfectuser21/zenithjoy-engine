# Step 8: CI + Codex Review

> 质检闭环：CI 通过 + Codex review 通过

**前置条件**：step >= 7（PR 已创建）
**完成后设置状态**：
```bash
git config branch."$BRANCH_NAME".step 8
```

---

## 质检循环

```
PR 创建
    │
    ▼
┌─────────────────────────────────────┐
│  轮询检查（每 30 秒）：              │
│    1. CI 状态                       │
│    2. Codex review 评论             │
└─────────────────────────────────────┘
    │
    ├── CI 失败 → 修复 → 重新 push
    │
    ├── Codex 有问题 → 修复 → 重新 push
    │
    └── 都通过 → 等待合并
```

---

## 使用轮询脚本

```bash
bash skills/dev/scripts/wait-for-merge.sh "$PR_URL"
```

**退出码**：
- `0` = PR 已合并
- `1` = 需要修复
- `2` = 超时

---

## CI 失败修复

```bash
# 1. 读取 CI 错误
gh run view --log-failed

# 2. 修复代码

# 3. 重新提交
git add -A
git commit -m "fix: 修复 CI 错误"
git push
```

---

## Codex 问题修复

```bash
# 1. 读取 Codex 评论
gh api repos/:owner/:repo/issues/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "chatgpt-codex-connector[bot]") | .body'

# 2. 根据反馈修复代码

# 3. 重新提交
git add -A
git commit -m "fix: 根据 Codex review 修复"
git push
```
