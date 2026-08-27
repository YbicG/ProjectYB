import { create } from 'zustand';

export type AccentColor = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'oled';
export type Density = 'comfortable' | 'compact';
export type TerminalCursorStyle = 'block' | 'underline' | 'bar';

interface ThemeState {
  accentColor: AccentColor;
  density: Density;
  terminalFontFamily: string;
  terminalFontSize: number;
  terminalCursorStyle: TerminalCursorStyle;
  terminalCursorBlink: boolean;
  shortcutsModalOpen: boolean;

  // Actions
  setAccentColor: (color: AccentColor) => Promise<void>;
  setDensity: (density: Density) => Promise<void>;
  setTerminalFontFamily: (font: string) => Promise<void>;
  setTerminalFontSize: (size: number) => Promise<void>;
  setTerminalCursorStyle: (style: TerminalCursorStyle) => Promise<void>;
  setTerminalCursorBlink: (blink: boolean) => Promise<void>;
  setShortcutsModalOpen: (open: boolean) => void;
  loadPreferences: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  accentColor: 'violet',
  density: 'comfortable',
  terminalFontFamily: 'Consolas, "Cascadia Code", "Courier New", monospace',
  terminalFontSize: 13,
  terminalCursorStyle: 'block',
  terminalCursorBlink: true,
  shortcutsModalOpen: false,

  setAccentColor: async (color: AccentColor) => {
    set({ accentColor: color });
    document.documentElement.dataset.theme = color;
    try {
      await window.api?.store?.set('theme:accentColor', color);
    } catch {}
  },

  setDensity: async (density: Density) => {
    set({ density });
    document.documentElement.dataset.density = density;
    try {
      await window.api?.store?.set('theme:density', density);
    } catch {}
  },

  setTerminalFontFamily: async (font: string) => {
    set({ terminalFontFamily: font });
    try {
      await window.api?.store?.set('terminal:fontFamily', font);
    } catch {}
  },

  setTerminalFontSize: async (size: number) => {
    set({ terminalFontSize: size });
    try {
      await window.api?.store?.set('terminal:fontSize', size);
    } catch {}
  },

  setTerminalCursorStyle: async (style: TerminalCursorStyle) => {
    set({ terminalCursorStyle: style });
    try {
      await window.api?.store?.set('terminal:cursorStyle', style);
    } catch {}
  },

  setTerminalCursorBlink: async (blink: boolean) => {
    set({ terminalCursorBlink: blink });
    try {
      await window.api?.store?.set('terminal:cursorBlink', blink);
    } catch {}
  },

  setShortcutsModalOpen: (open: boolean) => set({ shortcutsModalOpen: open }),

  loadPreferences: async () => {
    if (!window.api?.store) return;
    try {
      const color = (await window.api.store.get('theme:accentColor')) as AccentColor;
      const density = (await window.api.store.get('theme:density')) as Density;
      const font = (await window.api.store.get('terminal:fontFamily')) as string;
      const size = (await window.api.store.get('terminal:fontSize')) as number;
      const cursor = (await window.api.store.get('terminal:cursorStyle')) as TerminalCursorStyle;
      const blink = (await window.api.store.get('terminal:cursorBlink')) as boolean;

      if (color) {
        set({ accentColor: color });
        document.documentElement.dataset.theme = color;
      }
      if (density) {
        set({ density });
        document.documentElement.dataset.density = density;
      }
      if (font) set({ terminalFontFamily: font });
      if (size) set({ terminalFontSize: size });
      if (cursor) set({ terminalCursorStyle: cursor });
      if (typeof blink === 'boolean') set({ terminalCursorBlink: blink });
    } catch {}
  }
}));
