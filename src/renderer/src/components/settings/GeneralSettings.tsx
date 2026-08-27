import React from 'react';
import { Settings, FolderPlus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export const GeneralSettings: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle>Scan Paths</CardTitle>
          <CardDescription>Directories to scan for projects automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {['D:\Code\Repositories', 'C:\Users\djcoo\Projects'].map(path => (
              <div key={path} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-md">
                <Input value={path} readOnly className="h-8 bg-transparent border-0 focus-visible:ring-0" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full border-dashed border-zinc-700 hover:border-zinc-500">
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Scan Path
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
            <select className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500">
              <option>PowerShell</option>
              <option>Command Prompt</option>
              <option>Git Bash</option>
              <option>WSL</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md">
            <div>
              <p className="font-medium text-sm text-zinc-200">Auto-restore Terminals</p>
              <p className="text-xs text-zinc-500">Restore terminal sessions on app startup.</p>
            </div>
            <input type="checkbox" className="w-4 h-4 accent-violet-500 rounded" defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
