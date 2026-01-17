# Step 1: 准备

> 依赖检查 + 分支检查 + 创建分支 + 上下文回顾

**完成后设置状态**：
```bash
git config branch."$BRANCH_NAME".step 1
```

---

## 1.1 依赖检查

```bash
echo "🔍 检查依赖..."

# gh CLI
if ! command -v gh &> /dev/null; then
  echo "❌ 需要安装 gh CLI: https://cli.github.com/"
  exit 1
fi

# jq
if ! command -v jq &> /dev/null; then
  echo "❌ 需要安装 jq: apt install jq"
  exit 1
fi

# gh 登录状态
if ! gh auth status &> /dev/null; then
  echo "❌ 需要登录 gh: gh auth login"
  exit 1
fi

echo "✅ 依赖检查通过"
```

---

## 1.2 分支检查

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
REPO=$(basename "$(git rev-parse --show-toplevel)")

echo "📍 当前位置："
echo "   Repo: $REPO"
echo "   分支: $BRANCH"
```

**分支处理逻辑**：

| 当前分支 | 动作 |
|----------|------|
| main | ❌ 不能在 main 开发，切到 develop |
| develop | → 创建 cp-* 分支 |
| feature/* | → 创建 cp-* 分支 |
| cp-* | ✅ 继续当前任务，跳到 Step 2 |

---

## 1.3 创建 cp-* 分支

```bash
TIMESTAMP=$(date +%m%d%H%M)
TASK_NAME="<根据用户需求生成>"
BRANCH_NAME="cp-${TIMESTAMP}-${TASK_NAME}"

# 记住当前分支作为 base
BASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# 创建分支
git checkout -b "$BRANCH_NAME"

# 保存 base 分支到 git config
git config branch.$BRANCH_NAME.base-branch "$BASE_BRANCH"

# 设置步骤状态
git config branch.$BRANCH_NAME.step 1

echo "✅ 分支已创建: $BRANCH_NAME"
echo "   Base: $BASE_BRANCH"
echo "   Step: 1 (准备完成)"
```

---

## 1.4 上下文回顾（可跳过）

**快速修复可跳过此步。**

```bash
echo "📖 上下文回顾..."

# 最近变更
head -30 CHANGELOG.md 2>/dev/null || echo "（无 CHANGELOG）"

# 最近 PR
gh pr list --state merged -L 5 2>/dev/null || echo "（无法获取）"

# 项目架构
head -50 docs/ARCHITECTURE.md 2>/dev/null || echo "（无架构文档）"

# 踩坑记录
head -30 docs/LEARNINGS.md 2>/dev/null || echo "（无踩坑记录）"
```

**回顾后确保**：
- 不违反已有架构
- 不重复踩坑
- 与最近改动保持一致
