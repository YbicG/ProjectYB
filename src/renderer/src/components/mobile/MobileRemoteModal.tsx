import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useMobileStore } from '@renderer/stores/useMobileStore';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import {
  Smartphone,
  Sparkles,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Power,
  RotateCw,
  Globe,
  Lock,
  Zap,
  Edit2
} from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const MobileRemoteModal: React.FC = () => {
  const {
    modalOpen,
    setModalOpen,
    status,
    credentials,
    startMobileRemote,
    stopMobileRemote,
    updateCredentials,
    isStarting
  } = useMobileStore();

  const { config, loadConfig, remoteTunnels, loadRemoteTunnels } = useCloudflareStore();

  const [mode, setMode] = useState<'quick' | 'named'>('quick');
  const [namedToken, setNamedToken] = useState('');
  const [customHostname, setCustomHostname] = useState('');
  const [selectedTunnelId, setSelectedTunnelId] = useState('');

  // Credential Edit State
  const [isEditingCreds, setIsEditingCreds] = useState(false);
  const [usernameInput, setUsernameInput] = useState(credentials.username || 'admin');
  const [passwordInput, setPasswordInput] = useState(credentials.rawPasswordDisplay || 'projectyb123');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  useEffect(() => {
    if (modalOpen) {
      loadConfig();
      loadRemoteTunnels();
    }
  }, [modalOpen]);

  useEffect(() => {
    setUsernameInput(credentials.username);
    setPasswordInput(credentials.rawPasswordDisplay || 'projectyb123');
  }, [credentials]);

  const handleStart = async () => {
    await startMobileRemote({
      tunnelType: mode,
      namedToken: namedToken.trim() || undefined,
      customHostname: customHostname.trim() || undefined,
      port: 4848
    });
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) return;
    await updateCredentials(usernameInput.trim(), passwordInput.trim());
    setIsEditingCreds(false);
  };

  const copyToClipboard = (text: string, type: 'url' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast.success('Public Mobile URL copied to clipboard');
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
      toast.success('Password copied');
    }
  };

  const publicUrl = status?.publicUrl || status?.localUrl || '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    publicUrl
  )}&bgcolor=09090b&color=ffffff&margin=1`;

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => setModalOpen(open)}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
                ProjectYB Mobile Remote Companion
                {status?.running && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-950/30"
                  >
                    ● ACTIVE
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Run a simplified touch-friendly PWA on your phone to control services, run commands, and view logs on the go.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* ── Running Status Card (Active Tunnel & QR Code) ── */}
          {status?.running ? (
            <div className="bg-gradient-to-b from-violet-950/30 to-zinc-900/60 border border-violet-500/30 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* QR Code Container */}
                <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl shrink-0 shadow-xl">
                  <img
                    src={qrCodeUrl}
                    alt="Mobile Remote QR Code"
                    className="w-36 h-36 rounded-lg object-contain"
                  />
                  <div className="text-[10px] text-center text-zinc-500 font-mono mt-1">Scan with Phone</div>
                </div>

                {/* Connection Details */}
                <div className="space-y-2.5 min-w-0 flex-1 w-full">
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wider text-zinc-400 font-mono">
                      Public Mobile Remote URL
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        readOnly
                        value={status.publicUrl || status.localUrl}
                        className="bg-zinc-950 border-zinc-800 font-mono text-xs text-violet-300 select-all"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(status.publicUrl || status.localUrl, 'url')}
                        className="h-9 w-9 shrink-0 border-zinc-800 text-zinc-300"
                        title="Copy URL"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      {status.publicUrl && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => window.open(status.publicUrl, '_blank')}
                          className="h-9 w-9 shrink-0 border-zinc-800 text-zinc-300 hover:text-white"
                          title="Open in Browser"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Credentials Box */}
                  <div className="p-2.5 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Username:</span>
                      <span className="font-mono font-bold text-zinc-200">{credentials.username}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Password:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-300">
                          {credentials.rawPasswordDisplay || '••••••••'}
                        </span>
                        <button
                          onClick={() => copyToClipboard(credentials.rawPasswordDisplay || '', 'pass')}
                          className="text-zinc-500 hover:text-zinc-300 text-[10px]"
                          title="Copy Password"
                        >
                          {copiedPass ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stop Button */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active on port {status.port} ({status.activeSessions} connected)
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => stopMobileRemote()}
                  className="text-xs h-8 bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  Stop Mobile Remote
                </Button>
              </div>
            </div>
          ) : (
            /* ── Setup & Launcher Form (When Stopped) ── */
            <div className="space-y-4">
              {/* Tunnel Mode Selection */}
              <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setMode('quick')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                    mode === 'quick'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Quick Tunnel (TryCF)
                </button>

                <button
                  type="button"
                  onClick={() => setMode('named')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                    mode === 'named'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Named (Custom Domain)
                </button>
              </div>

              {mode === 'quick' ? (
                <div className="p-3 bg-violet-950/20 border border-violet-800/30 rounded-xl text-xs text-violet-300/90 leading-relaxed">
                  🚀 <strong>Instant Zero-Config Tunnel:</strong> Generates a temporary public HTTPS URL at <code>*.trycloudflare.com</code> with an instant camera-scannable QR code.
                </div>
              ) : (
                <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800/80">
                  <div className="space-y-1.5">
                    <Label htmlFor="named-token" className="text-xs text-zinc-300">
                      Cloudflare Named Tunnel Token
                    </Label>
                    <Input
                      id="named-token"
                      type="password"
                      value={namedToken}
                      onChange={(e) => setNamedToken(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="bg-zinc-950 border-zinc-800 font-mono text-xs text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="custom-host" className="text-xs text-zinc-300">
                      Custom Hostname / Domain (Optional)
                    </Label>
                    <Input
                      id="custom-host"
                      type="text"
                      value={customHostname}
                      onChange={(e) => setCustomHostname(e.target.value)}
                      placeholder="e.g. remote.mycustomdomain.com"
                      className="bg-zinc-950 border-zinc-800 font-mono text-xs text-zinc-100"
                    />
                  </div>
                </div>
              )}

              {/* Launch Button */}
              <Button
                size="lg"
                onClick={handleStart}
                disabled={isStarting}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-600/20 text-sm gap-2 h-11"
              >
                {isStarting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Launching Mobile Tunnel...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Start Mobile Remote Companion
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ── Credentials Editor Card ── */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                Mobile Authentication Security
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingCreds(!isEditingCreds)}
                className="h-7 text-xs text-zinc-400 hover:text-zinc-200 gap-1"
              >
                <Edit2 className="w-3 h-3" />
                {isEditingCreds ? 'Cancel' : 'Change Password'}
              </Button>
            </div>

            {isEditingCreds ? (
              <form onSubmit={handleSaveCredentials} className="space-y-3 pt-1 border-t border-zinc-800/80">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-400">Username</Label>
                    <Input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      required
                      className="bg-zinc-950 border-zinc-800 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-zinc-400">Password</Label>
                    <Input
                      type="text"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                      className="bg-zinc-950 border-zinc-800 font-mono text-xs text-zinc-100"
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs h-8">
                  Save New Credentials
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
                <span>User: <strong className="text-zinc-200">{credentials.username}</strong></span>
                <span>Pass: <strong className="text-amber-300">{credentials.rawPasswordDisplay || '••••••••'}</strong></span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
