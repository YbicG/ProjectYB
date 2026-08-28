import { create } from 'zustand';
import type { MobileCompanionStatus, MobileCredentials } from '../types/mobile';
import { toast } from 'sonner';

interface MobileState {
  status: MobileCompanionStatus | null;
  credentials: MobileCredentials;
  isLoading: boolean;
  isStarting: boolean;
  modalOpen: boolean;

  // Actions
  fetchStatus: () => Promise<void>;
  fetchCredentials: () => Promise<void>;
  startMobileRemote: (options: {
    tunnelType?: 'quick' | 'named';
    namedToken?: string;
    customHostname?: string;
    port?: number;
  }) => Promise<boolean>;
  stopMobileRemote: () => Promise<boolean>;
  updateCredentials: (username: string, rawPass: string) => Promise<boolean>;
  setModalOpen: (open: boolean) => void;
}

export const useMobileStore = create<MobileState>((set, get) => ({
  status: null,
  credentials: {
    username: 'admin',
    rawPasswordDisplay: 'projectyb123'
  },
  isLoading: false,
  isStarting: false,
  modalOpen: false,

  fetchStatus: async () => {
    try {
      if (window.api?.mobile) {
        const status = await window.api.mobile.getStatus();
        set({ status });
      }
    } catch (err) {
      console.error('Failed to fetch mobile status:', err);
    }
  },

  fetchCredentials: async () => {
    try {
      if (window.api?.mobile) {
        const credentials = await window.api.mobile.getCredentials();
        if (credentials) {
          set({ credentials });
        }
      }
    } catch (err) {
      console.error('Failed to fetch mobile credentials:', err);
    }
  },

  startMobileRemote: async (options) => {
    set({ isStarting: true });
    try {
      if (!window.api?.mobile) throw new Error('Mobile API not available');
      const res = await window.api.mobile.start(options);
      if (res.success) {
        set({ status: res.status, isStarting: false });
        toast.success(`Mobile Remote Companion started! Connect on your phone.`);
        return true;
      } else {
        toast.error(`Failed to launch Mobile Remote: ${res.error}`);
        set({ isStarting: false });
        return false;
      }
    } catch (err: any) {
      toast.error(`Mobile start error: ${err.message}`);
      set({ isStarting: false });
      return false;
    }
  },

  stopMobileRemote: async () => {
    try {
      if (!window.api?.mobile) return false;
      const ok = await window.api.mobile.stop();
      if (ok) {
        toast.info('Mobile Remote Companion stopped');
        await get().fetchStatus();
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(`Stop error: ${err.message}`);
      return false;
    }
  },

  updateCredentials: async (username, rawPass) => {
    try {
      if (!window.api?.mobile) return false;
      await window.api.mobile.setCredentials(username, rawPass);
      set({ credentials: { username, rawPasswordDisplay: rawPass } });
      toast.success('Mobile Remote credentials updated!');
      return true;
    } catch (err: any) {
      toast.error(`Credentials error: ${err.message}`);
      return false;
    }
  },

  setModalOpen: (open) => {
    set({ modalOpen: open });
    if (open) {
      get().fetchStatus();
      get().fetchCredentials();
    }
  }
}));
