/**
 * Model Router
 * Routes checkpoints to appropriate model adapters
 */

import type { ModelAdapter, Checkpoint, CeciliaConfig } from './types';
import { ClaudeCodeAdapter, CodexAdapter, GeminiAdapter } from './adapters';

export class ModelRouter {
  private adapters: Map<string, ModelAdapter> = new Map();
  private defaultModel: string;

  constructor(config?: Partial<CeciliaConfig>) {
    this.defaultModel = config?.defaultModel || 'claude-code';

    // Register adapters
    this.register(new ClaudeCodeAdapter());
    this.register(new CodexAdapter(config?.models?.codex?.apiKey));
    this.register(
      new GeminiAdapter({
        apiKey: config?.models?.gemini?.apiKey,
        model: config?.models?.gemini?.model,
      })
    );
  }

  register(adapter: ModelAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Route a checkpoint to the appropriate model adapter
   * Priority: explicit preference > checkpoint.model > task-type-based > default
   */
  route(checkpoint: Checkpoint, preference?: string): ModelAdapter {
    const modelName =
      preference || checkpoint.model || this.getModelForType(checkpoint);

    const adapter = this.adapters.get(modelName);
    if (!adapter) {
      console.warn(
        `Model "${modelName}" not found, falling back to ${this.defaultModel}`
      );
      return this.adapters.get(this.defaultModel)!;
    }

    return adapter;
  }

  /**
   * Get best model for checkpoint type
   */
  private getModelForType(checkpoint: Checkpoint): string {
    switch (checkpoint.type) {
      case 'code':
        return 'claude-code'; // Claude 最擅长写代码
      case 'test':
        return 'claude-code'; // 测试也用 Claude
      case 'docs':
        return 'gemini'; // 文档可以用 Gemini（便宜）
      case 'config':
        return 'claude-code'; // 配置文件用 Claude
      case 'review':
        return 'gemini'; // Review 可以用 Gemini
      default:
        return this.defaultModel;
    }
  }

  /**
   * Get all registered adapters
   */
  getAdapters(): ModelAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get specific adapter by name
   */
  getAdapter(name: string): ModelAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Check health of all adapters
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }
}
