#!/usr/bin/env node
/**
 * Skill Loader - 技能加载器
 *
 * 功能：
 * 1. 读取 skills-registry.json
 * 2. 解析 skill 路径
 * 3. 创建软链接到 ~/.claude/skills/
 *
 * 用途：
 * - 现在：管理 multi-repo 的 skills
 * - 将来：平滑迁移到 Monorepo
 */

const path = require('path');
const fs = require('fs');

class SkillLoader {
  constructor(registryPath) {
    this.engineDir = path.dirname(registryPath);
    this.registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    this.skillsDir = path.join(process.env.HOME, '.claude/skills');

    // 确保 ~/.claude/skills/ 目录存在
    if (!fs.existsSync(this.skillsDir)) {
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }
  }

  loadAll() {
    console.log('📦 Loading skills from registry...\n');

    const skills = this.registry.skills || {};
    let loaded = 0;
    let skipped = 0;

    Object.entries(skills).forEach(([id, config]) => {
      if (config.enabled !== false) {  // 默认 enabled
        try {
          this.loadSkill(id, config);
          loaded++;
        } catch (error) {
          console.error(`❌ Failed to load skill: ${id}`);
          console.error(`   Error: ${error.message}\n`);
        }
      } else {
        console.log(`⏭️  Skipped (disabled): ${id}\n`);
        skipped++;
      }
    });

    console.log(`\n✅ Summary: ${loaded} loaded, ${skipped} skipped`);
  }

  loadSkill(id, config) {
    const skillPath = this.resolveSkillPath(config);

    // 检查源路径是否存在
    if (!fs.existsSync(skillPath)) {
      throw new Error(`Source path does not exist: ${skillPath}`);
    }

    const targetPath = path.join(this.skillsDir, id);

    // 如果目标已存在
    if (fs.existsSync(targetPath)) {
      const stats = fs.lstatSync(targetPath);

      if (stats.isSymbolicLink()) {
        // 如果是软链接，检查是否指向正确位置
        const currentTarget = fs.readlinkSync(targetPath);
        if (currentTarget === skillPath) {
          console.log(`✓ ${id} (already linked)`);
          return;
        }

        // 指向不同位置，删除旧链接
        fs.unlinkSync(targetPath);
      } else {
        // 如果是目录/文件，备份
        const backupPath = `${targetPath}.backup.${Date.now()}`;
        fs.renameSync(targetPath, backupPath);
        console.log(`⚠️  Backed up existing: ${id} -> ${path.basename(backupPath)}`);
      }
    }

    // 创建软链接
    fs.symlinkSync(skillPath, targetPath);
    console.log(`✅ ${id}`);
    console.log(`   Type: ${config.type}`);
    console.log(`   Path: ${skillPath}`);
    console.log(`   Link: ${targetPath}\n`);
  }

  resolveSkillPath(config) {
    let basePath;

    if (config.type === 'workspace') {
      // workspace 类型：相对于 engine 目录
      basePath = path.resolve(this.engineDir, config.path);
    } else if (config.type === 'engine') {
      // engine 类型：相对于 engine 目录
      basePath = path.resolve(this.engineDir, config.path);
    } else if (config.type === 'absolute') {
      // absolute 类型：绝对路径
      basePath = config.path;
    } else {
      throw new Error(`Unknown skill type: ${config.type}`);
    }

    return basePath;
  }

  list() {
    console.log('📋 Registered Skills:\n');

    const skills = this.registry.skills || {};
    Object.entries(skills).forEach(([id, config]) => {
      const status = config.enabled !== false ? '✓' : '✗';
      console.log(`${status} ${id}`);
      console.log(`  Name: ${config.name || 'N/A'}`);
      console.log(`  Type: ${config.type}`);
      console.log(`  Description: ${config.description || 'N/A'}\n`);
    });
  }

  verify() {
    console.log('🔍 Verifying skills installation...\n');

    const skills = this.registry.skills || {};
    let valid = 0;
    let invalid = 0;

    Object.entries(skills).forEach(([id, config]) => {
      if (config.enabled === false) return;

      const targetPath = path.join(this.skillsDir, id);

      if (fs.existsSync(targetPath)) {
        const stats = fs.lstatSync(targetPath);
        if (stats.isSymbolicLink()) {
          const linkTarget = fs.readlinkSync(targetPath);
          const expectedTarget = this.resolveSkillPath(config);

          if (linkTarget === expectedTarget) {
            console.log(`✅ ${id} → ${linkTarget}`);
            valid++;
          } else {
            console.log(`❌ ${id} → ${linkTarget}`);
            console.log(`   Expected: ${expectedTarget}\n`);
            invalid++;
          }
        } else {
          console.log(`⚠️  ${id} exists but is not a symlink\n`);
          invalid++;
        }
      } else {
        console.log(`❌ ${id} not found in ~/.claude/skills/\n`);
        invalid++;
      }
    });

    console.log(`\n✅ Summary: ${valid} valid, ${invalid} invalid`);
  }
}

// CLI
const command = process.argv[2] || 'load';
const registryPath = path.join(__dirname, 'skills-registry.json');

const loader = new SkillLoader(registryPath);

switch (command) {
  case 'load':
    loader.loadAll();
    break;
  case 'list':
    loader.list();
    break;
  case 'verify':
    loader.verify();
    break;
  default:
    console.log('Usage: node skill-loader.js [load|list|verify]');
    process.exit(1);
}
