import React, { useEffect, useState } from 'react';
import {
  Bot,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Cpu,
  Zap,
  Globe,
  Sliders,
  Shield
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { useAiStore } from '@renderer/stores/useAiStore';
import { AiProviderType } from '@renderer/types/ai';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

const POPULAR_MODELS: Record<AiProviderType, string[]> = {
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'gpt-4-turbo'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
  ollama: ['llama3.2', 'deepseek-r1:8b', 'qwen2.5-coder:7b', 'codellama', 'mistral'],
  custom: ['default']
};

export const AiSettings: React.FC = () => {
  const {
    config,
    saveConfig,
    loadConfig,
    ollamaRunning,
    ollamaModels,
    checkOllama
  } = useAiStore();

  const [provider, setProvider] = useState<AiProviderType>(config.provider || 'ollama');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || 'http://localhost:11434');
  const [model, setModel] = useState(config.model || 'llama3');
  const [temperature, setTemperature] = useState<number>(config.temperature ?? 0.7);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    setProvider(config.provider || 'ollama');
    setApiKey(config.apiKey || '');
    setBaseUrl(config.baseUrl || 'http://localhost:11434');
    setModel(config.model || 'llama3');
    setTemperature(config.temperature ?? 0.7);
  }, [config]);

  const handleSave = async () => {
    await saveConfig({
      provider,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      temperature: Number(temperature)
    });
    toast.success('AI Assistant configuration saved');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      if (provider === 'ollama') {
        await checkOllama();
        const isRunning = useAiStore.getState().ollamaRunning;
        const models = useAiStore.getState().ollamaModels;
        if (isRunning) {
          setTestResult({ success: true, message: `Connected to Ollama! ${models.length} models detected.` });
          toast.success('Connected to Ollama successfully!');
        } else {
          setTestResult({ success: false, message: 'Ollama is not responding at ' + baseUrl });
          toast.error('Ollama connection failed');
        }
      } else {
        if (!apiKey.trim()) {
          setTestResult({ success: false, message: 'API key is required for ' + provider });
          toast.error('API key is required');
          return;
        }

        if (window.api?.ai?.generateCompletion) {
          const res = await window.api.ai.generateCompletion(
            'Respond with the single word: READY',
            'You are a connectivity test assistant.',
            {
              provider,
              apiKey: apiKey.trim(),
              baseUrl: baseUrl.trim(),
              model: model.trim() || POPULAR_MODELS[provider][0],
              temperature: 0.1
            }
          );

          if (res.success) {
            setTestResult({ success: true, message: `Successfully verified ${provider.toUpperCase()} connection (${model})!` });
            toast.success(`${provider.toUpperCase()} connection verified!`);
          } else {
            setTestResult({ success: false, message: res.error || 'Connection failed' });
            toast.error(`Connection error: ${res.error || 'Unknown'}`);
          }
        }
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test error' });
      toast.error(err.message || 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-400" /> AI Assistant & Commit Copilot
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Configure OpenAI, Anthropic Claude, Google Gemini, or local Ollama instances for 1-click Git commit generation, code intelligence, and script assistance.
        </p>
      </div>

      {/* Provider Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'anthropic', label: 'Anthropic Claude', icon: Sparkles, desc: 'Claude 3.5 Sonnet / Haiku' },
          { id: 'openai', label: 'OpenAI', icon: Zap, desc: 'GPT-4o, GPT-4o-mini, o1' },
          { id: 'ollama', label: 'Ollama (Local)', icon: Cpu, desc: 'Llama 3.2, DeepSeek, Qwen' },
          { id: 'gemini', label: 'Google Gemini', icon: Globe, desc: 'Gemini 1.5 Pro / Flash' }
        ].map((p) => {
          const isSelected = provider === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => {
                const newProv = p.id as AiProviderType;
                setProvider(newProv);
                setModel(POPULAR_MODELS[newProv][0] || '');
                if (newProv === 'ollama') setBaseUrl('http://localhost:11434');
              }}
              className={cn(
                'flex flex-col items-start p-3.5 rounded-xl border text-left transition-all',
                isSelected
                  ? 'bg-violet-950/40 border-violet-500/60 ring-1 ring-violet-500/40 shadow-lg shadow-violet-950/30'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
              )}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <Icon className={cn('w-4 h-4', isSelected ? 'text-violet-400' : 'text-zinc-400')} />
                {isSelected && <Badge variant="outline" className="text-[10px] bg-violet-900/60 text-violet-300 border-violet-700">Active</Badge>}
              </div>
              <span className="text-xs font-semibold text-zinc-200">{p.label}</span>
              <span className="text-[11px] text-zinc-500 mt-0.5">{p.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Card */}
      <Card className="bg-zinc-900/70 border-zinc-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-400" /> {provider.toUpperCase()} Model & Authentication
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            {provider === 'ollama'
              ? 'Local offline inference with zero data leakage. Ensure Ollama is running on your machine.'
              : `Provide your ${provider.toUpperCase()} API key to power AI commit generation and developer tooling.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key (if cloud provider) */}
          {provider !== 'ollama' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400" /> API Key
                </span>
                <span className="text-[11px] text-zinc-500">Stored locally in encrypted app configuration</span>
              </Label>
              <Input
                type="password"
                placeholder={provider === 'anthropic' ? 'sk-ant-api03-...' : provider === 'openai' ? 'sk-proj-...' : 'AIzaSy...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-200 focus:border-violet-500"
              />
            </div>
          )}

          {/* Base URL (if Ollama or custom) */}
          {provider === 'ollama' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 flex items-center justify-between">
                <span>Ollama Endpoint URL</span>
                <span className="text-[11px] text-zinc-500">Default: http://localhost:11434</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="http://localhost:11434"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-200 focus:border-violet-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => checkOllama()}
                  className="shrink-0 text-xs border-zinc-800 hover:bg-zinc-800"
                >
                  <RotateCw className="w-3.5 h-3.5 mr-1" /> Detect
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn('w-2 h-2 rounded-full', ollamaRunning ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
                <span className="text-[11px] text-zinc-400">
                  {ollamaRunning ? `Ollama is active (${ollamaModels.length} models installed)` : 'Ollama daemon not detected on this port'}
                </span>
              </div>
            </div>
          )}

          {/* Model Name & Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-300">Model Name</Label>
            <Input
              type="text"
              placeholder="e.g. claude-3-5-sonnet-20241022, gpt-4o, llama3.2"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-200 focus:border-violet-500"
            />
            {/* Quick model pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-zinc-500 mr-1">Presets:</span>
              {(provider === 'ollama' && ollamaModels.length > 0
                ? ollamaModels.map((m) => m.name)
                : POPULAR_MODELS[provider] || []
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setModel(preset)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-mono border transition-colors',
                    model === preset
                      ? 'bg-violet-950 text-violet-300 border-violet-700'
                      : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-300">Creativity / Temperature</Label>
              <span className="text-xs font-mono text-violet-400">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0.0 (Precise & Deterministic)</span>
              <span>1.0 (Creative & Verbose)</span>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={cn(
                'p-3 rounded-lg border text-xs flex items-start gap-2.5',
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
              )}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{testResult.success ? 'Connection Verified' : 'Connection Failed'}</p>
                <p className="text-[11px] opacity-80 mt-0.5 font-mono">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300"
            >
              {isTesting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-violet-400" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
                  Test Connection
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-violet-600 hover:bg-violet-700 text-xs px-4"
            >
              Save AI Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
