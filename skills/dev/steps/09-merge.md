# Step 9: 合并

> CI 通过 + Codex 通过 → 合并 PR

**前置条件**：step >= 8（CI + Codex 通过）
**完成后设置状态**：
```bash
git config branch."$BRANCH_NAME".step 9
```

---

## 完成条件

以下条件全部满足才能合并：

- [ ] CI 全绿
- [ ] Codex review 没有问题（或说 "no issues" / "LGTM"）

---

## 自动合并

如果仓库配置了 auto-merge，满足条件后会自动合并。

---

## 手动合并

如果需要手动合并：

```bash
gh pr merge "$PR_URL" --squash --delete-branch
```

---

## 合并后

PR 合并后，继续下一步 Cleanup。
