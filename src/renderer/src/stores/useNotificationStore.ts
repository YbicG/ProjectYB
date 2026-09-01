import { create } from 'zustand';
import { toast } from 'sonner';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory =
  | 'system'
  | 'services'
  | 'git'
  | 'projects'
  | 'terminals'
  | 'dependencies'
  | 'docker'
  | 'network';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  time: number;
  read: boolean;
  actionTab?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  showToasts: boolean;
  showNative: boolean;
  sound: boolean;
  categories: {
    system: boolean;
    services: boolean;
    git: boolean;
    projects: boolean;
    terminals: boolean;
    dependencies: boolean;
    docker: boolean;
    network: boolean;
  };
}

export interface NotifyOptions {
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  actionTab?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  settings: NotificationSettings;
  settingsLoaded: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  toggleCategory: (category: NotificationCategory) => Promise<void>;
  notify: (options: NotifyOptions) => void;
  addNotification: (
    title: string,
    message: string,
    type?: NotificationType,
    category?: NotificationCategory
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  showToasts: true,
  showNative: true,
  sound: false,
  categories: {
    system: true,
    services: true,
    git: true,
    projects: true,
    terminals: true,
    dependencies: true,
    docker: true,
    network: true
  }
};

// Pure Web Audio API tone synthesizer (reusable singleton AudioContext, zero leaks)
let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playNotificationSound(type: NotificationType = 'info') {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.04, now);

    if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(349.23, now); // F4
      osc.frequency.setValueAtTime(261.63, now + 0.1); // C4
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch {
    // AudioContext blocked or not allowed yet
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    {
      id: 'startup',
      title: 'ProjectYB Ready',
      message: 'Workspace initialized and active',
      type: 'info',
      category: 'system',
      time: Date.now(),
      read: false
    }
  ],
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,

  loadSettings: async () => {
    try {
      if (window.api?.store) {
        const saved = (await window.api.store.get('notifications:settings')) as Partial<NotificationSettings> | undefined;
        if (saved) {
          set({
            settings: {
              ...DEFAULT_SETTINGS,
              ...saved,
              categories: {
                ...DEFAULT_SETTINGS.categories,
                ...(saved.categories || {})
              }
            },
            settingsLoaded: true
          });
          return;
        }
      }
      set({ settingsLoaded: true });
    } catch (err) {
      console.error('[useNotificationStore] Failed to load notification settings:', err);
      set({ settingsLoaded: true });
    }
  },

  updateSettings: async (partial) => {
    const current = get().settings;
    const updated: NotificationSettings = {
      ...current,
      ...partial,
      categories: {
        ...current.categories,
        ...(partial.categories || {})
      }
    };
    set({ settings: updated });
    try {
      if (window.api?.store) {
        await window.api.store.set('notifications:settings', updated);
      }
    } catch (err) {
      console.error('[useNotificationStore] Failed to persist settings:', err);
    }
  },

  toggleCategory: async (category) => {
    const current = get().settings;
    const nextVal = !current.categories[category];
    const updatedCategories = {
      ...current.categories,
      [category]: nextVal
    };
    const updated: NotificationSettings = {
      ...current,
      categories: updatedCategories
    };
    set({ settings: updated });
    try {
      if (window.api?.store) {
        await window.api.store.set('notifications:settings', updated);
      }
    } catch (err) {
      console.error('[useNotificationStore] Failed to persist category toggle:', err);
    }
  },

  notify: ({ title, message, type = 'info', category = 'system', actionTab }) => {
    const { settings } = get();

    // Check if master notifications are enabled
    if (!settings.enabled) return;

    // Check if this specific category is enabled
    if (settings.categories[category] === false) return;

    // Deduplicate rapid identical notifications within 1.5 seconds
    const existing = get().notifications[0];
    if (existing && existing.title === title && existing.message === message && Date.now() - existing.time < 1500) {
      return;
    }

    const newNotification: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      message,
      type,
      category,
      time: Date.now(),
      read: false,
      actionTab
    };

    // 1. Add to In-App History (limit to 50 items to keep memory ultralight)
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50)
    }));

    // 2. Play sound if configured
    if (settings.sound) {
      playNotificationSound(type);
    }

    // 3. Show In-App Toast
    if (settings.showToasts) {
      if (type === 'success') {
        toast.success(title, { description: message });
      } else if (type === 'error') {
        toast.error(title, { description: message });
      } else if (type === 'warning') {
        toast.warning(title, { description: message });
      } else {
        toast.info(title, { description: message });
      }
    }

    // 4. Show OS Desktop Notification
    if (settings.showNative && window.api?.system?.showNotification) {
      window.api.system.showNotification(title, message).catch(() => {});
    }
  },

  addNotification: (title, message, type = 'info', category = 'system') => {
    get().notify({ title, message, type, category });
  },

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    })),

  deleteNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    })),

  clearAll: () => set({ notifications: [] })
}));
