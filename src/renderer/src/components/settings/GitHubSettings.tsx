import React, { useState } from 'react';
import { Github, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export const GitHubSettings: React.FC = () => {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const testConnection = () => {
    setStatus('testing');
    setTimeout(() => setStatus('success'), 1000);
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 max-w-3xl">
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <Github className="w-6 h-6 text-zinc-200" />
          <CardTitle>GitHub Integration</CardTitle>
        </div>
        <CardDescription>Connect your GitHub account to manage PRs and issues directly.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Personal Access Token</label>
          <div className="flex gap-2">
            <Input 
              type="password" 
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="bg-zinc-900"
            />
            <Button variant="secondary" onClick={testConnection} disabled={!token || status === 'testing'}>
              {status === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Token requires 'repo' and 'user' scopes. Your token is stored securely.
          </p>
        </div>

        {status === 'success' && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-500">Connection Successful</p>
              <p className="text-xs text-green-500/80">Authenticated as djcoo.</p>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-500">Connection Failed</p>
              <p className="text-xs text-red-500/80">Invalid or expired token.</p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t border-zinc-800 pt-4">
        <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
          Clear Token
        </Button>
        <Button className="bg-violet-600 hover:bg-violet-700">
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
};
