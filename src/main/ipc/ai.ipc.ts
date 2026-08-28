import { ipcMain, BrowserWindow } from 'electron';
import { aiService, AiProviderConfig } from '../services/ai.service';

export function setupAiIpc(mainWindow: BrowserWindow) {
  aiService.setMainWindow(mainWindow);

  ipcMain.handle('ai:checkOllamaStatus', async (_, baseUrl?: string) => {
    return aiService.checkOllamaStatus(baseUrl);
  });

  ipcMain.handle(
    'ai:generateCompletion',
    async (_, prompt: string, systemPrompt: string, config: AiProviderConfig) => {
      return aiService.generateCompletion(prompt, systemPrompt, config);
    }
  );

  ipcMain.handle(
    'ai:diagnoseError',
    async (_, errorLogs: string, command: string, config: AiProviderConfig) => {
      return aiService.diagnoseError(errorLogs, command, config);
    }
  );

  ipcMain.handle('ai:generateCommitMessage', async (_, diffText: string, config: AiProviderConfig) => {
    return aiService.generateCommitMessage(diffText, config);
  });
}
