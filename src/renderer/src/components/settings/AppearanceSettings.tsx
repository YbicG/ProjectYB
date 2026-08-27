import React from 'react';
import { Palette, Check, LayoutGrid, Sparkles, Sliders, Layers, TerminalSquare, Compass, Radio } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useThemeStore, AccentColor, Density, UIMode } from '@renderer/stores/useThemeStore';
import { cn } from '@renderer/lib/utils';

export const AppearanceSettings: React.FC = () => {
  const { accentColor, density, uiMode, setAccentColor, setDensity, setUiMode } = useThemeStore();

  const themes: Array<{ id: AccentColor; name: string; desc: string; bgClass: string; borderClass: string; hex: string }> = [
    { id: 'violet', name: 'Deep Violet', desc: 'ProjectYB classic violet purple', bgClass: 'bg-violet-600', borderClass: 'border-violet-500', hex: '#8b5cf6' },
    { id: 'cyan', name: 'Cyber Cyan', desc: 'High-contrast electric cyan', bgClass: 'bg-cyan-500', borderClass: 'border-cyan-400', hex: '#06b6d4' },
    { id: 'emerald', name: 'Matrix Emerald', desc: 'Sleek terminal matrix green', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-500', hex: '#10b981' },
    { id: 'amber', name: 'Solar Amber', desc: 'Warm retro amber gold', bgClass: 'bg-amber-500', borderClass: 'border-amber-400', hex: '#f59e0b' },
    { id: 'rose', name: 'Ruby Rose', desc: 'Vibrant neon crimson rose', bgClass: 'bg-rose-600', borderClass: 'border-rose-500', hex: '#f43f5e' },
    { id: 'oled', name: 'Pure OLED', desc: 'Monochrome obsidian dark', bgClass: 'bg-zinc-100', borderClass: 'border-zinc-300', hex: '#f4f4f5' }
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Palette className="w-5 h-5 text-violet-400" />
          Appearance & UI Experience
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Customize ProjectYB layout engines, accent colors, and visual workspace density.
        </p>
      </div>

      {/* ── UI Experience Mode (Feature Flag) ── */}
      <Card className="bg-zinc-950 border-zinc-800 ring-1 ring-violet-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-violet-400" />
              <CardTitle className="text-sm">UI Experience Engine (Phase 7)</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300">
              FEATURE FLAG
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Seamlessly toggle between the Classic TopNav layout and the Next-Gen Phase 7 Workspace (with Activity Rail, Bento Hub & Universal Dockable Terminal).
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Classic Experience */}
          <button
            type="button"
            onClick={() => setUiMode('classic')}
            className={cn(
              'p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between',
              uiMode === 'classic'
                ? 'border-violet-500 bg-zinc-900/90 ring-1 ring-violet-500/50 shadow-lg shadow-violet-950/20'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:bg-zinc-900'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-400" />
                  <span className="font-bold text-xs text-zinc-100">Classic Experience (V1)</span>
                </div>
                {uiMode === 'classic' && (
                  <Badge className="bg-violet-600 hover:bg-violet-600 text-white text-[10px] px-1.5 py-0">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Horizontal top navigation bar, full-page tabs, and standard dashboard layout.
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <span>• Top Tab Navigation</span>
              <span>• Fullpage Terminals</span>
            </div>
          </button>

          {/* Modern Experience (Phase 7) */}
          <button
            type="button"
            onClick={() => setUiMode('modern')}
            className={cn(
              'p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between',
              uiMode === 'modern'
                ? 'border-violet-500 bg-zinc-900/90 ring-1 ring-violet-500/50 shadow-lg shadow-violet-950/30'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:bg-zinc-900'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="font-bold text-xs text-violet-300">Modern V2 Experience (Phase 7)</span>
                </div>
                {uiMode === 'modern' ? (
                  <Badge className="bg-violet-600 hover:bg-violet-600 text-white text-[10px] px-1.5 py-0">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-violet-500/40 text-violet-300 text-[9px] px-1.5 py-0">
                    Next-Gen
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Collapsible Left Activity Rail, Omnipresent Command Omnibar, Bento Grid Dashboard, and Universal Terminal Dock (Ctrl+`).
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center gap-2 text-[10px] font-mono text-violet-400">
              <span>• Activity Rail (Ctrl+B)</span>
              <span>• Terminal Dock (Ctrl+`)</span>
              <span>• Bento Hub</span>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* ── Theme Color Palette Picker ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Accent Color Theme</CardTitle>
          <CardDescription className="text-xs">
            Select the primary brand and highlight color used across badges, buttons, active tabs, and graphs.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {themes.map((t) => {
            const isSelected = accentColor === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAccentColor(t.id)}
                className={cn(
                  'p-3 rounded-lg border text-left flex flex-col justify-between transition-all hover:bg-zinc-900',
                  isSelected
                    ? 'border-violet-500 bg-zinc-900/90 ring-1 ring-violet-500/50'
                    : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{ backgroundColor: t.hex }}
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                    </span>
                    <span className="font-semibold text-xs text-zinc-200">{t.name}</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">{t.desc}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Layout & UI Density ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-violet-400" />
            UI Information Density
          </CardTitle>
          <CardDescription className="text-xs">
            Adjust margins, padding, and font metrics for comfortable or high-information density.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setDensity('comfortable')}
            className={cn(
              'p-3.5 rounded-lg border text-left transition-all',
              density === 'comfortable'
                ? 'border-violet-500 bg-zinc-900 ring-1 ring-violet-500/50'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-zinc-200">Comfortable</span>
              {density === 'comfortable' && <Check className="w-3.5 h-3.5 text-violet-400" />}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Spacious padding, larger badges, and easy reading.</p>
          </button>

          <button
            type="button"
            onClick={() => setDensity('compact')}
            className={cn(
              'p-3.5 rounded-lg border text-left transition-all',
              density === 'compact'
                ? 'border-violet-500 bg-zinc-900 ring-1 ring-violet-500/50'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-zinc-200">Compact</span>
              {density === 'compact' && <Check className="w-3.5 h-3.5 text-violet-400" />}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">High-density view for multi-monitor / heavy workspaces.</p>
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
