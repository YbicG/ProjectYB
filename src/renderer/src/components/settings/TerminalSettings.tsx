import React from 'react';
import { TerminalSquare, Type, MousePointerClick, Sliders } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { useThemeStore, TerminalCursorStyle } from '@renderer/stores/useThemeStore';
import { cn } from '@renderer/lib/utils';

export const TerminalSettings: React.FC = () => {
  const {
    terminalFontFamily,
    terminalFontSize,
    terminalCursorStyle,
    terminalCursorBlink,
    setTerminalFontFamily,
    setTerminalFontSize,
    setTerminalCursorStyle,
    setTerminalCursorBlink
  } = useThemeStore();

  const fonts = [
    { label: 'Cascadia Code', value: '"Cascadia Code", Consolas, monospace' },
    { label: 'Consolas', value: 'Consolas, "Courier New", monospace' },
    { label: 'JetBrains Mono', value: '"JetBrains Mono", Consolas, monospace' },
    { label: 'Fira Code', value: '"Fira Code", Consolas, monospace' },
    { label: 'System Monospace', value: 'monospace' }
  ];

  const cursorStyles: Array<{ label: string; value: TerminalCursorStyle }> = [
    { label: 'Solid Block ( █ )', value: 'block' },
    { label: 'Underline ( _ )', value: 'underline' },
    { label: 'Vertical Bar ( | )', value: 'bar' }
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <TerminalSquare className="w-5 h-5 text-violet-400" />
          Terminal Preferences
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Configure font typography, sizing, and cursor behaviors for the embedded xterm engine.
        </p>
      </div>

      {/* ── Typography & Font Family ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="w-4 h-4 text-violet-400" />
            Terminal Font Family
          </CardTitle>
          <CardDescription className="text-xs">
            Select the monospace typeface used in all terminal tabs and service output logs.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fonts.map((f) => {
              const isSelected = terminalFontFamily === f.value;
              return (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setTerminalFontFamily(f.value)}
                  className={cn(
                    'p-3 rounded-lg border text-left flex items-center justify-between transition-all',
                    isSelected
                      ? 'border-violet-500 bg-zinc-900 text-zinc-100 ring-1 ring-violet-500/50'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                  )}
                >
                  <span className="text-xs font-medium" style={{ fontFamily: f.value }}>
                    {f.label}
                  </span>
                  {isSelected && <Badge variant="outline" className="text-[9px] border-violet-700 text-violet-300">Active</Badge>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Font Size & Cursor Style ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Font Size */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Font Size</CardTitle>
              <Badge variant="outline" className="text-xs font-mono">{terminalFontSize}px</Badge>
            </div>
            <CardDescription className="text-xs">
              Adjust character rendering size.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 space-y-3">
            <input
              type="range"
              min="11"
              max="18"
              step="1"
              value={terminalFontSize}
              onChange={(e) => setTerminalFontSize(parseInt(e.target.value, 10))}
              className="w-full accent-violet-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>11px (Compact)</span>
              <span>13px (Default)</span>
              <span>18px (Large)</span>
            </div>
          </CardContent>
        </Card>

        {/* Cursor Style */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-violet-400" />
              Cursor Shape & Animation
            </CardTitle>
            <CardDescription className="text-xs">
              Customize cursor style and blinking.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-1">
            <select
              value={terminalCursorStyle}
              onChange={(e) => setTerminalCursorStyle(e.target.value as TerminalCursorStyle)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 h-8 text-xs text-zinc-200 focus:outline-none"
            >
              {cursorStyles.map((cs) => (
                <option key={cs.value} value={cs.value}>{cs.label}</option>
              ))}
            </select>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-300">Cursor Blinking</span>
              <button
                type="button"
                onClick={() => setTerminalCursorBlink(!terminalCursorBlink)}
                className={cn(
                  'w-9 h-5 rounded-full transition-colors relative',
                  terminalCursorBlink ? 'bg-violet-600' : 'bg-zinc-800'
                )}
              >
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform',
                    terminalCursorBlink ? 'left-5' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Live Terminal Preview Box ── */}
      <div className="p-4 rounded-lg bg-black border border-zinc-800 space-y-1 font-mono text-zinc-300" style={{ fontFamily: terminalFontFamily, fontSize: `${terminalFontSize}px` }}>
        <div className="text-[10px] text-zinc-600 mb-2 border-b border-zinc-900 pb-1">LIVE PREVIEW</div>
        <p className="text-emerald-400">PS D:\Code\ProjectYB&gt; npm run dev</p>
        <p className="text-zinc-400">▲ Next.js 15.1.0 (Turbopack)</p>
        <p className="text-cyan-400">- Local: http://localhost:3000</p>
        <p className="text-zinc-500">Ready in 650ms.</p>
      </div>
    </div>
  );
};
