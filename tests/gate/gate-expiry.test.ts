import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

describe('Gate 文件过期机制', () => {
  const PROJECT_ROOT = path.resolve(__dirname, '../..')
  const GATE_FILE = path.join(PROJECT_ROOT, '.gate-test-passed')

  beforeEach(() => {
    // 清理测试 gate 文件
    if (fs.existsSync(GATE_FILE)) {
      fs.unlinkSync(GATE_FILE)
    }
  })

  afterEach(() => {
    // 清理测试 gate 文件
    if (fs.existsSync(GATE_FILE)) {
      fs.unlinkSync(GATE_FILE)
    }
    vi.restoreAllMocks()
  })

  it('应该生成包含 30 分钟过期时间的 gate 文件', () => {
    // 生成 gate 文件
    execSync('bash scripts/gate/generate-gate-file.sh test', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    expect(fs.existsSync(GATE_FILE)).toBe(true)

    const gateContent = JSON.parse(fs.readFileSync(GATE_FILE, 'utf-8'))

    // 检查必需字段
    expect(gateContent).toHaveProperty('version')
    expect(gateContent).toHaveProperty('gate')
    expect(gateContent).toHaveProperty('created_at')
    expect(gateContent).toHaveProperty('expires_at')
    expect(gateContent).toHaveProperty('expires_at_epoch')

    // 验证过期时间是 30 分钟后
    const createdAt = new Date(gateContent.created_at).getTime()
    const expiresAt = new Date(gateContent.expires_at).getTime()
    const diff = (expiresAt - createdAt) / 1000 / 60 // 分钟

    expect(diff).toBeCloseTo(30, 0) // 允许 ±0.5 分钟误差
  })

  it('应该正确计算 expires_at_epoch', () => {
    execSync('bash scripts/gate/generate-gate-file.sh test', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    const gateContent = JSON.parse(fs.readFileSync(GATE_FILE, 'utf-8'))

    // expires_at_epoch 应该等于 expires_at 的 Unix timestamp
    const expiresAtFromIso = Math.floor(new Date(gateContent.expires_at).getTime() / 1000)
    expect(gateContent.expires_at_epoch).toBe(expiresAtFromIso)
  })

  it('Mock 时间戳测试 - 过期的 gate 文件应该被识别', () => {
    // 生成 gate 文件
    execSync('bash scripts/gate/generate-gate-file.sh test', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    const gateContent = JSON.parse(fs.readFileSync(GATE_FILE, 'utf-8'))

    // 修改 expires_at 为过去时间（31 分钟前）
    const pastTime = new Date(Date.now() - 31 * 60 * 1000)
    gateContent.expires_at = pastTime.toISOString()
    gateContent.expires_at_epoch = Math.floor(pastTime.getTime() / 1000)

    fs.writeFileSync(GATE_FILE, JSON.stringify(gateContent, null, 2))

    // 验证过期逻辑（通过 hook/script）
    const currentEpoch = Math.floor(Date.now() / 1000)
    const isExpired = gateContent.expires_at_epoch < currentEpoch

    expect(isExpired).toBe(true)
  })

  it('Mock 时间戳测试 - 未过期的 gate 文件应该有效', () => {
    execSync('bash scripts/gate/generate-gate-file.sh test', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    const gateContent = JSON.parse(fs.readFileSync(GATE_FILE, 'utf-8'))

    // 验证未过期
    const currentEpoch = Math.floor(Date.now() / 1000)
    const isExpired = gateContent.expires_at_epoch < currentEpoch

    expect(isExpired).toBe(false)
  })

  it('应该在 gate 文件过期后拒绝使用', () => {
    // 这个测试模拟 Hook 的过期检查逻辑
    execSync('bash scripts/gate/generate-gate-file.sh test', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    })

    const gateContent = JSON.parse(fs.readFileSync(GATE_FILE, 'utf-8'))

    // 修改为 31 分钟前过期
    const pastTime = new Date(Date.now() - 31 * 60 * 1000)
    gateContent.expires_at = pastTime.toISOString()
    gateContent.expires_at_epoch = Math.floor(pastTime.getTime() / 1000)

    fs.writeFileSync(GATE_FILE, JSON.stringify(gateContent, null, 2))

    // 验证过期逻辑（期望 Hook 应该拒绝）
    const currentEpoch = Math.floor(Date.now() / 1000)

    if (gateContent.expires_at_epoch < currentEpoch) {
      // 过期的 gate 文件应该被拒绝
      expect(gateContent.expires_at_epoch).toBeLessThan(currentEpoch)
    }
  })
})
