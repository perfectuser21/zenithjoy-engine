# Step 3: DoD

> 定义验收标准（Definition of Done）+ 测试层级确认

**完成后设置状态**（这步完成后才能写代码）：
```bash
git config branch."$BRANCH_NAME".step 3
```

---

## 3.1 测试层级确认

根据任务性质，确定这次**最低要跑到哪一层**。

### 任务 → 层级映射

| 任务类型 | 最低层级 | 说明 |
|----------|----------|------|
| 文档修改 | L1 | 只需 lint |
| 工具函数 | L2 | 需要单元测试 |
| API 接口 | L3 | 需要集成测试 |
| 用户界面 | L4 | 需要 E2E 测试 |
| 性能优化 | L5 | 需要 benchmark |
| 安全相关 | L6 | 需要安全审计 |

### 检查是否超出项目能力

```bash
# 获取项目能力上限
PROJECT_MAX=$(jq -r '.max_level // 0' .test-level.json 2>/dev/null || echo "0")

# 本次任务需要的层级（根据任务类型填写）
TASK_MIN=<填写数字 1-6>

echo "项目能力上限: L$PROJECT_MAX"
echo "任务需要层级: L$TASK_MIN"

if [[ $TASK_MIN -gt $PROJECT_MAX ]]; then
    echo ""
    echo "⚠️  任务需要 L$TASK_MIN，但项目只支持到 L$PROJECT_MAX"
    echo "   需要先升级项目测试能力"
fi
```

### 如果需要升级

当任务需要的层级 > 项目能力时，**先升级项目能力**：

| 要升级到 | 需要添加 |
|----------|----------|
| L3 | API 测试框架 + test:integration 脚本 |
| L4 | playwright/cypress + e2e/ 目录 |
| L5 | benchmark 脚本 + benchmark/ 目录 |
| L6 | npm audit 或 snyk 配置 |

升级任务作为**前置任务**先完成。

---

## 3.2 DoD 模板

```markdown
## DoD - 验收标准

### 测试层级
- 项目能力: L<X>
- 任务需要: L<Y>
- 实际执行: L1 ~ L<max(X,Y)>

### 自动测试
- [ ] TEST: <测试命令/断言 1>
- [ ] TEST: <测试命令/断言 2>

### 人工确认
- [ ] CHECK: <需要用户确认的点>
```

---

## 3.3 示例

```markdown
## DoD - 用户登录功能

### 测试层级
- 项目能力: L4
- 任务需要: L4 (涉及用户界面)
- 实际执行: L1 + L2 + L3 + L4

### 自动测试
- [ ] TEST: L2 - 登录函数单元测试
- [ ] TEST: L3 - 登录 API 集成测试
- [ ] TEST: L4 - 登录流程 E2E 测试

### 人工确认
- [ ] CHECK: 登录页面样式符合设计
```

---

## 3.4 PRD + DoD 确认后

**用户确认后，设置步骤状态**：

```bash
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
git config branch."$BRANCH_NAME".step 3
echo "✅ Step 3 完成 (DoD 确认)，可以开始写代码"
```

**Hook 检查**：step >= 3 才能写代码。
