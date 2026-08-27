import React, { useState, useEffect } from 'react';
import { Github, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

export const GitHubSettings: React.FC = () => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const savedToken = await window.api.store.get('githubToken');
        if (savedToken) {
          setToken(savedToken);
        }
      } catch (error) {
        console.error('Failed to load GitHub token', error);
      }
    };
    loadToken();
  }, []);

  const testConnection = async () => {
    if (!token.trim()) return;
    setStatus('testing');
    try {
      // First save token temporarily so getUser uses the newly entered token
      await window.api.store.set('githubToken', token.trim());
      const user = await window.api.github.getUser();
      if (user && user.login) {
        setUsername(user.login);
        setStatus('success');
        toast.success(`Connected as @${user.login}`);
      } else {
        setStatus('error');
        toast.error('Invalid GitHub token or missing scopes');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      toast.error('Failed to connect to GitHub API');
    }
  };

  const handleSave = async () => {
    try {
      await window.api.store.set('githubToken', token.trim());
      toast.success('GitHub token saved');
    } catch (error) {
      console.error('Failed to save token', error);
      toast.error('Failed to save token');
    }
  };

  const handleClear = async () => {
    try {
      await window.api.store.delete('githubToken');
      setToken('');
      setStatus('idle');
      setUsername(null);
      toast.info('GitHub token removed');
    } catch (error) {
      console.error('Failed to clear token', error);
    }
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 max-w-3xl">
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <Github className="w-6 h-6 text-zinc-200" />
          <CardTitle>GitHub Integration</CardTitle>
        </div>
        <CardDescription>Connect your GitHub account to manage repositories, branches, and commits directly.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">Personal Access Token</label>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,read:user"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              Generate Token <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setStatus('idle');
                }}
                className="bg-zinc-900 pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button variant="secondary" onClick={testConnection} disabled={!token || status === 'testing'} className="shrink-0 gap-1">
              {status === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {status === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Requires <code className="text-zinc-300 font-mono">repo</code> and <code className="text-zinc-300 font-mono">read:user</code> scopes. Your token is stored locally.
          </p>
        </div>

        {status === 'success' && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Connection Successful</p>
              <p className="text-xs text-emerald-400/80">Authenticated as @{username || 'user'}.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Connection Failed</p>
              <p className="text-xs text-red-400/80">Invalid or expired token. Please verify token permissions.</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t border-zinc-800 pt-4">
        <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-xs" onClick={handleClear}>
          Clear Token
        </Button>
        <Button className="bg-violet-600 hover:bg-violet-700 text-xs" onClick={handleSave} disabled={!token}>
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
};
