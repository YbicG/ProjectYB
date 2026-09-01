import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GitCommit,
  Tag,
  FileText,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { useGitStore } from '../../stores/useGitStore';
import { toast } from 'sonner';

interface ChangelogGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  projectName: string;
}

export const ChangelogGeneratorModal: React.FC<ChangelogGeneratorModalProps> = ({
  open,
  onOpenChange,
  projectPath,
  projectName
}) => {
  const { selectedProjectId, fetchStatus, loadHistory } = useGitStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [changelogData, setChangelogData] = useState<any>(null);
  const [targetVersion, setTargetVersion] = useState<string>('');
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [createTag, setCreateTag] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (open && projectPath) {
      setIsLoading(true);
      if (window.api?.changelog?.generate) {
        window.api.changelog
          .generate(projectPath)
          .then((res: any) => {
            setChangelogData(res);
            setTargetVersion(res.suggestedVersion || '1.0.1');
            setMarkdownContent(res.formattedMarkdown || '');
          })
          .catch((err: any) => {
            toast.error('Failed to generate changelog: ' + err.message);
          })
          .finally(() => setIsLoading(false));
      }
    }
  }, [open, projectPath]);

  const handleApplyRelease = async () => {
    if (!targetVersion.trim()) {
      toast.error('Version cannot be empty');
      return;
    }

    setIsApplying(true);
    try {
      const res = await window.api.changelog.applyRelease(
        projectPath,
        targetVersion.trim(),
        markdownContent,
        createTag
      );
      if (res.success) {
        toast.success(res.message);
        if (selectedProjectId) {
          await fetchStatus(selectedProjectId, projectPath);
        }
        await loadHistory(projectPath);
        onOpenChange(false);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Failed to apply release: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    toast.success('Changelog markdown copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-2xl p-5">
        <DialogHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-zinc-100">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Automated SemVer Release & Changelog Generator
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Analyzes Conventional Commits for <span className="font-semibold text-zinc-200">{projectName}</span>, calculates next SemVer version, and updates CHANGELOG.md.
            </DialogDescription>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2 font-mono">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            Parsing Git commit graph & SemVer tags…
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Version Transition & Breakdown HUD */}
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase block">Current</span>
                  <span className="text-xs font-mono font-bold text-zinc-400">
                    v{changelogData?.currentVersion || '1.0.0'}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-violet-400 font-mono uppercase block">Next Release</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="text"
                      value={targetVersion}
                      onChange={(e) => setTargetVersion(e.target.value)}
                      className="h-6 w-24 text-xs font-mono font-bold bg-zinc-950 border-zinc-700 text-zinc-100"
                    />
                    <Badge
                      className={
                        changelogData?.bumpType === 'major'
                          ? 'bg-rose-950 text-rose-300 border-rose-800 text-[9px] uppercase'
                          : changelogData?.bumpType === 'minor'
                          ? 'bg-violet-950 text-violet-300 border-violet-800 text-[9px] uppercase'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800 text-[9px] uppercase'
                      }
                    >
                      {changelogData?.bumpType || 'patch'} bump
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Commit Type Badges */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
                <span className="text-zinc-500">{changelogData?.commitsCount || 0} commits:</span>
                {changelogData?.categories?.features?.length > 0 && (
                  <Badge variant="outline" className="border-violet-800 text-violet-300 bg-violet-950/40 text-[9px]">
                    🚀 {changelogData.categories.features.length} Feat
                  </Badge>
                )}
                {changelogData?.categories?.fixes?.length > 0 && (
                  <Badge variant="outline" className="border-emerald-800 text-emerald-300 bg-emerald-950/40 text-[9px]">
                    🐛 {changelogData.categories.fixes.length} Fix
                  </Badge>
                )}
                {changelogData?.categories?.breaking?.length > 0 && (
                  <Badge variant="outline" className="border-rose-800 text-rose-300 bg-rose-950/40 text-[9px]">
                    ⚠️ {changelogData.categories.breaking.length} Breaking
                  </Badge>
                )}
              </div>
            </div>

            {/* Editable Markdown Release Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <Label className="text-[11px] text-zinc-400 font-medium">Release Notes Preview (CHANGELOG.md)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyMarkdown}
                  className="h-6 text-[10px] text-zinc-400 hover:text-zinc-200 gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                </Button>
              </div>
              <textarea
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                rows={8}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 leading-relaxed resize-none"
              />
            </div>

            {/* Options & Action Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={createTag}
                  onChange={(e) => setCreateTag(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-0"
                />
                <span>Create Git Tag (<code className="text-violet-400 font-mono text-[11px]">v{targetVersion}</code>)</span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 text-xs text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyRelease}
                  disabled={isApplying}
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-1.5"
                >
                  {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Apply Release & Update CHANGELOG.md
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};