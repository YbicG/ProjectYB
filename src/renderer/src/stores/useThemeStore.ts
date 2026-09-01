import { create } from 'zustand';

export type AccentColor = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'oled';
export type Density = 'comfortable' | 'compact';
export type TerminalCursorStyle = 'block' | 'underline' | 'bar';
export type UIMode = 'classic' | 'modern';

interface ThemeState {
  uiMode: UIMode;
  accentColor: AccentColor;
  density: Density;
  terminalFontFamily: string;
  terminalFontSize: number;
  terminalCursorStyle: TerminalCursorStyle;
  terminalCursorBlink: boolean;
  shortcutsModalOpen: boolean;

  // Modern Shell State
  isSidebarCollapsed: boolean;
  isTerminalDockOpen: boolean;
  terminalDockHeight: number;

  // Actions
  setUiMode: (mode: UIMode) => Promise<void>;
  setAccentColor: (color: AccentColor) => Promise<void>;
  setDensity: (density: Density) => Promise<void>;
  setTerminalFontFamily: (font: string) => Promise<void>;
  setTerminalFontSize: (size: number) => Promise<void>;
  setTerminalCursorStyle: (style: TerminalCursorStyle) => Promise<void>;
  setTerminalCursorBlink: (blink: boolean) => Promise<void>;
  setShortcutsModalOpen: (open: boolean) => void;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => Promise<void>;
  toggleTerminalDock: () => void;
  setTerminalDockOpen: (open: boolean) => void;
  setTerminalDockHeight: (height: number) => Promise<void>;

  loadPreferences: () => Promise<void>;
}

export const applyThemeToDOM = (theme: AccentColor, density: Density, uiMode: UIMode = 'modern') => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-density', density);
    document.documentElement.setAttribute('data-ui-mode', uiMode);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
    document.documentElement.dataset.uiMode = uiMode;
  }
};

// Initial DOM attribute setup
if (typeof document !== 'undefined') {
  applyThemeToDOM('violet', 'comfortable', 'modern');
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  uiMode: 'modern',
  accentColor: 'violet',
  density: 'comfortable',
  terminalFontFamily: 'Consolas, "Cascadia Code", "Courier New", monospace',
  terminalFontSize: 13,
  terminalCursorStyle: 'block',
  terminalCursorBlink: true,
  shortcutsModalOpen: false,

  isSidebarCollapsed: false,
  isTerminalDockOpen: false,
  terminalDockHeight: 320,

  setUiMode: async (mode: UIMode) => {
    set({ uiMode: mode });
    applyThemeToDOM(get().accentColor, get().density, mode);
    try {
      await window.api?.store?.set('theme:uiMode', mode);
    } catch {}
  },

  setAccentColor: async (color: AccentColor) => {
    set({ accentColor: color });
    applyThemeToDOM(color, get().density, get().uiMode);
    try {
      await window.api?.store?.set('theme:accentColor', color);
    } catch {}
  },

  setDensity: async (density: Density) => {
    set({ density });
    applyThemeToDOM(get().accentColor, density, get().uiMode);
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

  toggleSidebar: () => {
    const next = !get().isSidebarCollapsed;
    set({ isSidebarCollapsed: next });
    try {
      window.api?.store?.set('theme:sidebarCollapsed', next);
    } catch {}
  },

  setSidebarCollapsed: async (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed });
    try {
      await window.api?.store?.set('theme:sidebarCollapsed', collapsed);
    } catch {}
  },

  toggleTerminalDock: () => set((s) => ({ isTerminalDockOpen: !s.isTerminalDockOpen })),
  setTerminalDockOpen: (open: boolean) => set({ isTerminalDockOpen: open }),

  setTerminalDockHeight: async (height: number) => {
    const clamped = Math.max(160, Math.min(height, window.innerHeight - 100));
    set({ terminalDockHeight: clamped });
    try {
      await window.api?.store?.set('theme:dockHeight', clamped);
    } catch {}
  },

  loadPreferences: async () => {
    if (!window.api?.store) return;
    try {
      const mode = ((await window.api.store.get('theme:uiMode')) as UIMode) || 'modern';
      const color = ((await window.api.store.get('theme:accentColor')) as AccentColor) || 'violet';
      const density = ((await window.api.store.get('theme:density')) as Density) || 'comfortable';
      const font = (await window.api.store.get('terminal:fontFamily')) as string;
      const size = (await window.api.store.get('terminal:fontSize')) as number;
      const cursor = (await window.api.store.get('terminal:cursorStyle')) as TerminalCursorStyle;
      const blink = (await window.api.store.get('terminal:cursorBlink')) as boolean;
      const sidebarCollapsed = (await window.api.store.get('theme:sidebarCollapsed')) as boolean;
      const dockHeight = (await window.api.store.get('theme:dockHeight')) as number;

      set({
        uiMode: mode,
        accentColor: color,
        density,
        isSidebarCollapsed: Boolean(sidebarCollapsed),
        terminalDockHeight: dockHeight || 320
      });
      applyThemeToDOM(color, density, mode);

      if (font) set({ terminalFontFamily: font });
      if (size) set({ terminalFontSize: size });
      if (cursor) set({ terminalCursorStyle: cursor });
      if (typeof blink === 'boolean') set({ terminalCursorBlink: blink });
    } catch {}
  }
}));
