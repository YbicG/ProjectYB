import fs from 'fs';
import path from 'path';
import { getStore } from '../ipc/store.ipc';

export interface ProjectNoteData {
  content: string;
  updatedAt: number;
  filePath?: string;
}

export class NotesService {
  /**
   * Resolves the notes file path for a project, prioritizing .ybicg/notes.md.
   */
  private async getNotesFilePath(projectPath: string): Promise<string | null> {
    const ybicgNotes = path.join(projectPath, '.ybicg', 'notes.md');
    if (fs.existsSync(ybicgNotes)) return ybicgNotes;

    const legacyNotes = path.join(projectPath, '.projectyb-notes.md');
    if (fs.existsSync(legacyNotes)) return legacyNotes;

    return null;
  }

  /**
   * Reads markdown notes for a project.
   * Looks for .ybicg/notes.md or .projectyb-notes.md first, then falls back to electron-store.
   */
  async readProjectNotes(projectPath: string): Promise<ProjectNoteData> {
    const filePath = await this.getNotesFilePath(projectPath);

    if (filePath) {
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const stat = await fs.promises.stat(filePath);
        return {
          content,
          updatedAt: stat.mtimeMs,
          filePath
        };
      } catch (err) {
        console.warn(`[NotesService] Error reading file notes at ${filePath}:`, err);
      }
    }

    // Fallback to electron-store
    try {
      const store = await getStore();
      const storedNotes = (store.get('projectNotes', {}) as Record<string, ProjectNoteData>) || {};
      const note = storedNotes[projectPath];
      if (note) {
        return note;
      }
    } catch (err) {
      console.warn('[NotesService] Error reading store notes:', err);
    }

    return {
      content: '# Project Notes & Tasks\n\n- [ ] Initial project setup\n- [ ] Review documentation\n',
      updatedAt: Date.now()
    };
  }

  /**
   * Saves markdown notes for a project.
   * Writes to <projectPath>/.ybicg/notes.md and caches in store.
   */
  async writeProjectNotes(projectPath: string, content: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const ybicgDir = path.join(projectPath, '.ybicg');
    const targetFilePath = path.join(ybicgDir, 'notes.md');

    try {
      if (fs.existsSync(projectPath)) {
        if (!fs.existsSync(ybicgDir)) {
          await fs.promises.mkdir(ybicgDir, { recursive: true });
        }
        await fs.promises.writeFile(targetFilePath, content, 'utf-8');
      }

      // Also persist in electron-store as cache
      const store = await getStore();
      const storedNotes = (store.get('projectNotes', {}) as Record<string, ProjectNoteData>) || {};
      storedNotes[projectPath] = {
        content,
        updatedAt: Date.now(),
        filePath: fs.existsSync(targetFilePath) ? targetFilePath : undefined
      };
      store.set('projectNotes', storedNotes);

      return { success: true, filePath: targetFilePath };
    } catch (err: any) {
      console.error(`[NotesService] Error writing notes to ${targetFilePath}:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Global Scratchpad operations
   */
  async getGlobalScratchpad(): Promise<string> {
    try {
      const store = await getStore();
      return (store.get('globalScratchpad', '# 🚀 Global Scratchpad\n\nQuick notes, snippets, and commands across all projects...\n') as string);
    } catch {
      return '';
    }
  }

  async setGlobalScratchpad(content: string): Promise<boolean> {
    try {
      const store = await getStore();
      store.set('globalScratchpad', content);
      return true;
    } catch {
      return false;
    }
  }
}

export const notesService = new NotesService();
