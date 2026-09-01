import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Shield,
  Lock,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { useSecretVaultStore } from '@renderer/stores/useSecretVaultStore';
import { SecretCategory, SecretEnvironment } from '@renderer/types/secret';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

interface GlobalSecretsVaultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalSecretsVaultModal: React.FC<GlobalSecretsVaultModalProps> = ({
  open,
  onOpenChange
}) => {
  const {
    secrets,
    filterCategory,
    filterEnvironment,
    searchQuery,
    isLoaded,
    setFilterCategory,
    setFilterEnvironment,
    setSearchQuery,
    loadSecrets,
    addSecret,
    deleteSecret,
    exportVaultToTemplate
  } = useSecretVaultStore();

  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Secret Form State
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newCat, setNewCat] = useState<SecretCategory>('ai');
  const [newEnv, setNewEnv] = useState<SecretEnvironment>('all');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (open && !isLoaded) {
      loadSecrets();
    }
  }, [open, isLoaded]);

  const filteredSecrets = useMemo(() => {
    return secrets.filter((s) => {
      if (filterCategory !== 'all' && s.category !== filterCategory) return false;
      if (filterEnvironment !== 'all' && s.environment !== filterEnvironment && s.environment !== 'all') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchKey = s.key.toLowerCase().includes(q);
        const matchDesc = (s.description || '').toLowerCase().includes(q);
        if (!matchKey && !matchDesc) return false;
      }
      return true;
    });
  }, [secrets, filterCategory, filterEnvironment, searchQuery]);

  const handleCopyValue = (id: string, val: string, keyName: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    toast.success('Copied ' + keyName + ' to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newVal.trim()) {
      toast.error('Secret key and value are required');
      return;
    }

    await addSecret({
      key: newKey.trim(),
      value: newVal.trim(),
      category: newCat,
      environment: newEnv,
      description: newDesc.trim() || undefined
    });

    setNewKey('');
    setNewVal('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const handleExport = () => {
    const text = exportVaultToTemplate();
    navigator.clipboard.writeText(text);
    toast.success('Exported vault as .env template to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-2xl p-5">
        <DialogHeader className="pb-3 border-b border-zinc-850 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-zinc-100">
              <Shield className="w-4 h-4 text-violet-400" />
              Global Secrets & Credentials Vault
              <Badge variant="outline" className="text-[9px] font-mono border-violet-500/30 text-violet-300">
                AES-256 Encrypted
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Central secret store for reusable API keys, database credentials, and auth tokens across all projects.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1"
              title="Copy all secrets as .env template"
            >
              <Download className="w-3 h-3 text-zinc-400" /> Export
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-1"
            >
              <Plus className="w-3 h-3" /> {showAddForm ? 'Close' : 'Add Secret'}
            </Button>
          </div>
        </DialogHeader>

        {/* Add Secret Inline Form */}
        {showAddForm && (
          <form onSubmit={handleCreateSecret} className="p-3 rounded-lg border border-violet-500/30 bg-violet-950/20 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-300">Secret Key Name</Label>
                <Input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. OPENAI_API_KEY, STRIPE_SECRET"
                  required
                  className="bg-zinc-900 border-zinc-800 text-xs font-mono uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-300">Secret Value</Label>
                <Input
                  type="password"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  placeholder="••••••••••••••••"
                  required
                  className="bg-zinc-900 border-zinc-800 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-300">Category</Label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as SecretCategory)}
                  className="w-full h-8 rounded-md bg-zinc-900 border border-zinc-800 px-2 text-xs text-zinc-200 font-mono"
                >
                  <option value="ai">AI / LLMs</option>
                  <option value="database">Database</option>
                  <option value="auth">Auth & Security</option>
                  <option value="cloud">Cloud & Hosting</option>
                  <option value="payments">Payments & Billing</option>
                  <option value="devops">DevOps & CI</option>
                  <option value="custom">Custom / Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-300">Target Environment</Label>
                <select
                  value={newEnv}
                  onChange={(e) => setNewEnv(e.target.value as SecretEnvironment)}
                  className="w-full h-8 rounded-md bg-zinc-900 border border-zinc-800 px-2 text-xs text-zinc-200 font-mono"
                >
                  <option value="all">All Environments</option>
                  <option value="dev">Development</option>
                  <option value="staging">Staging</option>
                  <option value="prod">Production</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-300">Description (Optional)</Label>
                <Input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Master Production Stripe key"
                  className="bg-zinc-900 border-zinc-800 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="h-7 text-xs text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold"
              >
                Save Secret
              </Button>
            </div>
          </form>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search secrets by key or description..."
              className="h-7.5 pl-8 bg-zinc-900 border-zinc-800 text-xs font-mono"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {['all', 'ai', 'database', 'auth', 'cloud', 'payments'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-colors',
                  filterCategory === cat
                    ? 'bg-violet-600 text-white font-semibold'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Secrets List */}
        <div className="max-h-72 overflow-y-auto space-y-2 font-mono text-xs pr-1">
          {filteredSecrets.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs italic bg-zinc-900/20 rounded-lg border border-zinc-855">
              No secrets found in vault matching criteria.
            </div>
          ) : (
            filteredSecrets.map((sec) => {
              const isRevealed = revealedIds[sec.id] || false;
              const isCopied = copiedId === sec.id;

              return (
                <div
                  key={sec.id}
                  className="p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all flex items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-zinc-100 truncate text-[11px]">{sec.key}</span>
                      <Badge variant="outline" className="text-[8px] uppercase px-1 py-0 border-zinc-700 text-zinc-400">
                        {sec.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] uppercase px-1 py-0',
                          sec.environment === 'prod'
                            ? 'border-rose-500/30 text-rose-300 bg-rose-950/20'
                            : sec.environment === 'dev'
                            ? 'border-emerald-500/30 text-emerald-300 bg-emerald-950/20'
                            : 'border-zinc-700 text-zinc-400'
                        )}
                      >
                        {sec.environment}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 font-mono truncate max-w-sm">
                        {isRevealed ? sec.value : '••••••••••••••••••••••••'}
                      </span>
                      {sec.description && (
                        <span className="text-[9px] text-zinc-600 truncate">({sec.description})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleReveal(sec.id)}
                      className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
                      title={isRevealed ? 'Mask value' : 'Reveal value'}
                    >
                      {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyValue(sec.id, sec.value, sec.key)}
                      className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
                      title="Copy secret value"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSecret(sec.id)}
                      className="h-6 w-6 text-zinc-500 hover:text-rose-400"
                      title="Delete secret from vault"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};