import { ipcMain } from 'electron';

let store: any = null;

async function getStore() {
  if (!store) {
    const { default: Store } = await import('electron-store');
    store = new Store();
  }
  return store;
}

export async function setupStoreIpc() {
  const s = await getStore();
  ipcMain.handle('store:get', (_, key: string, defaultValue?: any) => s.get(key, defaultValue));
  ipcMain.on('store:set', (_, key: string, value: any) => s.set(key, value));
  ipcMain.on('store:delete', (_, key: string) => s.delete(key));
}

export { getStore };
