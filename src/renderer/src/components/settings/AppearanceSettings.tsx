import React from 'react';
import { Palette, Check, LayoutGrid, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useThemeStore, AccentColor, Density } from '@renderer/stores/useThemeStore';
import { cn } from '@renderer/lib/utils';

export const AppearanceSettings: React.FC = () => {
  const { accentColor, density, setAccentColor, setDensity } = useThemeStore();

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
          Appearance & Theme
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Customize ProjectYB accent colors, UI density, and visual theme.
        </p>
      </div>

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

      {/* ── Live Theme Preview Showcase ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Live Theme Preview
          </CardTitle>
          <CardDescription className="text-xs">
            Preview how badges, buttons, active highlights, and controls look with the current theme.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-600 hover:bg-violet-600 text-white font-mono text-xs">
                  Active Badge
                </Badge>
                <Badge variant="outline" className="border-violet-500 text-violet-400 font-mono text-xs">
                  Outline Highlight
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7">
                  Primary Action
                </Button>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:border-violet-500 hover:text-violet-300 text-xs h-7">
                  Secondary Action
                </Button>
              </div>
            </div>

            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Navigation Tab Active Indicator:</span>
              <span className="text-violet-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                Active Tab Accent
              </span>
            </div>
          </div>
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
