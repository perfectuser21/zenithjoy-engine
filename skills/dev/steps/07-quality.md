# Step 7: 三层质检

> 跑测试、看效果、对清单 — 用证据链证明

**前置条件**：step >= 6
**完成后设置状态**：
```bash
git config branch."$BRANCH_NAME".step 7
```

---

## 证据链设计

pr-gate-v2.sh 强制要求三个文件：

| 文件 | 作用 | 检查内容 |
|------|------|----------|
| `.dod.md` | DoD 验收清单 | 每项 [x] + Evidence 引用 |
| `.layer2-evidence.md` | 效果验证证据 | S* 截图 + C* curl |
| `./artifacts/screenshots/` | 截图文件 | S* 对应的文件 |

**提交 PR 前**，pr-gate-v2.sh 会自动验证：
1. Layer 1：跑 typecheck/test/build
2. Layer 2：检查截图文件存在、curl 有 HTTP_STATUS
3. Layer 3：检查 DoD 全勾、Evidence 引用有效

---

## 三层质检流程

```
Layer 1: 跑测试 → npm test 全绿
   ↓
Layer 2: 看效果 → 截图/curl 记录到 .layer2-evidence.md
   ↓
Layer 3: 对清单 → .dod.md 全勾 + Evidence 引用
```

---

## 7.1 跑测试 (Layer 1)

运行完整测试套件，必须全绿。

```bash
npm test
```

**人话解释**：
- **typecheck** (类型检查) - 检查代码有没有写错类型
- **lint** (代码风格) - 检查代码格式是否规范
- **test** (单元测试) - 检查功能是否正常

**结果判定**：
- ✅ 全绿 → 进入 Layer 2
- ❌ 有红 → 返回 Step 4 重新开始

---

## 7.2 看效果 (Layer 2)

根据改动类型，实际验证效果，**并记录到 `.layer2-evidence.md`**。

### 截图证据 (S*)

使用 Chrome DevTools MCP 截图：

```bash
# 1. 打开对应页面
mcp navigate_page <URL>

# 2. 截图保存
mcp take_screenshot  # 保存到 ./artifacts/screenshots/S1-xxx.png
```

**记录到 `.layer2-evidence.md`**：
```markdown
### S1: 登录成功页面
- 文件: `./artifacts/screenshots/S1-login-success.png`
- 说明: 页面显示"欢迎回来，用户名"
```

### API 证据 (C*)

使用 curl 验证并记录输出：

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "123"}'
```

**记录到 `.layer2-evidence.md`**：
```markdown
### C1: 登录 API 成功响应
\`\`\`bash
$ curl -X POST http://localhost:3000/api/login ...

HTTP_STATUS: 200

{"status": "ok", "token": "xxx"}
\`\`\`
```

**重要**：curl 输出必须包含 `HTTP_STATUS: xxx`，pr-gate 会检查。

### 工具/脚本改动

实际运行并截图或记录输出。

**结果判定**：
- ✅ 效果符合预期，证据已记录 → 进入 Layer 3
- ❌ 效果不对 → 返回 Step 4 重新开始

---

## 7.3 对清单 (Layer 3)

对照 DoD 清单，逐项确认，**并添加 Evidence 引用**。

### 创建 `.dod.md`

```markdown
# DoD 验收清单

- [x] **用户可以登录**
  - 验证方式：页面显示"登录成功"
  - Evidence: `S1`

- [x] **API 返回正确格式**
  - 验证方式：返回 JSON 包含 token 字段
  - Evidence: `C1`

- [x] **错误处理正常**
  - 验证方式：输入错误密码显示提示
  - Evidence: `S2`, `C2`
```

### 要求

| 检查项 | 说明 |
|--------|------|
| 全部 `[x]` | 所有验收项必须打勾 |
| Evidence 引用 | 每项必须有 `Evidence: \`Sx\`` 或 `Evidence: \`Cx\`` |
| 引用有效 | 引用的 ID 必须在 .layer2-evidence.md 中存在 |

**结果判定**：
- ✅ 必要项全部完成，Evidence 有效 → Step 7 完成
- ❌ 任何必要项未完成或引用无效 → 返回 Step 4 重新开始

---

## 完整文件示例

### `.layer2-evidence.md`

```markdown
# Layer 2 效果验证证据

## 截图证据

### S1: 登录成功页面
- 文件: `./artifacts/screenshots/S1-login-success.png`
- 说明: 显示"欢迎回来，张三"

### S2: 登录失败提示
- 文件: `./artifacts/screenshots/S2-login-error.png`
- 说明: 显示"密码错误，请重试"

## API 验证证据

### C1: 登录成功响应
\`\`\`bash
$ curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "correct"}'

HTTP_STATUS: 200

{"status": "ok", "token": "eyJhbGc..."}
\`\`\`

### C2: 登录失败响应
\`\`\`bash
$ curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "wrong"}'

HTTP_STATUS: 401

{"status": "error", "message": "密码错误"}
\`\`\`
```

### `.dod.md`

```markdown
# DoD 验收清单

- [x] **用户可以登录**
  - 验证方式：输入正确密码后跳转首页
  - Evidence: `S1`, `C1`

- [x] **错误处理正常**
  - 验证方式：输入错误密码显示提示
  - Evidence: `S2`, `C2`
```

---

## 结果处理

| 结果 | 动作 |
|------|------|
| ✅ 三层全过 + 证据完整 | 继续下一步 (Step 8 - PR) |
| ❌ 任何失败 | 返回 Step 4 重新开始（5→6→7 循环）|

---

## Hook 自动验证

提交 PR 时，pr-gate-v2.sh 会自动检查：

```
[Layer 1: 自动化测试]
  typecheck... ✅
  test... ✅
  build... ✅

[Layer 2: 效果验证]
  证据文件... ✅
  截图 S1... ✅
  截图 S2... ✅
  curl C1... ✅
  curl C2... ✅

[Layer 3: 需求验收]
  DoD 文件... ✅
  验收项... ✅ (2 项全部完成)
  Evidence 引用... ✅ (4 个引用有效)
```

**如果检查失败**：
- step 回退到 4
- 显示需要补充的内容
- 必须修复后再次提交 PR

---

## 质检原则

1. **证据驱动** - 不是"我说完成了"，而是"截图/curl 证明完成了"
2. **逐层验证** - 不能跳过任何一层
3. **失败即止** - 任何一层失败立即返回 Step 4 重新开始
4. **Hook 兜底** - pr-gate-v2.sh 强制检查，防止跳过
