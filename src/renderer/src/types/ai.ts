export type AiProviderType = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'custom';

export interface AiProviderConfig {
  provider: AiProviderType;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  temperature?: number;
}

export interface AiModelInfo {
  name: string;
  sizeBytes?: number;
  modifiedAt?: string;
  provider: AiProviderType;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
