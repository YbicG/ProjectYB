import React, { useState, useEffect } from 'react';
import { FolderPlus, Trash2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useProjectStore } from '@renderer/stores/useProjectStore';

const DEFAULT_SCAN_PATHS = ['D:\\Code'];

export const GeneralSettings: React.FC = () => {
  const [scanPaths, setScanPaths] = useState<string[]>(DEFAULT_SCAN_PATHS);
  const [scanPathModes, setScanPathModes] = useState<Record<string, 'git' | 'all'>>({});
  const [newPath, setNewPath] = useState('');
  
  const [manualProjects, setManualProjects] = useState<string[]>([]);
  const [newManualPath, setNewManualPath] = useState('');
  
  const [defaultShell, setDefaultShell] = useState('powershell.exe');
  const [autoRestore, setAutoRestore] = useState(true);
  const { scanProjects, addManualProject } = useProjectStore();

  // Load settings from store on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.api?.store) return;
      try {
        const saved = await window.api.store.get('scanPaths');
        if (saved && Array.isArray(saved) && saved.length > 0) setScanPaths(saved);
        
        const modes = await window.api.store.get('scanPathModes');
        if (modes) setScanPathModes(modes as Record<string, 'git' | 'all'>);
        
        const manual = await window.api.store.get('manualProjects');
        if (manual && Array.isArray(manual)) setManualProjects(manual);
        
        const shell = await window.api.store.get('defaultShell');
        if (shell) setDefaultShell(shell as string);
        
        const restore = await window.api.store.get('autoRestore');
        if (restore !== undefined) setAutoRestore(restore as boolean);
      } catch {}
    };
    loadSettings();
  }, []);

  const saveScanPaths = async (paths: string[], modes: Record<string, 'git' | 'all'>) => {
    setScanPaths(paths);
    setScanPathModes(modes);
    if (window.api?.store) {
      await window.api.store.set('scanPaths', paths);
      await window.api.store.set('scanPathModes', modes);
      await window.api.store.set('scanMode', 'git'); // default global fallback
    }
  };

  const addPath = async (mode: 'git' | 'all') => {
    let pathToAdd = newPath.trim();
    
    if (!pathToAdd && window.api?.window) {
      // Use Electron dialog to pick a folder
      try {
        const result = await (window as any).api.dialog?.showOpenDialog?.({
          properties: ['openDirectory']
        });
        if (result && !result.canceled && result.filePaths?.[0]) {
          pathToAdd = result.filePaths[0];
        }
      } catch {}
    }
    
    if (pathToAdd && !scanPaths.includes(pathToAdd)) {
      const newPaths = [...scanPaths, pathToAdd];
      const newModes = { ...scanPathModes, [pathToAdd]: mode };
      await saveScanPaths(newPaths, newModes);
      setNewPath('');
      scanProjects();
    }
  };

  const removePath = async (pathToRemove: string) => {
    const updated = scanPaths.filter(p => p !== pathToRemove);
    const updatedModes = { ...scanPathModes };
    delete updatedModes[pathToRemove];
    await saveScanPaths(updated.length > 0 ? updated : DEFAULT_SCAN_PATHS, updatedModes);
    scanProjects();
  };

  const addManual = async () => {
    const pathToAdd = newManualPath.trim();
    if (pathToAdd && !manualProjects.includes(pathToAdd)) {
      const updated = [...manualProjects, pathToAdd];
      setManualProjects(updated);
      if (window.api?.store) {
        await window.api.store.set('manualProjects', updated);
      }
      setNewManualPath('');
      await addManualProject(pathToAdd);
      scanProjects();
    }
  };

  const removeManual = async (pathToRemove: string) => {
    const updated = manualProjects.filter(p => p !== pathToRemove);
    setManualProjects(updated);
    if (window.api?.store) {
      await window.api.store.set('manualProjects', updated);
    }
    scanProjects();
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
                <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded">
                  {scanPathModes[path] || 'git'}
                </span>
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
              className="h-9 bg-zinc-900 border-zinc-800 text-zinc-300 flex-1"
            />
            <Button
              variant="outline"
              className="border-dashed border-zinc-700 hover:border-zinc-500 shrink-0"
              onClick={() => addPath('git')}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Git Projects
            </Button>
            <Button
              variant="outline"
              className="border-dashed border-zinc-700 hover:border-zinc-500 shrink-0"
              onClick={() => addPath('all')}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              All Subfolders
            </Button>
          </div>

          <Button variant="secondary" className="w-full" onClick={rescanProjects}>
            Re-scan Projects
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle>Manual Projects</CardTitle>
          <CardDescription>Manually added project folders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {manualProjects.map(path => (
              <div key={path} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-md">
                <Input value={path} readOnly className="h-8 bg-transparent border-0 focus-visible:ring-0 text-zinc-300" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-red-500"
                  onClick={() => removeManual(path)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter precise project path..."
              value={newManualPath}
              onChange={(e) => setNewManualPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManual()}
              className="h-9 bg-zinc-900 border-zinc-800 text-zinc-300 flex-1"
            />
            <Button
              variant="outline"
              className="border-dashed border-zinc-700 hover:border-zinc-500 shrink-0"
              onClick={addManual}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </div>
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
