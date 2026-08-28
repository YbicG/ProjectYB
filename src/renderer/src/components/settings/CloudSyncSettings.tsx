import React, { useState, useEffect } from 'react';
import {
  Shield,
  UploadCloud,
  DownloadCloud,
  FileDown,
  FileUp,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  Lock,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { useSyncStore } from '../../stores/useSyncStore';
import { toast } from 'sonner';

export const CloudSyncSettings: React.FC = () => {
  const {
    status,
    isSyncing,
    githubToken,
    gistId,
    loadSettings,
    setGitHubToken,
    setGistId,
    backupToGist,
    restoreFromGist,
    exportToFile,
    importFromFile
  } = useSyncStore();

  const [tokenInput, setTokenInput] = useState('');
  const [gistInput, setGistInput] = useState('');

  // Password Modals
  const [passwordModalAction, setPasswordModalAction] = useState<
    'backup-gist' | 'restore-gist' | 'export-file' | 'import-file' | null
  >(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setTokenInput(githubToken);
    setGistInput(gistId);
  }, [githubToken, gistId]);

  const handleSaveCredentials = async () => {
    await setGitHubToken(tokenInput.trim());
    await setGistId(gistInput.trim());
    toast.success('Saved Cloud Sync credentials');
  };

  const handleExecuteModalAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter an encryption password');
      return;
    }

    if (passwordModalAction === 'backup-gist' || passwordModalAction === 'export-file') {
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    try {
      if (passwordModalAction === 'backup-gist') {
        await backupToGist(password);
      } else if (passwordModalAction === 'restore-gist') {
        await restoreFromGist(password);
      } else if (passwordModalAction === 'export-file') {
        await exportToFile(password);
      } else if (passwordModalAction === 'import-file') {
        await importFromFile(password);
      }
      setPasswordModalAction(null);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      // Toast already dispatched by store
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Overview & Telemetry Card ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-zinc-100">
                  Encrypted Workspace Vault & Cloud Sync
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Securely backup your database connections, pipelines, snippets, and project settings with AES-256-GCM encryption.
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] font-mono border-violet-500/30 text-violet-300">
              AES-256-GCM
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
            <div className="space-y-1">
              <span className="text-zinc-500 block text-[11px]">Last Cloud Backup:</span>
              <span className="font-mono text-zinc-200 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                {status.lastBackupDate ? new Date(status.lastBackupDate).toLocaleString() : 'Never backed up'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-500 block text-[11px]">Target Gist Vault:</span>
              {status.lastGistUrl ? (
                <a
                  href={status.lastGistUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 truncate"
                >
                  <span>{status.lastGistId?.slice(0, 12)}...</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="font-mono text-zinc-500">Not connected</span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => setPasswordModalAction('backup-gist')}
              disabled={isSyncing}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-9 gap-1.5 font-medium"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Backup to Gist
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPasswordModalAction('restore-gist')}
              disabled={isSyncing || !gistId}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs h-9 gap-1.5"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
              Restore Gist
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPasswordModalAction('export-file')}
              disabled={isSyncing}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs h-9 gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              Export Vault
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPasswordModalAction('import-file')}
              disabled={isSyncing}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs h-9 gap-1.5"
            >
              <FileUp className="w-3.5 h-3.5 text-amber-400" />
              Import Vault
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Credentials Configuration Card ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-violet-400" />
            GitHub Gist Cloud Connection
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Provide a GitHub Personal Access Token with <code>gist</code> permissions to sync encrypted vaults across machines.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="github-token" className="text-xs text-zinc-300">
              GitHub Personal Access Token (PAT)
            </Label>
            <Input
              id="github-token"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gist-id" className="text-xs text-zinc-300">
              Existing Vault Gist ID (Optional for multi-device sync)
            </Label>
            <Input
              id="gist-id"
              type="text"
              value={gistInput}
              onChange={(e) => setGistInput(e.target.value)}
              placeholder="e.g. a1b2c3d4e5f6g7h8..."
              className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={handleSaveCredentials} className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200">
              Save Sync Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Master Password Modal ── */}
      <Dialog
        open={Boolean(passwordModalAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordModalAction(null);
            setPassword('');
            setConfirmPassword('');
          }
        }}
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-sm p-5 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-zinc-800">
            <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-violet-400" />
              {passwordModalAction?.includes('backup') || passwordModalAction?.includes('export')
                ? 'Enter Encryption Master Password'
                : 'Enter Decryption Password'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Your password is used to derive the AES-256-GCM encryption key locally.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecuteModalAction} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Master Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            {(passwordModalAction === 'backup-gist' || passwordModalAction === 'export-file') && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Confirm Master Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPasswordModalAction(null)}
                className="text-xs text-zinc-400"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold">
                Proceed
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
