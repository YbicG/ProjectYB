import { BrowserWindow } from 'electron';

export type AiProviderType = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'custom';

export interface AiProviderConfig {
  provider: AiProviderType;
  baseUrl?: string; // default http://localhost:11434 for ollama
  apiKey?: string;
  model: string; // e.g. llama3, qwen2.5-coder, gpt-4o, claude-3-5-sonnet, gemini-1.5-pro
  temperature?: number;
}

export interface AiModelInfo {
  name: string;
  sizeBytes?: number;
  modifiedAt?: string;
  provider: AiProviderType;
}

export class AiService {
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Check Ollama local connectivity and list models
   */
  async checkOllamaStatus(baseUrl: string = 'http://localhost:11434'): Promise<{ running: boolean; models: AiModelInfo[]; error?: string }> {
    try {
      const url = baseUrl.replace(/\/+$/, '') + '/api/tags';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        return { running: false, models: [], error: `Ollama returned HTTP ${res.status}` };
      }

      const data = (await res.json()) as any;
      const models: AiModelInfo[] = (data.models || []).map((m: any) => ({
        name: m.name,
        sizeBytes: m.size,
        modifiedAt: m.modified_at,
        provider: 'ollama'
      }));

      return { running: true, models };
    } catch (err: any) {
      return { running: false, models: [], error: err.message || 'Ollama not running on localhost:11434' };
    }
  }

  /**
   * General completion generator
   */
  async generateCompletion(
    prompt: string,
    systemPrompt: string = '',
    config: AiProviderConfig
  ): Promise<{ success: boolean; text: string; error?: string }> {
    if (config.provider === 'ollama') {
      return this.generateOllama(prompt, systemPrompt, config);
    }

    if (config.provider === 'openai') {
      return this.generateOpenAi(prompt, systemPrompt, config);
    }

    if (config.provider === 'gemini') {
      return this.generateGemini(prompt, systemPrompt, config);
    }

    if (config.provider === 'anthropic') {
      return this.generateAnthropic(prompt, systemPrompt, config);
    }

    return {
      success: false,
      text: '',
      error: `Provider ${config.provider} not configured`
    };
  }

  /**
   * Diagnose terminal crash / stack trace
   */
  async diagnoseError(
    errorLogs: string,
    command: string = '',
    config: AiProviderConfig
  ): Promise<{ success: boolean; explanation: string; suggestedFix: string; error?: string }> {
    const systemPrompt = `You are an expert DevOps and Software Engineer inside ProjectYB desktop workspace. Analyze the provided command failure/crash log and return a concise explanation of the root cause and the exact shell/code command to fix it. Format clearly with markdown.`;

    const prompt = `Command run: ${command}\n\nError / Crash Output:\n\`\`\`\n${errorLogs}\n\`\`\`\n\nPlease provide:\n1. Root Cause Summary (1-2 sentences)\n2. Immediate Fix Command (in a code block)\n3. Prevention / Next Steps`;

    const res = await this.generateCompletion(prompt, systemPrompt, config);
    if (!res.success) {
      return { success: false, explanation: '', suggestedFix: '', error: res.error };
    }

    return {
      success: true,
      explanation: res.text,
      suggestedFix: ''
    };
  }

  /**
   * Generate conventional Git commit message from diff
   */
  async generateCommitMessage(
    diffText: string,
    config: AiProviderConfig
  ): Promise<{ success: boolean; commitMessage: string; error?: string }> {
    const systemPrompt = `You are a git commit assistant. Analyze the git diff and output ONLY a clean conventional commit message (e.g. "feat(auth): add OAuth provider login" or "fix(server): prevent memory leak in terminal buffer"). Do not output any markdown explanations, just the commit title and optional brief bullet points.`;

    const prompt = `Git Diff:\n\`\`\`diff\n${diffText.slice(0, 4000)}\n\`\`\``;

    const res = await this.generateCompletion(prompt, systemPrompt, config);
    if (!res.success) {
      return { success: false, commitMessage: '', error: res.error };
    }

    return {
      success: true,
      commitMessage: res.text.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '')
    };
  }

  private async generateOllama(
    prompt: string,
    systemPrompt: string,
    config: AiProviderConfig
  ): Promise<{ success: boolean; text: string; error?: string }> {
    try {
      const baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'llama3',
          prompt: prompt,
          system: systemPrompt,
          stream: false,
          options: {
            temperature: config.temperature ?? 0.7
          }
        })
      });

      if (!res.ok) {
        return { success: false, text: '', error: `Ollama error HTTP ${res.status}` };
      }

      const data = (await res.json()) as any;
      return { success: true, text: data.response || '' };
    } catch (err: any) {
      return { success: false, text: '', error: err.message };
    }
  }

  private async generateOpenAi(
    prompt: string,
    systemPrompt: string,
    config: AiProviderConfig
  ): Promise<{ success: boolean; text: string; error?: string }> {
    try {
      if (!config.apiKey) return { success: false, text: '', error: 'Missing OpenAI API Key' };

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: config.temperature ?? 0.7
        })
      });

      const data = (await res.json()) as any;
      if (data.error) {
        return { success: false, text: '', error: data.error.message };
      }

      return {
        success: true,
        text: data.choices?.[0]?.message?.content || ''
      };
    } catch (err: any) {
      return { success: false, text: '', error: err.message };
    }
  }

  private async generateGemini(
    prompt: string,
    systemPrompt: string,
    config: AiProviderConfig
  ): Promise<{ success: boolean; text: string; error?: string }> {
    try {
      if (!config.apiKey) return { success: false, text: '', error: 'Missing Google Gemini API Key' };

      const model = config.model || 'gemini-1.5-flash';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}` }] }]
          })
        }
      );

      const data = (await res.json()) as any;
      if (data.error) {
        return { success: false, text: '', error: data.error.message };
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { success: true, text };
    } catch (err: any) {
      return { success: false, text: '', error: err.message };
    }
  }

  private async generateAnthropic(
    prompt: string,
    systemPrompt: string,
    config: AiProviderConfig
  ): Promise<{ success: boolean; text: string; error?: string }> {
    try {
      if (!config.apiKey) return { success: false, text: '', error: 'Missing Anthropic API Key' };

      const model = config.model || 'claude-3-5-sonnet-20241022';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 2048,
          ...(systemPrompt ? { system: systemPrompt } : {}),
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = (await res.json()) as any;
      if (data.error) {
        return { success: false, text: '', error: data.error.message };
      }

      const text = data.content?.[0]?.text || '';
      return { success: true, text };
    } catch (err: any) {
      return { success: false, text: '', error: err.message };
    }
  }
}

export const aiService = new AiService();
