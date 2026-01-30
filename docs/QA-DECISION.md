# QA Decision: CI 安全漏洞修复

Decision: PASS
Priority: P0
RepoType: Engine

## 变更范围

| 文件 | 类型 | 影响 |
|------|------|------|
| .github/workflows/auto-merge.yml | YAML | 移除 check_suite 触发 |
| .github/workflows/ci.yml | YAML | 修复 ci-passed 条件 + 移除 continue-on-error |

## 测试决策

### 测试级别: L1 (配置验证)

**理由**:
- 这是 YAML 配置修改，不是代码逻辑
- 主要验证方式是 CI 自身运行
- 无需新增单元测试

Tests:
  - dod_item: "auto-merge 不再有 check_suite"
    method: manual
    location: .github/workflows/auto-merge.yml
    verification: grep 检查无 check_suite

  - dod_item: "ci-passed 条件正确"
    method: manual
    location: .github/workflows/ci.yml
    verification: CI 实际运行验证

  - dod_item: "ai-review 无 continue-on-error"
    method: manual
    location: .github/workflows/ci.yml
    verification: grep 检查

RCI:
  new: []
  update: []

Reason: 纯配置修改，CI 自测即验证。
