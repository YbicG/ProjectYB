import React, { useEffect, useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Trash2,
  Settings,
  Cpu,
  RotateCw,
  Terminal,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
  Code,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAiStore } from '@renderer/stores/useAiStore';
import { AiProviderType } from '@renderer/types/ai';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const AiHubPage: React.FC = () => {
  const {
    config,
    saveConfig,
    loadConfig,
    ollamaRunning,
    ollamaModels,
    checkOllama,
    chatMessages,
    sendMessage,
    clearChat,
    isGenerating
  } = useAiStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [provider, setProvider] = useState<AiProviderType>(config.provider || 'ollama');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [model, setModel] = useState(config.model || 'llama3');

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;
    const text = inputPrompt;
    setInputPrompt('');
    await sendMessage(text);
  };

  const handleSaveSettings = () => {
    saveConfig({
      provider,
      apiKey: apiKey.trim() || undefined,
      model: model.trim()
    });
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* ── Left Settings & Models Sidebar ── */}
      <div className="w-72 md:w-80 border-r border-zinc-800 flex flex-col bg-zinc-950/70 shrink-0 p-4 space-y-5 overflow-y-auto">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Bot className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-sm text-zinc-100">AI Diagnostics & Copilot</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Configure local Ollama daemon or cloud AI providers for error diagnosis and commit generation.
          </p>
        </div>

        {/* ── Provider Settings ── */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-200">LLM Provider</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-400">Provider</Label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full h-8 rounded bg-zinc-950 border border-zinc-800 px-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="ollama">Ollama (Local Offline)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="gemini">Google Gemini (Flash/Pro)</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>

            {provider === 'ollama' ? (
              <div className="space-y-2 pt-1 border-t border-zinc-850">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Ollama Daemon</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] font-mono uppercase',
                      ollamaRunning
                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                        : 'border-zinc-700 text-zinc-500'
                    )}
                  >
                    {ollamaRunning ? 'Connected' : 'Offline'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">Model Name</Label>
                  <Input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. llama3, qwen2.5-coder, mistral"
                    className="h-8 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkOllama()}
                  className="w-full h-7 text-[11px] border-zinc-800 gap-1 text-zinc-400 hover:text-zinc-200"
                >
                  <RotateCw className="w-3 h-3" />
                  Check Ollama (11434)
                </Button>
              </div>
            ) : (
              <div className="space-y-2 pt-1 border-t border-zinc-850">
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">API Key</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="h-8 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">Model Name</Label>
                  <Input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'}
                    className="h-8 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100"
                  />
                </div>
              </div>
            )}

            <Button
              size="sm"
              onClick={handleSaveSettings}
              className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-2"
            >
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        {/* ── Installed Ollama Models ── */}
        {provider === 'ollama' && ollamaModels.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Detected Ollama Models:
            </span>
            <div className="space-y-1">
              {ollamaModels.map((m) => (
                <button
                  key={m.name}
                  onClick={() => {
                    setModel(m.name);
                    saveConfig({ model: m.name });
                  }}
                  className={cn(
                    'w-full p-2 rounded-lg border text-left text-xs font-mono flex items-center justify-between transition-colors',
                    config.model === m.name
                      ? 'bg-violet-950/30 border-violet-500/50 text-violet-300'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:bg-zinc-900'
                  )}
                >
                  <span className="truncate">{m.name}</span>
                  {config.model === m.name && <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Main Chat / Prompt Sandbox ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="font-semibold text-sm text-zinc-200">Developer Assistant</span>
            <Badge variant="outline" className="text-[10px] font-mono border-zinc-800 text-zinc-400">
              {config.provider.toUpperCase()} : {config.model || 'default'}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="h-7 text-xs text-zinc-400 hover:text-zinc-100 gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear Chat
          </Button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 max-w-3xl leading-relaxed',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                  msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-zinc-800 border border-zinc-700 text-violet-400'
                )}
              >
                {msg.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={cn(
                  'p-3.5 rounded-xl text-xs space-y-2',
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-900/80 border border-zinc-800 text-zinc-200 shadow-sm'
                )}
              >
                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-3 max-w-3xl">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-violet-400">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 italic">
                Thinking and formulating response...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
            <Input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask AI anything (e.g. explain docker compose volume syntax, optimize SQL query)..."
              disabled={isGenerating}
              className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 h-10 px-3.5"
            />
            <Button
              type="submit"
              disabled={isGenerating || !inputPrompt.trim()}
              className="h-10 px-4 bg-violet-600 hover:bg-violet-500 text-white gap-1.5 font-semibold shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
