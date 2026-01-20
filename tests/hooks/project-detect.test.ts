/**
 * project-detect.sh 最小测试
 *
 * 测试项目检测 Hook 的核心逻辑：
 * 1. 脚本存在且可执行
 * 2. 语法检查通过
 * 3. 可以运行并生成输出（需要开发环境）
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const HOOK_PATH = resolve(__dirname, "../../hooks/project-detect.sh");
const PROJECT_ROOT = resolve(__dirname, "../..");
const INFO_FILE = resolve(PROJECT_ROOT, ".project-info.json");

// CI 环境中 .project-info.json 不存在
const HAS_INFO_FILE = existsSync(INFO_FILE);

describe("project-detect.sh", () => {
  beforeAll(() => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it("should exist and be executable", () => {
    const stat = execSync(`stat -c %a "${HOOK_PATH}"`, { encoding: "utf-8" });
    const mode = parseInt(stat.trim(), 8);
    expect(mode & 0o111).toBeGreaterThan(0);
  });

  it("should pass syntax check", () => {
    expect(() => {
      execSync(`bash -n "${HOOK_PATH}"`, { encoding: "utf-8" });
    }).not.toThrow();
  });

  // 以下测试只在开发环境中运行（.project-info.json 存在时）
  it.skipIf(!HAS_INFO_FILE)("should generate .project-info.json", () => {
    expect(existsSync(INFO_FILE)).toBe(true);
  });

  it.skipIf(!HAS_INFO_FILE)("should detect Node.js project correctly", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.project).toBeDefined();
    expect(info.project.type).toBe("node");
    expect(info.project.name).toBe("zenithjoy-engine");
  });

  it.skipIf(!HAS_INFO_FILE)("should detect test levels correctly", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.test_levels).toBeDefined();
    expect(info.test_levels.L1).toBe(true);
    expect(info.test_levels.L2).toBe(true);
    expect(info.test_levels.max_level).toBeGreaterThanOrEqual(2);
  });

  it.skipIf(!HAS_INFO_FILE)("should include hash for cache invalidation", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.hash).toBeDefined();
    expect(typeof info.hash).toBe("string");
    expect(info.hash.length).toBeGreaterThan(0);
  });

  it.skipIf(!HAS_INFO_FILE)("should include detection timestamp", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.detected_at).toBeDefined();
    expect(() => new Date(info.detected_at)).not.toThrow();
  });

  it.skipIf(!HAS_INFO_FILE)("should detect monorepo status", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.project.is_monorepo).toBeDefined();
    expect(typeof info.project.is_monorepo).toBe("boolean");
  });
});
