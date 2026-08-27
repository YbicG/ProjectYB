import React, { useState, useEffect } from 'react';
import { FolderPlus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useProjectStore } from '@renderer/stores/useProjectStore';

const DEFAULT_SCAN_PATHS = ['D:\\Code'];

export const GeneralSettings: React.FC = () => {
  const [scanPaths, setScanPaths] = useState<string[]>(DEFAULT_SCAN_PATHS);
  const [newPath, setNewPath] = useState('');
  const [defaultShell, setDefaultShell] = useState('powershell.exe');
  const [autoRestore, setAutoRestore] = useState(true);
  const { scanProjects } = useProjectStore();

  // Load settings from store on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.api?.store) return;
      try {
        const saved = await window.api.store.get('scanPaths');
        if (saved && Array.isArray(saved) && saved.length > 0) setScanPaths(saved);
        const shell = await window.api.store.get('defaultShell');
        if (shell) setDefaultShell(shell as string);
        const restore = await window.api.store.get('autoRestore');
        if (restore !== undefined) setAutoRestore(restore as boolean);
      } catch {}
    };
    loadSettings();
  }, []);

  const saveScanPaths = async (paths: string[]) => {
    setScanPaths(paths);
    if (window.api?.store) {
      await window.api.store.set('scanPaths', paths);
    }
  };

  const addPath = async () => {
    if (window.api?.window) {
      // Use Electron dialog to pick a folder
      try {
        const result = await (window as any).api.dialog?.showOpenDialog?.({
          properties: ['openDirectory']
        });
        if (result && !result.canceled && result.filePaths?.[0]) {
          const selected = result.filePaths[0];
          if (!scanPaths.includes(selected)) {
            await saveScanPaths([...scanPaths, selected]);
          }
          return;
        }
      } catch {}
    }
    
    // Fallback: use the text input
    if (newPath.trim() && !scanPaths.includes(newPath.trim())) {
      await saveScanPaths([...scanPaths, newPath.trim()]);
      setNewPath('');
    }
  };

  const removePath = async (pathToRemove: string) => {
    const updated = scanPaths.filter(p => p !== pathToRemove);
    await saveScanPaths(updated.length > 0 ? updated : DEFAULT_SCAN_PATHS);
  };

  const handleShellChange = async (shell: string) => {
    setDefaultShell(shell);
    if (window.api?.store) {
      await window.api.store.set('defaultShell', shell);
    }
  };

  const handleAutoRestoreChange = async (checked: boolean) => {
    setAutoRestore(checked);
    if (window.api?.store) {
      await window.api.store.set('autoRestore', checked);
    }
  };

  const rescanProjects = () => {
    scanProjects();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle>Scan Paths</CardTitle>
          <CardDescription>Directories to scan for projects automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {scanPaths.map(path => (
              <div key={path} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-md">
                <Input value={path} readOnly className="h-8 bg-transparent border-0 focus-visible:ring-0 text-zinc-300" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-red-500"
                  onClick={() => removePath(path)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter path or click Add to browse..."
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPath()}
              className="h-9 bg-zinc-900 border-zinc-800 text-zinc-300"
            />
            <Button
              variant="outline"
              className="border-dashed border-zinc-700 hover:border-zinc-500 shrink-0"
              onClick={addPath}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <Button variant="secondary" className="w-full" onClick={rescanProjects}>
            Re-scan Projects
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>General application behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md">
            <div>
              <p className="font-medium text-sm text-zinc-200">Default Shell</p>
              <p className="text-xs text-zinc-500">The shell to use when opening new terminals.</p>
            </div>
            <select
              value={defaultShell}
              onChange={(e) => handleShellChange(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="powershell.exe">PowerShell</option>
              <option value="cmd.exe">Command Prompt</option>
              <option value="bash">Git Bash</option>
              <option value="wsl.exe">WSL</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md">
            <div>
              <p className="font-medium text-sm text-zinc-200">Auto-restore Terminals</p>
              <p className="text-xs text-zinc-500">Restore terminal sessions on app startup.</p>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4 accent-violet-500 rounded"
              checked={autoRestore}
              onChange={(e) => handleAutoRestoreChange(e.target.checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
