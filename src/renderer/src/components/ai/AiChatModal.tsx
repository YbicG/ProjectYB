import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useAiStore } from '@renderer/stores/useAiStore';
import { Bot, Sparkles, Send, Trash2, Maximize2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { useAppStore } from '@renderer/stores/useAppStore';

export const AiChatModal: React.FC = () => {
  const {
    chatModalOpen,
    setChatModalOpen,
    chatMessages,
    sendMessage,
    clearChat,
    isGenerating,
    config
  } = useAiStore();

  const { setActiveTab } = useAppStore();
  const [input, setInput] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleOpenFullPage = () => {
    setChatModalOpen(false);
    setActiveTab('ai-hub');
  };

  return (
    <Dialog open={chatModalOpen} onOpenChange={setChatModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-xl h-[70vh] flex flex-col p-4 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800 space-y-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <span>AI Copilot Assistant</span>
                <Badge variant="outline" className="text-[9px] font-mono border-zinc-800 text-zinc-400">
                  {config.provider.toUpperCase()}
                </Badge>
              </DialogTitle>
            </div>
          </div>

          <div className="flex items-center gap-1 mr-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
              onClick={handleOpenFullPage}
              title="Open full AI Hub Studio"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
              onClick={clearChat}
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2 max-w-lg leading-relaxed text-xs',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] font-bold',
                  msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-violet-400'
                )}
              >
                {msg.role === 'user' ? 'U' : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={cn(
                  'p-2.5 rounded-lg whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-900/80 border border-zinc-800 text-zinc-200'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-2 text-xs text-zinc-500 italic p-2">
              <Bot className="w-4 h-4 animate-pulse text-violet-400" />
              Generating response...
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-zinc-850">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI Copilot..."
            disabled={isGenerating}
            className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 h-9"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isGenerating || !input.trim()}
            className="h-9 px-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-1"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
