# Step 2: PRD

> 生成产品需求文档，等用户确认

**完成后设置状态**：
```bash
git config branch."$BRANCH_NAME".step 2
```

---

## PRD 模板

```markdown
## PRD - <功能名>

**需求来源**: <用户原话>
**功能描述**: <我理解的功能>
**涉及文件**: <需要创建/修改的文件>
```

---

## 示例

```markdown
## PRD - 用户登录功能

**需求来源**: "加一个登录页面"
**功能描述**:
- 用户名/密码登录表单
- 登录成功跳转首页
- 登录失败显示错误

**涉及文件**:
- src/pages/Login.tsx（新建）
- src/api/auth.ts（新建）
- src/routes.tsx（修改）
```

---

## 注意事项

- PRD 要简洁，不要写太多
- 用户确认后才能继续
- 如果用户有修改意见，更新 PRD 后再确认

---

## 用户确认后

```bash
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
git config branch."$BRANCH_NAME".step 2
echo "✅ Step 2 完成 (PRD 确认)"
```
