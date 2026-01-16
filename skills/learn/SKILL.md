---
name: learn
description: |
  经验累积。开发完成后记录学到的教训。
  自动追加到全局和项目级 LEARNINGS.md。

  触发条件：
  - /finish 完成后自动触发
  - 用户说 /learn 或"记录一下"
---

# /learn - 经验累积

## 功能

开发完成后，记录：
- 踩的坑
- 学到的
- 最佳实践

保存到两个位置：
1. **全局**：`~/.claude/LEARNINGS.md`（所有项目通用）
2. **项目**：`PROJECT_ROOT/LEARNINGS.md`（这个项目特有的）

---

## 执行步骤

### Step 1: 收集信息

问用户或自动总结：

```
这次开发：
1. 踩了什么坑？（可选）
2. 学到了什么？（可选）
3. 有什么最佳实践？（可选）

直接回答，或说"跳过"
```

如果用户说"跳过"，则从本次会话自动提取：
- 遇到的错误
- 修复的方法
- 学到的技巧

### Step 2: 判断全局 vs 项目

```
全局经验（写到 ~/.claude/LEARNINGS.md）：
- GitHub API 用法
- Git 命令技巧
- Claude Code 配置
- 通用工具使用

项目经验（写到 PROJECT_ROOT/LEARNINGS.md）：
- 这个项目的结构
- 这个项目的特殊配置
- 这个项目的 bug 修复
```

### Step 3: 追加到文件

**格式**：

```markdown
## YYYY-MM-DD - 功能名称

### 踩的坑
- 坑 1
- 坑 2

### 学到的
- 学到 1
- 学到 2

### 最佳实践
- 实践 1
- 实践 2

---
```

**命令**：

```bash
DATE=$(date +%Y-%m-%d)
FEATURE="功能名称"

# 追加到全局
cat >> ~/.claude/LEARNINGS.md << EOF

## $DATE - $FEATURE

### 踩的坑
- xxx

### 学到的
- xxx

---
EOF

# 追加到项目
cat >> ./LEARNINGS.md << EOF
...
EOF
```

### Step 4: 确认

```
✅ 经验已记录

全局: ~/.claude/LEARNINGS.md
项目: ./LEARNINGS.md

下次开发前可以先看看，避免重复踩坑。
```

---

## 自动提取规则

如果用户不想手动写，从会话自动提取：

| 类型 | 识别方式 |
|-----|---------|
| 踩的坑 | 遇到 error、失败、重试的地方 |
| 学到的 | 解决问题的方法 |
| 最佳实践 | 成功的模式、值得复用的做法 |

---

## 示例

### 示例 1：用户手动输入

```
用户: /learn
Claude: 这次开发学到了什么？

用户:
- 坑：GitHub API 设置分支保护要用 JSON 格式
- 学到：gh pr merge --squash 可以自动删分支

Claude: ✅ 已记录到 LEARNINGS.md
```

### 示例 2：自动提取

```
用户: /learn 跳过

Claude: 我从这次会话提取了：

踩的坑：
- PR base 分支设错了，应该是 feature 不是 main

学到的：
- GitHub 分支保护配置命令

确认记录？

用户: 可以

Claude: ✅ 已记录
```

---

## 与 /finish 集成

`/finish` 完成后自动问：

```
✅ PR 已创建

要记录这次开发的经验吗？
1. 记录（推荐）
2. 跳过
```

选 1 → 执行 /learn
选 2 → 直接结束

---

## 文件位置

| 文件 | 路径 | 内容 |
|-----|------|------|
| 全局经验 | ~/.claude/LEARNINGS.md | 通用技巧、工具用法 |
| 项目经验 | ./LEARNINGS.md | 项目特有的坑和技巧 |
