import { ipcMain, BrowserWindow } from 'electron';
import { pipelineService, Pipeline } from '../services/pipeline.service';

export function setupPipelineIpc(mainWindow: BrowserWindow) {
  pipelineService.setMainWindow(mainWindow);

  ipcMain.handle('pipeline:run', async (_, pipeline: Pipeline, cwd?: string) => {
    return pipelineService.runPipeline(pipeline, cwd);
  });

  ipcMain.handle('pipeline:stop', async (_, pipelineId: string) => {
    return pipelineService.stopPipeline(pipelineId);
  });
}
