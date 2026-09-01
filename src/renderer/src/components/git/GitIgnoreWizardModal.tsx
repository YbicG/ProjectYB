import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Plus
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
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { useGitStore } from '@renderer/stores/useGitStore';

interface GitIgnoreWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  untrackedFiles: string[];
}

interface CommonIgnoreRule {
  pattern: string;
  category: 'node' | 'build' | 'python' | 'rust' | 'os' | 'secrets' | 'logs';
  description: string;
}

const COMMON_RULES: CommonIgnoreRule[] = [
  { pattern: 'node_modules/', category: 'node', description: 'Node.js dependency packages' },
  { pattern: 'dist/', category: 'build', description: 'Vite / Webpack production build outputs' },
  { pattern: 'build/', category: 'build', description: 'Compiled build artifacts' },
  { pattern: '.next/', category: 'node', description: 'Next.js build cache and server bundles' },
  { pattern: '.nuxt/', category: 'node', description: 'Nuxt.js build output' },
  { pattern: '.output/', category: 'node', description: 'Nitro / Astro output folder' },
  { pattern: 'out/', category: 'build', description: 'Electron / Next static export output' },
  { pattern: 'target/', category: 'rust', description: 'Rust Cargo compiled binaries' },
  { pattern: '__pycache__/', category: 'python', description: 'Python bytecode cache' },
  { pattern: '*.pyc', category: 'python', description: 'Python compiled files' },
  { pattern: '.venv/', category: 'python', description: 'Python virtual environment' },
  { pattern: 'venv/', category: 'python', description: 'Python virtual environment' },
  { pattern: '.turbo/', category: 'node', description: 'Turborepo build cache' },
  { pattern: '.cache/', category: 'build', description: 'Build and bundler cache' },
  { pattern: '*.log', category: 'logs', description: 'Application error and debug logs' },
  { pattern: 'npm-debug.log*', category: 'logs', description: 'NPM crash logs' },
  { pattern: 'yarn-debug.log*', category: 'logs', description: 'Yarn crash logs' },
  { pattern: 'yarn-error.log*', category: 'logs', description: 'Yarn error logs' },
  { pattern: '.env.local', category: 'secrets', description: 'Local environment secrets' },
  { pattern: '.env.*.local', category: 'secrets', description: 'Local environment overrides' },
  { pattern: '.DS_Store', category: 'os', description: 'macOS folder metadata' },
  { pattern: 'Thumbs.db', category: 'os', description: 'Windows thumbnail cache' },
  { pattern: 'coverage/', category: 'node', description: 'Test coverage reports' }
];

export const GitIgnoreWizardModal: React.FC<GitIgnoreWizardModalProps> = ({
  open,
  onOpenChange,
  projectPath,
  untrackedFiles
}) => {
  const { fetchStatus } = useGitStore();
  const selectedProjectId = useGitStore((s) => s.selectedProjectId);

  // Match untracked files with suggested ignore rules
  const detectedRules = useMemo(() => {
    const matched = new Set<string>();

    for (const file of untrackedFiles) {
      const normalized = file.replace(/\\/g, '/');
      if (normalized.includes('node_modules')) matched.add('node_modules/');
      if (normalized.startsWith('dist/') || normalized.includes('/dist/')) matched.add('dist/');
      if (normalized.startsWith('build/') || normalized.includes('/build/')) matched.add('build/');
      if (normalized.startsWith('.next/') || normalized.includes('/.next/')) matched.add('.next/');
      if (normalized.startsWith('.turbo/') || normalized.includes('/.turbo/')) matched.add('.turbo/');
      if (normalized.startsWith('out/') || normalized.includes('/out/')) matched.add('out/');
      if (normalized.startsWith('target/') || normalized.includes('/target/')) matched.add('target/');
      if (normalized.includes('__pycache__') || normalized.endsWith('.pyc')) matched.add('__pycache__/');
      if (normalized.startsWith('.venv/') || normalized.startsWith('venv/')) matched.add('.venv/');
      if (normalized.endsWith('.log')) matched.add('*.log');
      if (normalized.includes('.DS_Store')) matched.add('.DS_Store');
      if (normalized.includes('Thumbs.db')) matched.add('Thumbs.db');
      if (normalized.includes('.env.local')) matched.add('.env.local');
      if (normalized.startsWith('coverage/')) matched.add('coverage/');
    }

    return matched;
  }, [untrackedFiles]);

  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [customPattern, setCustomPattern] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Initialize selected rules when dialog opens
  React.useEffect(() => {
    if (open) {
      const initial = detectedRules.size > 0 
        ? Array.from(detectedRules) 
        : ['node_modules/', 'dist/', '.next/', '*.log', '.DS_Store'];
      setSelectedRules(initial);
    }
  }, [open, detectedRules]);

  const toggleRule = (pattern: string) => {
    setSelectedRules((prev) =>
      prev.includes(pattern) ? prev.filter((p) => p !== pattern) : [...prev, pattern]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPattern.trim()) return;
    const pat = customPattern.trim();
    if (!selectedRules.includes(pat)) {
      setSelectedRules((prev) => [...prev, pat]);
    }
    setCustomPattern('');
  };

  const handleApply = async () => {
    if (selectedRules.length === 0) {
      toast.info('No rules selected');
      return;
    }

    setIsApplying(true);
    try {
      const gitignorePath = `${projectPath}/.gitignore`.replace(/\\/g, '/');
      let existingContent = '';

      if (window.api?.env?.read) {
        try {
          const res = await window.api.env.read(gitignorePath);
          existingContent = res?.raw || '';
        } catch {
          existingContent = '';
        }
      }

      const existingLines = existingContent.split(/\r?\n/).map((l) => l.trim());
      const newRulesToAdd = selectedRules.filter((r) => !existingLines.includes(r.trim()));

      if (newRulesToAdd.length === 0) {
        toast.info('.gitignore already contains all selected rules');
        onOpenChange(false);
        return;
      }

      const appendBlock = `\n# Added by ProjectYB Smart Ignore\n${newRulesToAdd.join('\n')}\n`;
      const updatedFullContent = existingContent ? `${existingContent.trimEnd()}\n${appendBlock}` : appendBlock.trimStart();

      if (window.api?.env?.write) {
        await window.api.env.write(gitignorePath, [], updatedFullContent);
        toast.success(`Appended ${newRulesToAdd.length} rule(s) to .gitignore`);
      }

      if (selectedProjectId) {
        await fetchStatus(selectedProjectId, projectPath);
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Failed to update .gitignore: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-zinc-800/80 bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">
                Smart .gitignore Rule Builder
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Automatically detect and ignore build artifacts, package dependencies, and junk files.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {detectedRules.size > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Detected untracked junk folders!</span>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Found {detectedRules.size} pattern(s) in your {untrackedFiles.length.toLocaleString()} untracked files.
                </p>
              </div>
            </div>
          )}

          {/* Quick Select Rules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>Suggested Ignore Rules</span>
              <span className="text-[11px] text-zinc-500 font-mono font-normal">
                {selectedRules.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {COMMON_RULES.map((rule) => {
                const isSelected = selectedRules.includes(rule.pattern);
                const isDetected = detectedRules.has(rule.pattern);

                return (
                  <div
                    key={rule.pattern}
                    onClick={() => toggleRule(rule.pattern)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-violet-950/30 border-violet-800/60 text-zinc-200'
                        : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRule(rule.pattern)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 accent-violet-600 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-zinc-200">{rule.pattern}</span>
                          {isDetected && (
                            <Badge className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-300 border-amber-500/30 font-mono">
                              Detected
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate">{rule.description}</p>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] uppercase font-mono border-zinc-800 text-zinc-400 shrink-0">
                      {rule.category}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Pattern */}
          <form onSubmit={handleAddCustom} className="flex gap-2 pt-2 border-t border-zinc-800/60">
            <input
              type="text"
              value={customPattern}
              onChange={(e) => setCustomPattern(e.target.value)}
              placeholder="Add custom pattern (e.g. *.tmp, build_output/)"
              className="flex-1 h-8 rounded bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-8 text-xs border-zinc-800 hover:bg-zinc-900 gap-1 px-3"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </form>
        </div>

        <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={selectedRules.length === 0 || isApplying}
            onClick={handleApply}
            className="bg-violet-600 hover:bg-violet-700 text-xs px-4 gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isApplying ? 'Applying Rules...' : `Append ${selectedRules.length} Rule(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
