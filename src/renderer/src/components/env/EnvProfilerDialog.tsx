import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowUpDown,
  Copy,
  ShieldAlert
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface EnvProfilerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
}

interface EnvEntry {
  key: string;
  value: string;
}

export const EnvProfilerDialog: React.FC<EnvProfilerDialogProps> = ({
  open,
  onOpenChange,
  projectPath
}) => {
  const [envRaw, setEnvRaw] = useState('');
  const [exampleRaw, setExampleRaw] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadEnvFiles = async () => {
    if (!window.api?.env?.read) return;
    setIsLoading(true);
    try {
      const dotEnvPath = String(projectPath + '/.env').replace(/\\/g, '/');
      const dotEnvExamplePath = String(projectPath + '/.env.example').replace(/\\/g, '/');

      let envContent = '';
      let exampleContent = '';

      try {
        const res = await window.api.env.read(dotEnvPath);
        envContent = res?.raw || '';
      } catch {}

      try {
        const res = await window.api.env.read(dotEnvExamplePath);
        exampleContent = res?.raw || '';
      } catch {}

      setEnvRaw(envContent);
      setExampleRaw(exampleContent);
    } catch (err: any) {
      toast.error('Failed to read env files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadEnvFiles();
    }
  }, [open, projectPath]);

  // Parse key-value pairs
  const parseEnv = (raw: string): EnvEntry[] => {
    const lines = raw.split(/\r?\n/);
    const list: EnvEntry[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        list.push({
          key: trimmed.substring(0, eqIdx).trim(),
          value: trimmed.substring(eqIdx + 1).trim()
        });
      }
    }
    return list;
  };

  const envEntries = useMemo(() => parseEnv(envRaw), [envRaw]);
  const exampleEntries = useMemo(() => parseEnv(exampleRaw), [exampleRaw]);

  // Analyze missing keys, duplicate keys
  const analysis = useMemo(() => {
    const envKeySet = new Set(envEntries.map((e) => e.key));
    const exampleKeySet = new Set(exampleEntries.map((e) => e.key));

    const missingInEnv = exampleEntries.filter((e) => !envKeySet.has(e.key));
    const extraInEnv = envEntries.filter((e) => !exampleKeySet.has(e.key));

    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const e of envEntries) {
      if (seen.has(e.key)) {
        duplicates.push(e.key);
      }
      seen.add(e.key);
    }

    return {
      missingInEnv,
      extraInEnv,
      duplicates: Array.from(new Set(duplicates)),
      isSynced: missingInEnv.length === 0 && duplicates.length === 0
    };
  }, [envEntries, exampleEntries]);

  // Action: Add all missing keys with example default values to .env
  const handleAddMissingKeys = async () => {
    if (analysis.missingInEnv.length === 0) return;
    setIsSaving(true);
    try {
      const dotEnvPath = String(projectPath + '/.env').replace(/\\/g, '/');
      const linesToAdd = analysis.missingInEnv.map((e) => e.key + '=' + e.value).join('\n');
      const newContent = envRaw.trimEnd()
        ? envRaw.trimEnd() + '\n\n# Synced from .env.example\n' + linesToAdd + '\n'
        : linesToAdd + '\n';

      if (window.api?.env?.write) {
        await window.api.env.write(dotEnvPath, [], newContent);
        setEnvRaw(newContent);
        toast.success('Added ' + analysis.missingInEnv.length + ' missing key(s) to .env');
      }
    } catch (err: any) {
      toast.error('Failed to update .env: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Alphabetize and deduplicate .env
  const handleAlphabetizeEnv = async () => {
    setIsSaving(true);
    try {
      const dotEnvPath = String(projectPath + '/.env').replace(/\\/g, '/');
      const map = new Map<string, string>();
      for (const e of envEntries) {
        map.set(e.key, e.value);
      }

      const sortedKeys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
      const newContent = sortedKeys.map((k) => k + '=' + map.get(k)).join('\n') + '\n';

      if (window.api?.env?.write) {
        await window.api.env.write(dotEnvPath, [], newContent);
        setEnvRaw(newContent);
        toast.success('Alphabetized and deduplicated .env variables');
      }
    } catch (err: any) {
      toast.error('Failed to format .env: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Create .env.example from current .env
  const handleCreateExample = async () => {
    setIsSaving(true);
    try {
      const examplePath = String(projectPath + '/.env.example').replace(/\\/g, '/');
      const sanitized = envEntries
        .map((e) => {
          let val = e.value;
          if (val.length > 0 && !val.startsWith('http')) {
            val = 'your_' + e.key.toLowerCase();
          }
          return e.key + '=' + val;
        })
        .join('\n') + '\n';

      if (window.api?.env?.write) {
        await window.api.env.write(examplePath, [], sanitized);
        setExampleRaw(sanitized);
        toast.success('Generated .env.example template from .env');
      }
    } catch (err: any) {
      toast.error('Failed to create .env.example: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Environment Key Profiler & Synchronizer
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Audit .env against .env.example, detect missing production keys, and format schemas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
          {/* Status Banner */}
          {analysis.isSynced && exampleEntries.length > 0 ? (
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All {exampleEntries.length} environment keys from .env.example are properly set in .env!</span>
            </div>
          ) : analysis.missingInEnv.length > 0 ? (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{analysis.missingInEnv.length} missing key(s) detected!</span>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Your .env.example defines keys that are not present in your local .env.
                </p>
              </div>
            </div>
          ) : null}

          {/* Duplicates Warning */}
          {analysis.duplicates.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Duplicate keys found in .env: {analysis.duplicates.join(', ')}</span>
            </div>
          )}

          {/* Missing Keys List */}
          {analysis.missingInEnv.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Missing in .env</span>
                <Button
                  size="sm"
                  onClick={handleAddMissingKeys}
                  disabled={isSaving}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add All to .env
                </Button>
              </div>

              <div className="space-y-1.5 border border-zinc-800 rounded-lg p-2 bg-zinc-900/40 max-h-40 overflow-y-auto">
                {analysis.missingInEnv.map((e) => (
                  <div
                    key={e.key}
                    className="flex items-center justify-between p-1.5 rounded bg-zinc-900/80 border border-zinc-800 font-mono text-[11px]"
                  >
                    <span className="text-amber-400 font-semibold">{e.key}</span>
                    <span className="text-zinc-500 truncate max-w-[200px]">={e.value || '""'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-zinc-400 text-[11px]">.env Variables</span>
              <p className="text-lg font-bold font-mono text-zinc-100">{envEntries.length}</p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
              <span className="text-zinc-400 text-[11px]">.env.example Variables</span>
              <p className="text-lg font-bold font-mono text-zinc-100">{exampleEntries.length}</p>
            </div>
          </div>

          {/* Quick Tools */}
          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <span className="font-semibold text-zinc-300">Environment Utilities</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving || envEntries.length === 0}
                onClick={handleAlphabetizeEnv}
                className="h-8 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 justify-start gap-2"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-violet-400" />
                Sort & Format .env
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={isSaving || envEntries.length === 0}
                onClick={handleCreateExample}
                className="h-8 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 justify-start gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                Export .env.example
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-950/80">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
