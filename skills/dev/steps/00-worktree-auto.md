---
id: dev-step-00-worktree-auto
version: 2.0.0
created: 2026-01-31
updated: 2026-02-12
changelog:
  - 2.0.0: 简化为强制创建 worktree（修复 Bug 1）
  - 1.0.0: 初始版本 - worktree 自动检测与创建
---

# Step 0: Worktree 强制创建（前置步骤）

> /dev 启动后第一件事：确保在独立 worktree 中工作

**在 Step 1 (PRD) 之前执行**。确保后续所有步骤都在正确的工作目录中。

---

## 核心理念（v2.0 简化）

**每次 /dev 都在独立 worktree 中工作**：
- ✅ 隔离开发环境，避免冲突
- ✅ 支持多任务并行
- ✅ 主仓库保持干净

**不再需要复杂检测**：
- ❌ 删除：多会话检测
- ❌ 删除：.dev-mode 僵尸检测
- ✅ 简化：不在 worktree → 就创建 worktree

---

## 决策逻辑（简化后）

```
检测是否在 worktree 中？
  ├─ 是 → 跳过，继续 Step 1
  └─ 否 → 强制创建 worktree → cd → npm install → 继续 Step 1
```

---

## 执行步骤

### 1. 检测是否已在 worktree 中

```bash
# 检测是否在 worktree 中
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
IS_WORKTREE=false

if [[ "$GIT_DIR" == *"worktrees"* ]]; then
    IS_WORKTREE=true
    echo "✅ 已在 worktree 中，继续 Step 1"
    # 跳过创建，直接继续 Step 1
    exit 0
fi

echo "📍 当前在主仓库，需要创建 worktree"
```

### 2. 提取 task-name

```bash
# 从用户输入或 PRD 文件名提取 task-name
# 示例：
#   /dev "修复登录 bug" → task-name = "fix-login-bug"
#   /dev .prd-add-api.md → task-name = "add-api"

# 如果有 PRD 文件参数
if [[ -f "$PRD_FILE" ]]; then
    TASK_NAME=$(basename "$PRD_FILE" .md | sed 's/^\.prd-//')
else
    # 从用户输入生成（由 AI 生成简短英文名）
    TASK_NAME="<AI-generated-task-name>"
fi

echo "📝 任务名: $TASK_NAME"
```

### 3. 创建 worktree

```bash
echo "🔀 创建独立 worktree..."

# 调用 worktree-manage.sh 创建
# 注意：worktree-manage.sh 会自动更新 develop（Bug 2 修复）
WORKTREE_PATH=$(bash ~/.claude/skills/dev/scripts/worktree-manage.sh create "$TASK_NAME" 2>/dev/null | tail -1)

if [[ -z "$WORKTREE_PATH" || ! -d "$WORKTREE_PATH" ]]; then
    echo "❌ Worktree 创建失败"
    exit 1
fi

echo "✅ Worktree 创建成功: $WORKTREE_PATH"
```

### 4. 切换到 worktree

```bash
# cd 到 worktree
cd "$WORKTREE_PATH" || exit 1

echo "📂 已切换到: $(pwd)"
```

### 5. 安装依赖

```bash
# 如果有 package.json，安装依赖
if [[ -f "package.json" ]]; then
    echo "📦 安装依赖..."
    npm install --prefer-offline 2>/dev/null || npm install
    echo "✅ 依赖安装完成"
fi
```

### 6. 完成

```bash
echo "✅ Step 0 完成 - Worktree 环境准备就绪"
echo ""
echo "📍 当前环境："
echo "   Worktree: $WORKTREE_PATH"
echo "   分支: $(git rev-parse --abbrev-ref HEAD)"
echo ""
```

---

## AI 执行要点

1. **提取 task-name**：
   - 从用户输入生成简短英文名（如 `login-feature`、`fix-ci-error`）
   - 或从 PRD 文件名提取（`.prd-xxx.md` → `xxx`）

2. **执行 worktree-manage.sh**：
   - 捕获最后一行输出（worktree 路径）
   - 检查路径是否有效

3. **cd 到 worktree 路径**：
   - 后续所有操作都在 worktree 中
   - 不要回到主仓库

4. **安装依赖**：
   - 检测 package.json 存在时自动 npm install
   - 使用 `--prefer-offline` 加速

5. **继续 Step 1**：
   - PRD 文件直接在 worktree 中创建/使用
   - 不需要从主仓库 copy

---

## 向后兼容

**如果已经在 worktree 中**（用户手动创建）：
- ✅ 跳过创建，直接继续 Step 1
- ✅ 不会重复创建或报错

---

## 清理

**Worktree 在以下时机自动清理**：
- Step 11 (Cleanup) 删除 worktree
- 或 PR 合并后手动运行 `bash scripts/cleanup.sh`

---

## 完成后

继续 → Step 1 (PRD)
