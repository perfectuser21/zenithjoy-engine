# Step 3: 创建分支

> 创建 cp-* 分支，记录 base-branch

---

## 环境检查

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
REPO=$(basename "$(git rev-parse --show-toplevel)")

# 检测是否在 worktree 中
IS_WORKTREE=false
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
if [[ "$GIT_DIR" == *"worktrees"* ]]; then
    IS_WORKTREE=true
    MAIN_WORKTREE=$(git worktree list 2>/dev/null | head -1 | awk '{print $1}')
fi

echo "📍 当前位置："
echo "   Repo: $REPO"
echo "   分支: $CURRENT_BRANCH"
if [[ "$IS_WORKTREE" == "true" ]]; then
    echo "   环境: Worktree"
    echo "   主工作区: $MAIN_WORKTREE"
fi
```

**分支处理逻辑**：

| 当前分支 | 动作 |
|----------|------|
| main | 不能在 main 开发，切到 develop |
| develop | → 创建 cp-* 分支 |
| feature/* | → 创建 cp-* 分支 |
| cp-* | ✅ 继续当前任务，跳到 Step 4 |

**Worktree 注意**：如果在 worktree 中，分支已由 worktree-manage.sh 创建。

---

## 创建 cp-* 分支

```bash
# 生成分支名
TIMESTAMP=$(date +%m%d%H%M)
TASK_NAME="<根据用户需求生成>"
BRANCH_NAME="cp-${TIMESTAMP}-${TASK_NAME}"

# 记住当前分支作为 base
BASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🌿 创建分支..."
echo "   名称: $BRANCH_NAME"
echo "   Base: $BASE_BRANCH"

# 创建分支
git checkout -b "$BRANCH_NAME"

# 保存 base 分支到 git config
git config branch.$BRANCH_NAME.base-branch "$BASE_BRANCH"

echo "✅ 分支已创建: $BRANCH_NAME"
echo "   Base: $BASE_BRANCH"
```

---

## 任务名生成规则

根据 PRD 自动生成简短的任务名：

| 功能描述 | 任务名 | 分支名示例 |
|----------|--------|------------|
| 用户登录功能 | login | cp-01181630-login |
| 添加数据导出 | export | cp-01181630-export |
| 修复登录 bug | fix-login | cp-01181630-fix-login |
| 重构用户模块 | refactor-user | cp-01181630-refactor-user |

**规则**：
- 使用英文，小写
- 多个单词用 `-` 连接
- 最多 3 个单词
- 避免使用 `feature`、`add`、`update` 等前缀（分支名已经有 `cp-`）

---

## 恢复现有分支

如果当前已在 cp-* 分支，跳过创建：

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ "$CURRENT_BRANCH" =~ ^cp- ]]; then
    echo "✅ 已在任务分支: $CURRENT_BRANCH"

    # 读取保存的状态
    BASE_BRANCH=$(git config branch.$CURRENT_BRANCH.base-branch)

    echo "   Base: $BASE_BRANCH"
    echo ""
    echo "🔄 继续开发"

    exit 0
fi
```

---

## git config 状态

分支创建后，保存以下状态：

```bash
# 查看分支配置
git config --get branch.$BRANCH_NAME.base-branch
# 输出: develop
```

这些状态用于：
- **base-branch**: PR 时自动设置目标分支

---

## 完成后

```bash
echo "✅ Step 3 完成 (分支创建)"
echo ""
echo "📝 下一步: Step 4 (DoD)"
```

---

## 注意事项

- **分支名必须以 `cp-` 开头** - Hook 检查
- **分支名包含时间戳** - 避免重复
- **base-branch 必须保存** - PR 时使用
