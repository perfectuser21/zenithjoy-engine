/**
 * tests/ci/evidence.test.ts
 *
 * P0-1 测试: Evidence 生成和验证逻辑
 *
 * 测试覆盖:
 * 1. CI 各步骤输出 check 结果 JSON 到 ci/out/checks/
 * 2. generate-evidence.sh 汇总计算 qa_gate_passed（不再硬编码）
 * 3. evidence-gate.sh 验证 required checks 全存在且 ok
 * 4. evidence-gate.sh 验证文件 hash 防篡改
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const PROJECT_ROOT = process.cwd()
const CHECKS_DIR = path.join(PROJECT_ROOT, 'ci/out/checks')
const WRITE_CHECK_SCRIPT = path.join(PROJECT_ROOT, 'ci/scripts/write-check-result.sh')
const GENERATE_EVIDENCE_SCRIPT = path.join(PROJECT_ROOT, 'ci/scripts/generate-evidence.sh')
const EVIDENCE_GATE_SCRIPT = path.join(PROJECT_ROOT, 'ci/scripts/evidence-gate.sh')

// 辅助函数：清理测试产物
function cleanup() {
  try {
    execSync(`rm -rf ${CHECKS_DIR}`, { encoding: 'utf-8' })
    // 删除 evidence 文件
    const files = fs.readdirSync(PROJECT_ROOT).filter(f => f.startsWith('.quality-evidence.') && f.endsWith('.json'))
    for (const file of files) {
      fs.unlinkSync(path.join(PROJECT_ROOT, file))
    }
  } catch {
    // 忽略
  }
}

// 辅助函数：执行脚本并返回结果
function runScript(script: string, args: string[] = []): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`bash ${script} ${args.join(' ')}`, { encoding: 'utf-8', cwd: PROJECT_ROOT })
    return { stdout, exitCode: 0 }
  } catch (e: any) {
    return { stdout: e.stdout || '', exitCode: e.status || 1 }
  }
}

describe('ci/scripts/write-check-result.sh', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it('should create check JSON file with correct structure', () => {
    // 使用引号包裹带空格的参数
    const result = runScript(WRITE_CHECK_SCRIPT, ['test-check', 'true', '0', '"npm run test"', '"All tests passed"'])
    expect(result.exitCode).toBe(0)

    const checkFile = path.join(CHECKS_DIR, 'test-check.json')
    expect(fs.existsSync(checkFile)).toBe(true)

    const content = JSON.parse(fs.readFileSync(checkFile, 'utf-8'))
    expect(content).toHaveProperty('name', 'test-check')
    expect(content).toHaveProperty('ok', true)
    expect(content).toHaveProperty('exit_code', 0)
    expect(content).toHaveProperty('timestamp')
    expect(content).toHaveProperty('details')
    expect(content.details).toHaveProperty('command', 'npm run test')
    expect(content.details).toHaveProperty('summary', 'All tests passed')
  })

  it('should handle failed check correctly', () => {
    const result = runScript(WRITE_CHECK_SCRIPT, ['failed-check', 'false', '1', '"npm run build"', '"Build failed"'])
    expect(result.exitCode).toBe(0)

    const checkFile = path.join(CHECKS_DIR, 'failed-check.json')
    const content = JSON.parse(fs.readFileSync(checkFile, 'utf-8'))
    expect(content.ok).toBe(false)
    expect(content.exit_code).toBe(1)
  })
})

describe('ci/scripts/generate-evidence.sh', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it('should fail when checks directory does not exist', () => {
    const result = runScript(GENERATE_EVIDENCE_SCRIPT)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('checks 目录不存在')
  })

  it('should fail when required checks are missing', () => {
    // 只创建部分 checks
    runScript(WRITE_CHECK_SCRIPT, ['typecheck', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['test', 'true', '0'])
    // 缺少 build 和 shell-check

    const result = runScript(GENERATE_EVIDENCE_SCRIPT)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('缺少必需 check')
  })

  it('should generate evidence with qa_gate_passed=true when all checks pass', () => {
    cleanup()

    // 创建所有必需的 checks
    runScript(WRITE_CHECK_SCRIPT, ['typecheck', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['test', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['build', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['shell-check', 'true', '0'])

    const result = runScript(GENERATE_EVIDENCE_SCRIPT)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Evidence 生成成功')
    expect(result.stdout).toContain('qa_gate_passed: true')
    expect(result.stdout).toContain('audit_decision: PASS')
  })

  it('should generate evidence with qa_gate_passed=false when any check fails', () => {
    cleanup()

    // 创建 checks，其中一个失败
    runScript(WRITE_CHECK_SCRIPT, ['typecheck', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['test', 'false', '1'])  // 失败
    runScript(WRITE_CHECK_SCRIPT, ['build', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['shell-check', 'true', '0'])

    const result = runScript(GENERATE_EVIDENCE_SCRIPT)
    expect(result.exitCode).toBe(0)  // 生成成功，但内容显示失败
    expect(result.stdout).toContain('Evidence 生成完成（有失败）')
    expect(result.stdout).toContain('qa_gate_passed: false')
    expect(result.stdout).toContain('audit_decision: FAIL')
  })

  it('should include file_hash for tamper detection', () => {
    cleanup()

    runScript(WRITE_CHECK_SCRIPT, ['typecheck', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['test', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['build', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['shell-check', 'true', '0'])

    runScript(GENERATE_EVIDENCE_SCRIPT)

    // 找到生成的 evidence 文件
    const evidenceFiles = fs.readdirSync(PROJECT_ROOT).filter(f => f.startsWith('.quality-evidence.') && f.endsWith('.json'))
    expect(evidenceFiles.length).toBeGreaterThan(0)

    const evidence = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, evidenceFiles[0]), 'utf-8'))
    expect(evidence).toHaveProperty('checks')
    expect(evidence.checks.length).toBe(4)

    for (const check of evidence.checks) {
      expect(check).toHaveProperty('file_hash')
      expect(check.file_hash).toMatch(/^[a-f0-9]{64}$/)  // SHA256 hash
    }
  })
})

describe('ci/scripts/evidence-gate.sh', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  it('should fail when evidence file does not exist', () => {
    const result = runScript(EVIDENCE_GATE_SCRIPT)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('Evidence 文件不存在')
  })

  it('should pass when all checks are valid', () => {
    cleanup()

    // 创建所有 checks 并生成 evidence
    runScript(WRITE_CHECK_SCRIPT, ['typecheck', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['test', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['build', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['shell-check', 'true', '0'])
    runScript(GENERATE_EVIDENCE_SCRIPT)

    const result = runScript(EVIDENCE_GATE_SCRIPT)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Evidence Gate 通过')
  })

  it('should fail when check file is tampered', () => {
    cleanup()

    // 创建 checks 并生成 evidence
    runScript(WRITE_CHECK_SCRIPT, ['typecheck', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['test', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['build', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['shell-check', 'true', '0'])
    runScript(GENERATE_EVIDENCE_SCRIPT)

    // 篡改 check 文件
    const checkFile = path.join(CHECKS_DIR, 'typecheck.json')
    fs.writeFileSync(checkFile, JSON.stringify({ name: 'typecheck', ok: false, exit_code: 1 }))

    const result = runScript(EVIDENCE_GATE_SCRIPT)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('check 文件被篡改')
  })

  it('should fail when a check has ok=false', () => {
    cleanup()

    // 创建 checks（一个失败）并生成 evidence
    runScript(WRITE_CHECK_SCRIPT, ['typecheck', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['test', 'false', '1'])
    runScript(WRITE_CHECK_SCRIPT, ['build', 'true', '0'])
    runScript(WRITE_CHECK_SCRIPT, ['shell-check', 'true', '0'])
    runScript(GENERATE_EVIDENCE_SCRIPT)

    const result = runScript(EVIDENCE_GATE_SCRIPT)
    expect(result.exitCode).toBe(1)
    // evidence-gate 验证 checks 数组中每个 check 的 ok 状态
    expect(result.stdout).toContain('❌')  // 某个 check 失败
  })

  it('should verify version is 2.0.0', () => {
    cleanup()

    // 创建伪造的 v1 evidence
    const headSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    const fakeEvidence = {
      version: '1.0.0',
      sha: headSha,
      ci_run_id: 'test',
      timestamp: new Date().toISOString(),
      qa_gate_passed: true,
      audit_decision: 'PASS',
      checks: []
    }
    fs.writeFileSync(path.join(PROJECT_ROOT, `.quality-evidence.${headSha}.json`), JSON.stringify(fakeEvidence))

    const result = runScript(EVIDENCE_GATE_SCRIPT)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('版本不兼容')
  })
})
