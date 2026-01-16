# ZenithJoy Core

AI 开发工作流系统 - 把 AI Factory 全局化。

---

## 核心理念

**串行、小任务、强验收**

- 不追求并行
- 不追求流程内自律
- 只追求：CI 绿 = 完成，CI 红 = 继续修

---

## 目录结构

```
zenithjoy-core/
├── .github/workflows/    # CI 配置
│   └── ci.yml
├── hooks/                # Claude Code Hooks
│   ├── branch-protect.sh # 分支保护
│   └── project-detect.sh # 项目检测
├── skills/               # Claude Code Skills
│   ├── init-project.md   # /init-project
│   ├── new-task.md       # /new-task
│   └── finish.md         # /finish
├── templates/            # 模板文件
│   └── DOD-TEMPLATE.md
├── scripts/              # 工具脚本
└── docs/                 # 文档
```

---

## Skills 使用

| 命令 | 说明 |
|------|------|
| `/init-project` | 初始化新项目（git + GitHub + CI + 分支） |
| `/new-task` | 开始新任务（checkpoint 分支 + DoD） |
| `/finish` | 完成任务（PR + CI 验收） |

---

## 分支流程

```
main (受保护)
  │
  └── feature/xxx (功能分支)
        │
        ├── cp-xxx-01 → PR → feature ✅
        ├── cp-xxx-02 → PR → feature ✅
        └── cp-xxx-03 → PR → feature ✅
              │
              └── feature 完成 → PR → main
```

---

## 核心规则

1. **不直接在 main 上开发** - Hook 会阻止
2. **每个任务 = 一个 checkpoint 分支**
3. **CI 绿是唯一完成标准**
4. **PR 是唯一验收入口**

---

## ⚠️ 对话开始时必须检查

**每次对话开始，先检查状态文件：**

```bash
STATE_FILE=~/.ai-factory/state/current-task.json
if [ -f "$STATE_FILE" ]; then
  PHASE=$(jq -r '.phase' "$STATE_FILE")
  TASK_ID=$(jq -r '.task_id' "$STATE_FILE")
  PR_URL=$(jq -r '.pr_url // empty' "$STATE_FILE")

  echo "📋 发现未完成任务："
  echo "   任务: $TASK_ID"
  echo "   阶段: $PHASE"
  [ -n "$PR_URL" ] && echo "   PR: $PR_URL"
fi
```

**根据 phase 决定下一步：**

| phase | 状态 | 下一步 |
|-------|------|--------|
| `TASK_CREATED` | 刚创建分支 | 运行 /dev 生成 PRD + DoD |
| `EXECUTING` | 开发中 | 继续写代码或自测 |
| `PR_CREATED` | PR 已创建 | 检查 CI 状态，通过则 /cleanup |
| `CLEANUP_DONE` | 已清理 | 运行 /learn 记录经验 |
| (无文件) | 干净状态 | 可以开始新任务 |

**如果 phase = PR_CREATED，检查 CI 状态：**

```bash
gh pr status
# 或
gh pr view <PR_URL> --json state,statusCheckRollup
```

- CI 通过 + 已合并 → /cleanup → /learn
- CI 失败 → 修复 → 重新 push

---

## 状态存储

- **本地**: `.ai-factory/state.json`
- **Notion**: 会话摘要和任务状态
- **Dashboard**: 开发流程可视化（规划中）

---

## 后续接入

- [ ] Cecilia（AI 助手）
- [ ] Dashboard（开发流程可视化）
- [ ] CI 失败通知（Notion）

---

**版本**: 0.1.0
**创建**: 2026-01-15
