# Step 10: Cleanup

> 清理分支 + 可选 Learn

**前置条件**：step >= 9（已合并）
**完成后设置状态**：
```bash
git config branch."$BRANCH_NAME".step 10
```

---

## 使用 cleanup 脚本（推荐）

```bash
bash skills/dev/scripts/cleanup.sh "$BRANCH_NAME" "$BASE_BRANCH"
```

**脚本会**：
1. 切换到 base 分支
2. 拉取最新代码
3. 删除本地 cp-* 分支
4. 删除远程 cp-* 分支
5. 清理 git config
6. 清理 stale remote refs

---

## 手动清理（备用）

```bash
# 清理 git config
git config --unset branch.$BRANCH_NAME.base-branch 2>/dev/null || true
git config --unset branch.$BRANCH_NAME.prd-confirmed 2>/dev/null || true

# 切回 base 分支
git checkout "$BASE_BRANCH"
git pull

# 删除本地分支
git branch -D "$BRANCH_NAME" 2>/dev/null || true

# 删除远程分支
git push origin --delete "$BRANCH_NAME" 2>/dev/null || true

# 清理 stale refs
git remote prune origin 2>/dev/null || true
```

---

## 可选：Learn

**完成开发后，记录经验（可选）**：

### Engine 层面
工作流有什么可以改进的？
- /dev 流程哪里不顺？
- 缺少什么步骤？

如果有，追加到 `zenithjoy-engine/docs/LEARNINGS.md`

### 项目层面
目标项目有什么值得记录的？
- 踩了什么坑？
- 学到了什么？

如果有，追加到项目的 `docs/LEARNINGS.md`

---

## 完成 🎉

```bash
echo "🎉 本轮开发完成！"
```
