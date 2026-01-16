# /new-task - 创建 Checkpoint 分支

## 功能

创建新的 checkpoint 分支并初始化状态文件（含 checkpoints）。

## 触发条件

- 用户说 `/new-task`
- 用户说 "开始任务"、"新任务"

---

## 执行步骤

### Step 1: 检查当前分支

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "当前分支: $CURRENT_BRANCH"
```

- 如果在 main/master → 提示先创建 feature 分支
- 如果在 feature/* → 继续
- 如果在 cp-* → 提示先完成当前任务或切回 feature

### Step 2: 询问任务描述

```
🤔 请简要描述这个任务:
> 用户输入
```

### Step 3: 创建 checkpoint 分支

```bash
# 格式: cp-YYYYMMDD-HHMM-<task-name>
DATE=$(date +%Y%m%d-%H%M)
TASK_NAME="<用户输入的简短名称>"
BRANCH_NAME="cp-${DATE}-${TASK_NAME}"

git checkout -b "$BRANCH_NAME"
```

### Step 4: 创建状态文件（关键！）

创建 `~/.ai-factory/state/current-task.json`:

```json
{
  "task_id": "cp-YYYYMMDD-HHMM-xxx",
  "branch": "cp-YYYYMMDD-HHMM-xxx",
  "feature_branch": "feature/xxx",
  "created_at": "2026-01-16T12:00:00Z",
  "description": "用户输入的任务描述",
  "phase": "TASK_CREATED",
  "checkpoints": {
    "prd_confirmed": false,
    "dod_defined": false,
    "self_test_passed": false
  }
}
```

**⚠️ 重要**: `checkpoints` 全部初始化为 `false`，Hook 会检查这些状态！

```bash
mkdir -p ~/.ai-factory/state

cat > ~/.ai-factory/state/current-task.json << 'EOF'
{
  "task_id": "<BRANCH_NAME>",
  "branch": "<BRANCH_NAME>",
  "feature_branch": "<FEATURE_BRANCH>",
  "created_at": "<ISO_TIMESTAMP>",
  "description": "<TASK_DESCRIPTION>",
  "checkpoints": {
    "prd_confirmed": false,
    "dod_defined": false,
    "self_test_passed": false
  }
}
EOF
```

### Step 5: 提交初始状态

```bash
git add -A
git commit -m "chore: start task - <task-name>"
```

### Step 6: 输出

```
✅ 新任务已创建

分支: cp-YYYYMMDD-HHMM-xxx
状态文件: ~/.ai-factory/state/current-task.json

Checkpoints (Hook 会检查):
  ☐ prd_confirmed   - PRD 确认后设为 true
  ☐ dod_defined     - DoD 定义后设为 true
  ☐ self_test_passed - 自测通过后设为 true

下一步:
  运行 /dev 开始开发流程
```

---

## 状态文件说明

| 字段 | 作用 | 谁更新 |
|------|------|--------|
| `prd_confirmed` | PRD 确认了吗？ | /dev Step 2 后 |
| `dod_defined` | DoD 定义了吗？ | /dev Step 2 后 |
| `self_test_passed` | 自测通过了吗？ | /dev Step 4 后 |

**Hook 检查规则**:
- 写代码前 → 必须 `prd_confirmed == true` 且 `dod_defined == true`
- git commit 前 → 必须 `self_test_passed == true`（待实现）

---

## 错误处理

| 情况 | 处理 |
|------|------|
| 不在 git 仓库 | 提示无法创建任务 |
| 有未提交的改动 | 提示先提交或暂存 |
| 已在 cp-* 分支 | 提示先完成当前任务 |
| 状态文件已存在 | 询问是否覆盖 |
