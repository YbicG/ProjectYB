import { create } from 'zustand';
import { toast } from 'sonner';
import type { ProjectNote, TaskItem } from '../types/notes';

interface NotesState {
  currentPath: string | null;
  currentNote: ProjectNote | null;
  isLoading: boolean;
  isSaving: boolean;
  globalScratchpad: string;
  scratchpadModalOpen: boolean;

  // Actions
  loadNotes: (projectPath: string) => Promise<void>;
  updateContent: (content: string) => void;
  saveCurrentNotes: () => Promise<boolean>;
  toggleTask: (lineIndex: number, completed: boolean) => Promise<void>;
  loadGlobalScratchpad: () => Promise<void>;
  saveGlobalScratchpad: (content: string) => Promise<void>;
  setScratchpadModalOpen: (open: boolean) => void;
}

let globalScratchpadSaveTimer: ReturnType<typeof setTimeout> | null = null;

export const useNotesStore = create<NotesState>((set, get) => ({
  currentPath: null,
  currentNote: null,
  isLoading: false,
  isSaving: false,
  globalScratchpad: '',
  scratchpadModalOpen: false,

  loadNotes: async (projectPath: string) => {
    if (!window.api?.notes) return;
    set({ isLoading: true, currentPath: projectPath });
    try {
      const data = await window.api.notes.read(projectPath);
      set({
        currentNote: {
          projectPath,
          content: data.content,
          updatedAt: data.updatedAt,
          filePath: data.filePath,
          isDirty: false
        }
      });
    } catch (err: any) {
      toast.error(`Failed to load notes: ${err.message}`);
    } finally {
      set({ isLoading: false });
    }
  },

  updateContent: (content: string) => {
    const { currentNote } = get();
    if (!currentNote) return;
    set({
      currentNote: {
        ...currentNote,
        content,
        isDirty: true
      }
    });
  },

  saveCurrentNotes: async () => {
    const { currentNote, currentPath } = get();
    if (!currentNote || !currentPath || !window.api?.notes) return false;

    set({ isSaving: true });
    try {
      const res = await window.api.notes.write(currentPath, currentNote.content);
      if (res.success) {
        set({
          currentNote: {
            ...currentNote,
            updatedAt: Date.now(),
            filePath: res.filePath,
            isDirty: false
          }
        });
        toast.success('Notes saved successfully!');
        return true;
      } else {
        toast.error(`Save failed: ${res.error}`);
        return false;
      }
    } catch (err: any) {
      toast.error(`Save error: ${err.message}`);
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  toggleTask: async (lineIndex: number, completed: boolean) => {
    const { currentNote, saveCurrentNotes } = get();
    if (!currentNote) return;

    const lines = currentNote.content.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const targetLine = lines[lineIndex];
    if (completed) {
      lines[lineIndex] = targetLine.replace(/- \[[ xX]\]/, '- [x]');
    } else {
      lines[lineIndex] = targetLine.replace(/- \[[ xX]\]/, '- [ ]');
    }

    const updatedContent = lines.join('\n');
    set({
      currentNote: {
        ...currentNote,
        content: updatedContent,
        isDirty: true
      }
    });

    await saveCurrentNotes();
  },

  loadGlobalScratchpad: async () => {
    if (!window.api?.notes) return;
    try {
      const content = await window.api.notes.getGlobal();
      set({ globalScratchpad: content || '' });
    } catch {}
  },

  saveGlobalScratchpad: async (content: string) => {
    set({ globalScratchpad: content });
    if (!window.api?.notes) return;
    
    if (globalScratchpadSaveTimer) {
      clearTimeout(globalScratchpadSaveTimer);
    }
    globalScratchpadSaveTimer = setTimeout(async () => {
      try {
        await window.api?.notes?.setGlobal(content);
      } catch {}
    }, 300);
  },

  setScratchpadModalOpen: (open: boolean) => set({ scratchpadModalOpen: open })
}));
