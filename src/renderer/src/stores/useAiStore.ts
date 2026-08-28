import { create } from 'zustand';
import { AiProviderConfig, AiModelInfo, ChatMessage } from '../types/ai';
import { toast } from 'sonner';

interface AiState {
  config: AiProviderConfig;
  ollamaRunning: boolean;
  ollamaModels: AiModelInfo[];
  chatMessages: ChatMessage[];
  isGenerating: boolean;
  chatModalOpen: boolean;
  errorDiagnosisModalOpen: boolean;
  activeErrorLogs: string;
  activeErrorCommand: string;
  activeDiagnosis: string;
  isDiagnosing: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<AiProviderConfig>) => Promise<void>;
  checkOllama: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  setChatModalOpen: (open: boolean) => void;
  openErrorDiagnosis: (errorLogs: string, command?: string) => Promise<void>;
  closeErrorDiagnosis: () => void;
  generateCommitMessage: (diffText: string) => Promise<string>;
}

export const useAiStore = create<AiState>((set, get) => ({
  config: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3',
    temperature: 0.7
  },
  ollamaRunning: false,
  ollamaModels: [],
  chatMessages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 Hi! I am your ProjectYB AI Copilot. Ask me questions about your code, debugging terminal errors, writing git commits, or designing database schemas.',
      timestamp: Date.now()
    }
  ],
  isGenerating: false,
  chatModalOpen: false,
  errorDiagnosisModalOpen: false,
  activeErrorLogs: '',
  activeErrorCommand: '',
  activeDiagnosis: '',
  isDiagnosing: false,

  loadConfig: async () => {
    if (!window.api?.store) return;
    try {
      const saved = (await window.api.store.get('ai:config')) as AiProviderConfig | undefined;
      if (saved) {
        set({ config: { ...get().config, ...saved } });
      }
    } catch {}

    get().checkOllama();
  },

  saveConfig: async (partial) => {
    const updated = { ...get().config, ...partial };
    set({ config: updated });
    try {
      if (window.api?.store) {
        await window.api.store.set('ai:config', updated);
      }
    } catch {}
    toast.success('AI Settings updated');
  },

  checkOllama: async () => {
    if (!window.api?.ai) return;
    try {
      const res = await window.api.ai.checkOllamaStatus(get().config.baseUrl);
      set({
        ollamaRunning: res.running,
        ollamaModels: res.models || []
      });
      if (res.running && res.models.length > 0 && !get().config.model) {
        set((state) => ({ config: { ...state.config, model: res.models[0].name } }));
      }
    } catch {
      set({ ollamaRunning: false, ollamaModels: [] });
    }
  },

  sendMessage: async (text) => {
    if (!text.trim() || !window.api?.ai) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMsg],
      isGenerating: true
    }));

    try {
      const systemPrompt = 'You are an expert AI software developer and DevOps architect in ProjectYB. Provide concise, clean, actionable answers with formatted code blocks.';
      const res = await window.api.ai.generateCompletion(text, systemPrompt, get().config);

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: res.success ? res.text : `⚠️ AI Error: ${res.error || 'Failed to generate response'}`,
        timestamp: Date.now()
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMsg],
        isGenerating: false
      }));
    } catch (err: any) {
      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          {
            id: `msg_${Date.now()}_err`,
            role: 'assistant',
            content: `⚠️ Error: ${err.message}`,
            timestamp: Date.now()
          }
        ],
        isGenerating: false
      }));
    }
  },

  clearChat: () =>
    set({
      chatMessages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Chat cleared. How can I assist you with your project?',
          timestamp: Date.now()
        }
      ]
    }),

  setChatModalOpen: (open) => set({ chatModalOpen: open }),

  openErrorDiagnosis: async (errorLogs, command = '') => {
    set({
      errorDiagnosisModalOpen: true,
      activeErrorLogs: errorLogs,
      activeErrorCommand: command,
      activeDiagnosis: '',
      isDiagnosing: true
    });

    if (!window.api?.ai) {
      set({ activeDiagnosis: 'AI API unavailable in current environment', isDiagnosing: false });
      return;
    }

    try {
      const res = await window.api.ai.diagnoseError(errorLogs, command, get().config);
      set({
        activeDiagnosis: res.success ? res.explanation : `Failed to analyze error: ${res.error}`,
        isDiagnosing: false
      });
    } catch (err: any) {
      set({ activeDiagnosis: `Diagnosis error: ${err.message}`, isDiagnosing: false });
    }
  },

  closeErrorDiagnosis: () =>
    set({ errorDiagnosisModalOpen: false, activeErrorLogs: '', activeDiagnosis: '', isDiagnosing: false }),

  generateCommitMessage: async (diffText) => {
    if (!window.api?.ai || !diffText.trim()) return 'chore: update codebase';
    try {
      const res = await window.api.ai.generateCommitMessage(diffText, get().config);
      return res.success && res.commitMessage ? res.commitMessage : 'chore: update project files';
    } catch {
      return 'chore: update project files';
    }
  }
}));
