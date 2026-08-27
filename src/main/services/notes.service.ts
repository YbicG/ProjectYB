import fs from 'fs';
import path from 'path';
import { getStore } from '../ipc/store.ipc';

export interface ProjectNoteData {
  content: string;
  updatedAt: number;
  filePath?: string;
}

export class NotesService {
  private readonly NOTES_FILENAME = '.projectyb-notes.md';

  /**
   * Reads markdown notes for a project.
   * Looks for .projectyb-notes.md in the project directory first.
   * If not found, falls back to electron-store.
   */
  async readProjectNotes(projectPath: string): Promise<ProjectNoteData> {
    const filePath = path.join(projectPath, this.NOTES_FILENAME);

    try {
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const stat = await fs.promises.stat(filePath);
        return {
          content,
          updatedAt: stat.mtimeMs,
          filePath
        };
      }
    } catch (err) {
      console.warn(`[NotesService] Error reading file notes at ${filePath}:`, err);
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
      content: '# Project Notes\n\n- [ ] Initial project setup\n- [ ] Review documentation\n',
      updatedAt: Date.now()
    };
  }

  /**
   * Saves markdown notes for a project.
   * Writes directly to .projectyb-notes.md in the project directory and caches in store.
   */
  async writeProjectNotes(projectPath: string, content: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const filePath = path.join(projectPath, this.NOTES_FILENAME);

    try {
      if (fs.existsSync(projectPath)) {
        await fs.promises.writeFile(filePath, content, 'utf-8');
      }

      // Also persist in electron-store as cache
      const store = await getStore();
      const storedNotes = (store.get('projectNotes', {}) as Record<string, ProjectNoteData>) || {};
      storedNotes[projectPath] = {
        content,
        updatedAt: Date.now(),
        filePath: fs.existsSync(filePath) ? filePath : undefined
      };
      store.set('projectNotes', storedNotes);

      return { success: true, filePath };
    } catch (err: any) {
      console.error(`[NotesService] Error writing notes to ${filePath}:`, err);
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
