# ZenithJoy Engine – Trust Layer 修复与重建 PRD

**版本**: v1.0
**作者**: ChatGPT (AI-Factory Planner)
**目标仓库**: zenithjoy-engine
**目标分支**: feature/trust-layer

---

## 1. 背景 (Background)

当前系统存在严重的"信任破裂"：
- Hook / CI 环境不一致 → 本地通过 CI 失败；本地失败 CI 通过
- Hook 可绕过 → 使用 gh api 可直接绕过本地 PR Gate
- **Branch Protection 可绕过** → Push restrictions 未启用，可直接 push
- 测试结果不可追踪 → Hook 超时、不输出错误、不产生日志
- 发布不可控 → deploy.sh 可在 develop 直接污染全局
- 分支保护与 Gate 不一致 → 保护的是 develop/main，但 Gate 并没有做到全面覆盖
- 回归测试期望值过时 → 导致 CI 不稳定
- 用户无法确保系统行为可复现
- 系统无"证据层（evidence layer）"记录关键操作

这些问题导致：
- 系统 **不可预测** (unpredictable)
- 流水线 **不可审计** (unauditable)
- 结果 **不可复现** (unreproducible)
- 发布 **不可信** (unreliable)

**总结**：系统已经到达"临界点"，必须进行一次底层重建。

---

## 2. 目标 (Objectives)

### O1. 修复现存混乱状态，恢复基础稳定性

包括但不限于：
- 清理 develop/main 的 PR 队列
- 修复所有回归测试
- 修复 hook 输出缺失与 timeout
- 修复测试环境污染
- 修复 deploy 可误触
- 修复当前目录结构导致的冲突

### O2. 建立一套"不可绕过的全球 Gate"体系

- Hook 不再作为唯一"阻断点"
- 真正的阻断迁移到 GitHub Branch Protection（服务器侧）
- Hook 改为"前置检查 + 证据收集"
- 所有关键命令统一入口点（统一 CLI）

### O3. 建立可复现、可验证、可审计的测试体系

- 统一测试命令
- 统一 reporter
- 所有失败都产出可下载的证据（日志、屏幕输出、diff）
- npm test 环境本地/CI/Hook 完全一致

### O4. 重建发布通道，使其"不可出错"

- deploy.sh 必须从 main
- 必须 clean
- 必须 align upstream
- 必须写入 DEPLOY-STAMP
- 必须产出发布证据（manifest）

### O5. 形成 ZenithJoy Engine "信任层架构"

最终交付一个 Alex 可以完全信任的系统：
**Predictable, Repeatable, Verifiable, Auditable.**

---

## 3. 范围 (Scope)

### 3.1 包含 (In Scope)

- Hook 修复
- CI 修复
- 测试修复
- 发布链修复
- 统一入口 CLI 添加
- 证据层（Evidence Layer）添加
- Branch Protection 调整

### 3.2 不包含 (Out of Scope)

- 功能新增
- 新业务逻辑
- AI-Factory 的上层规划（等底线稳定后再做）

---

## 4. 方案 (Solution Design)

### 4.1 Phase 1: Stop the Bleeding (救火修复)

#### P1-1: 修复当前仓库状态

- 关闭错误的 PR
- 删除临时分支
- stash 或 patch 当前未提交改动
- develop/main 同步和回归到稳定状态

#### P1-2: 修复回归测试（所有 snapshot + expected）

- 修复 H3-001
- 修复 Hook 环境造成的不一致
- 修复 L2/L3 不稳定案例
- 全量跑通并锁定期望值

#### P1-3: 统一测试入口

新增一个 CLI：

```bash
npm run gate:test
```

对应执行：

```bash
jest --runInBand --ci --reporters=default --reporters=jest-junit
```

Hook / CI 都只能调用这一个。

#### P1-4: 修复 Hook 超时与输出丢失

Hook 调整为：

```bash
npm run gate:test | tee artifacts/gate/test.log
```

如果失败：
- 显示失败测试用例名
- 显示最后 200 行日志
- 退出码 = 1

#### P1-5: 彻底隔离测试环境

- 所有测试必须使用独立临时目录
- PROJECT_ROOT 不能被污染
- Jest Global Setup/Teardown 清理残留目录

---

### 4.2 Phase 2: Build the Trust Layer (重建底线)

#### P2-1: 不可绕过的 Gate（服务器侧）

GitHub → Branch Protection：
- require status checks
- block admin bypass
- **restrict push** (关键)
- require PR reviews（可选）

**重点**：AI 再也不能通过任何方式绕过 Gate 合并。

#### P2-2: 统一 Hook → 证据层

Hook 不再作为阻断点，而是：
- 运行 gate:test
- 收集证据（logs/artifacts）
- 把证据写入 .evidence/
- 将输出发送到 PR 评论（未来可扩展）

#### P2-3: 发布链重建

deploy.sh 顶部加入硬门禁：

```bash
if branch != "main" -> exit 2
if tree dirty -> exit 3
if local != remote -> exit 4
```

发布证据写入：

```bash
~/.claude/DEPLOY-STAMP
```

记录：
- time
- branch
- commit
- manifest

#### P2-4: PR Gate v3

- 由统一 CLI 触发
- 所有错误都有证据
- 所有环境一致
- 不可绕过的 required checks
- 保证 merge 必定可靠

---

## 5. 验收标准 (DoD + Acceptance)

### DoD (Definition of Done)

1. develop/main 均处于 clean + green 状态
2. 所有 Hook 的测试可复现、可下载日志
3. CI 与 Hook 环境完全一致
4. Gate v3 生效并不可绕过
5. deploy 可控且不可误触
6. 每次发布都自动产出 evidence
7. 所有 L1/L2 回归用例全部通过
8. 任何命令失败都有 evidence log

### Acceptance (最终你要看到的)

- "我本地跑 3 次，结果一样"
- "Hook 和 CI 报一样的错误"
- "PR merge 前我能看到完整证据"
- "deploy 永远不可能误触 develop"
- "release 可追踪、可审计、可回滚"
- "再也没有'独立通过，Hook 里失败'这种烂事"
- "整个 pipeline 是 deterministic 的"
- "我从此愿意信任这个系统"

---

## 6. 测试计划 (Test Plan)

### L1: 环境一致性测试

- Node 版本一致
- Jest 配置一致
- 项目 cwd 一致

### L2: Hook 环境一致性

- mock PR gate
- verify test artifacts exist
- verify logs contain failures

### L3: CI 环境一致性

- run full pipeline twice
- output must match

### L4: Deploy 门禁测试

- 在 develop 跑 deploy → 必失败
- 在 main dirty tree 跑 → 必失败
- 在 main outdated 跑 → 必失败
- 在 main aligned 跑 → 成功

### L5: Evidence 体系测试

- 每次 gate/test 都有 artifacts
- 每次 deploy 都有 stamp

### L6: End-to-End 全链路

- PR → Gate → CI → Merge → Deploy
- 全链路成功且无不一致现象

---

## 7. 交付产物 (Outputs / Artifacts)

- PRD.md（本文件）
- Gate v3
- Unified test CLI (gate:test)
- hook-core/ 全部更新
- .evidence/ 框架
- deploy.sh 门禁 + stamp
- jest.config.js 环境统一
- 所有回归 snapshots 更新
- 测试污染修复
- 终态 develop/main 均 green

---

## 结束语

你现在要构建的不是一个"能跑的系统"，
你要构建的是一个 **"绝对可信的系统"**。

一个你可以放心把一整套 AI-Factory、Cloud-Code、n8n、Dashboard 全托付进去的系统。

这个 PRD 就是让你：

**从现在的"混乱态"，走向"可审计、可复现、可信赖"的基础层。**
