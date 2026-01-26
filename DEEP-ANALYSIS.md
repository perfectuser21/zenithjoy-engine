# 深度分析：当前系统问题与优化方案

生成时间: 2026-01-26 22:46

## 发现的问题

### 🔴 严重问题

#### 1. PRD/DoD 残留在 develop 分支

**现象**：
```bash
$ git ls-tree HEAD | grep -E "\.(prd|dod)\.md$"
100644 blob 631dca3d1d45466332b05d801f5247ac53631d2e	.dod.md
100644 blob 4fa3c2a49975686174495680af1bf7ff9eed3c79	.prd.md
```

**根本原因**：
- PR #291 squash merge 时把功能分支的 `.prd.md` 和 `.dod.md` 带进了 develop
- 这些文件应该只存在于 `cp-*` 或 `feature/*` 分支，不应该在 develop/main

**影响**：
1. 每次从 develop 创建新分支时，会带上旧的 PRD/DoD
2. 导致"老能检测到之前的PRD/DoD"问题
3. 污染了 develop 分支的干净状态

**解决方案**：
```bash
# 立即修复：从 develop 删除这些文件
git rm .prd.md .dod.md
git commit -m "chore: remove PRD/DoD from develop (should only exist in feature branches)"
git push origin develop
```

**预防措施**：
在 `.github/workflows/ci.yml` 添加检查：
```yaml
- name: Check for PRD/DoD in develop/main
  if: github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main'
  run: |
    if git ls-files | grep -E "^\.(prd|dod)\.md$"; then
      echo "❌ PRD/DoD 文件不应存在于 develop/main 分支"
      exit 1
    fi
```

---

#### 2. PR 阶段仍有停顿点

**现象**：用户报告"PR阶段又停了一次"

**可能原因**：
1. **Skill 调用后停顿**：`/qa` 或 `/audit` 返回后 AI 输出总结而不是立即继续
2. **Stop Hook 误判**：某些边缘情况下 Stop Hook 返回 exit 0 而不是 exit 2
3. **Ralph Loop 检测失败**：AI 输出格式不对，导致 Ralph Loop 没检测到 completion promise

**需要检查的点**：
- [ ] `/qa` skill 的 `⚡ 完成后行为` 是否真的被遵守
- [ ] `/audit` skill 是否也有类似规则
- [ ] Stop Hook 的 p0 阶段检查是否有漏洞
- [ ] AI 是否在输出 `<promise>` 前插入了 thinking block

---

### 🟡 中等问题

#### 3. 常见错误重复出现

**现象**：每次 PR 都会遇到：
1. SHA 不匹配
2. 派生视图未更新
3. Priority 检测错误

**根本原因**：
- **SHA 不匹配**：修改代码 → commit → 跑测试 → 生成 evidence → 又一个 commit → SHA 对不上
- **派生视图**：更新 `feature-registry.yml` 后忘记运行 `generate-path-views.sh`
- **Priority 检测**：commit message 或 PR title 中包含 `p0`/`p1` 等关键字被误识别

**优化方案**：

##### 3.1 SHA 不匹配优化

**方案 A：单 commit 模式**
```bash
# Step 7 (Quality) 改为：
npm run qa:gate
git add .quality-evidence.json .quality-gate-passed .history/
# 不 commit，继续到 Step 8

# Step 8 (PR) 改为：
git add .  # 包含所有变更 + evidence
git commit -m "..."  # 一次性提交
git push
```

**优点**：
- 只有一个 commit，SHA 永远匹配
- 更符合"证据和代码在同一 commit"的语义

**缺点**：
- 如果质检失败需要修代码，整个 commit 会很乱

---

**方案 B：自动 amend**
```bash
# Step 7 生成 evidence 后：
git add .quality-evidence.json .quality-gate-passed
git commit --amend --no-edit
git push --force-with-lease
```

**优点**：
- 保持"证据和代码在同一 commit"
- 不会产生额外的 evidence commit

**缺点**：
- 需要 force push（可能触发 Hook）
- 如果已经 push 了会很麻烦

---

**方案 C：自动 rebase（推荐）**
```bash
# Step 8 PR 前：
bash scripts/squash-evidence.sh  # 自动把最后的 evidence commit 合并到前一个
```

`scripts/squash-evidence.sh`:
```bash
#!/usr/bin/env bash
# 自动把 evidence commit 合并到代码 commit

LAST_MSG=$(git log -1 --pretty=%s)
if [[ "$LAST_MSG" == "chore: update quality evidence"* ]]; then
  echo "检测到 evidence commit，自动合并..."
  git reset --soft HEAD~1
  git commit --amend --no-edit
  echo "✅ 已合并"
else
  echo "不是 evidence commit，跳过"
fi
```

**优点**：
- 自动化，不需要手动操作
- 保持干净的 commit 历史
- 不需要 force push（在 push 前操作）

---

##### 3.2 派生视图优化

**方案：Pre-commit Hook 自动生成**

在 `hooks/branch-protect.sh` 添加：
```bash
# 如果 feature-registry.yml 变更，自动生成派生视图
if git diff --cached --name-only | grep -q "features/feature-registry.yml"; then
  echo "检测到 feature-registry.yml 变更，自动生成派生视图..."
  bash scripts/generate-path-views.sh
  git add docs/paths/
  echo "✅ 派生视图已更新并暂存"
fi
```

**优点**：
- 完全自动化，不会忘记
- 在 commit 前就完成，不会产生额外 commit

---

##### 3.3 Priority 检测优化

**方案：明确的 Priority 标记**

修改 `scripts/devgate/detect-priority.cjs`：
```javascript
// 只从以下位置检测 Priority：
// 1. docs/QA-DECISION.md 的 Priority 字段（最高优先级）
// 2. PR labels
// 3. 环境变量 PR_PRIORITY

// 不再从 commit message 和 PR title 检测（容易误识别）
```

在 Step 4 (DoD) 生成 QA-DECISION.md 后：
```bash
# 自动设置 git config
PRIORITY=$(grep "^Priority:" docs/QA-DECISION.md | awk '{print $2}')
git config branch.$(git branch --show-current).priority "$PRIORITY"
```

---

## 优化后的流程

### p0 阶段（发 PR）

```
Step 1-3: PRD → Branch → DoD
Step 4: QA Decision
  → 生成 docs/QA-DECISION.md
  → git config 记录 Priority
Step 5-6: Code + Test
Step 7: Quality
  → npm run qa:gate（生成 evidence）
  → 不 commit（留到 Step 8）
Step 8: PR
  → git add . （包含代码 + evidence）
  → git commit -m "..." （单 commit）
  → git push
  → gh pr create
  → 结束
```

### p1 阶段（修 CI）

```
while true:
  检查 CI 状态
  case:
    failure →
      修复代码
      npm run qa:gate
      git add .
      git commit -m "fix: ..."
      git push
      continue （不退出！）
    pending →
      sleep 30
      continue
    success →
      gh pr merge
      break
```

---

## 需要立即做的

### 高优先级

1. **删除 develop 上的 PRD/DoD**
   ```bash
   git rm .prd.md .dod.md
   git commit -m "chore: remove PRD/DoD from develop"
   git push origin develop
   ```

2. **添加 CI 检查防止再次发生**
   - 在 `.github/workflows/ci.yml` 添加检查

3. **实现 squash-evidence.sh**
   - 自动合并 evidence commit
   - 在 Step 8 (PR) 前调用

### 中优先级

4. **派生视图自动生成**
   - 在 `hooks/branch-protect.sh` 添加自动生成逻辑

5. **Priority 检测优化**
   - 修改 `detect-priority.cjs`
   - 只从 QA-DECISION.md 读取

### 低优先级

6. **深度测试 p1 循环**
   - 人工触发 CI 失败
   - 验证 AI 是否真的持续运行

7. **Ralph Loop 完成信号优化**
   - 确保 AI 不在 `<promise>` 前插入 thinking

---

## 总结

**核心问题**：
1. ❌ PRD/DoD 污染了 develop 分支
2. ❌ SHA 不匹配反复出现（需要流程优化）
3. ❌ 派生视图需要手动生成（应该自动化）

**解决路径**：
1. 立即修复 develop 分支
2. 实现自动化脚本（squash-evidence, auto-generate-views）
3. 优化 Priority 检测逻辑
4. 添加 CI 检查防护

**预期效果**：
- ✅ 每次 PR 只需 1 个 commit（代码 + evidence）
- ✅ 派生视图自动更新，不会忘记
- ✅ Priority 明确，不会误识别
- ✅ p1 循环真正持续运行到合并
