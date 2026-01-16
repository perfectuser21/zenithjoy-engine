/**
 * Codex Adapter (OpenAI)
 * Placeholder for future OpenAI Codex integration
 */

import type { ModelAdapter, ExecutionContext, ExecutionResult } from '../types';

export class CodexAdapter implements ModelAdapter {
  name = 'codex';

  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  async execute(ctx: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();

    // TODO: Implement actual Codex CLI or API integration
    // OpenAI 的代码执行能力目前不如 Claude Code
    // 这个适配器为未来扩展预留

    return {
      success: false,
      output: '',
      error: 'Codex adapter not yet implemented',
      duration: Date.now() - startTime,
    };
  }

  async healthCheck(): Promise<boolean> {
    // 检查 API Key 是否存在
    return Boolean(this.apiKey);
  }

  // 未来实现参考
  // private async callCodex(prompt: string): Promise<string> {
  //   const response = await fetch('https://api.openai.com/v1/completions', {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${this.apiKey}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       model: 'code-davinci-002',
  //       prompt,
  //       max_tokens: 4096,
  //     }),
  //   });
  //   const data = await response.json();
  //   return data.choices[0].text;
  // }
}
