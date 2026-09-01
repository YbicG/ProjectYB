import React, { useState } from 'react';
import {
  Sparkles,
  Image,
  Upload,
  Download,
  CheckCircle2,
  Layers,
  Package,
  Sliders,
  Loader2,
  FileCode
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface AssetForgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath?: string;
  projectName?: string;
}

export const AssetForgeModal: React.FC<AssetForgeModalProps> = ({
  open,
  onOpenChange,
  projectPath,
  projectName
}) => {
  const [sourceFile, setSourceFile] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'favicon' | 'convert'>('favicon');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [quality, setQuality] = useState<number>(85);
  const [targetFormat, setTargetFormat] = useState<'png' | 'jpeg'>('png');

  const handleGenerateFavicons = async () => {
    if (!sourceFile.trim()) {
      toast.error('Please enter or select a source image file path');
      return;
    }
    if (!projectPath) {
      toast.error('No project directory selected');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await window.api.assetForge.generateFaviconSuite(projectPath, sourceFile.trim());
      if (res.success) {
        setGeneratedResult(res);
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Favicon generation failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertImage = async () => {
    if (!sourceFile.trim()) {
      toast.error('Please enter a source image file path');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await window.api.assetForge.convertImage(sourceFile.trim(), targetFormat, quality);
      if (res.success) {
        setGeneratedResult(res);
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Image conversion failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-xl p-5">
        <DialogHeader className="pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-violet-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Developer Asset Forge</span>
            {projectName && (
              <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300">
                {projectName}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Batch generate complete responsive favicon suites, web manifests, and optimize project assets.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 gap-1">
          <button
            onClick={() => { setActiveTab('favicon'); setGeneratedResult(null); }}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'favicon' ? 'bg-violet-600 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Favicon & PWA Suite
          </button>
          <button
            onClick={() => { setActiveTab('convert'); setGeneratedResult(null); }}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'convert' ? 'bg-violet-600 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Image Optimizer
          </button>
        </div>

        {/* Source File Picker */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-400">Source Image File Path (PNG / JPEG / SVG)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={sourceFile}
              onChange={(e) => setSourceFile(e.target.value)}
              placeholder="e.g. C:/logo.png or src/assets/logo.png"
              className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-100"
            />
          </div>
        </div>

        {activeTab === 'favicon' ? (
          <div className="space-y-3 p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-xs">
            <p className="text-zinc-300 text-[11px]">
              Generates <code className="text-violet-300 font-mono">favicon.ico</code>, 16x16, 32x32, 180x180 (Apple Touch), 192x192, 512x512 (Android), and <code className="text-violet-300 font-mono">site.webmanifest</code> directly into <span className="font-mono text-zinc-200">public/</span>.
            </p>
            <Button
              onClick={handleGenerateFavicons}
              disabled={isProcessing}
              className="w-full h-8 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs gap-1.5"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate Favicon Package into public/
            </Button>
          </div>
        ) : (
          <div className="space-y-3 p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-400">Target Format</Label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value as any)}
                  className="w-full h-8 rounded-md bg-zinc-950 border border-zinc-800 px-2 text-xs text-zinc-200 font-mono"
                >
                  <option value="png">PNG (Lossless)</option>
                  <option value="jpeg">JPEG (Compressed)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-400">Quality ({quality}%)</Label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full mt-2"
                />
              </div>
            </div>
            <Button
              onClick={handleConvertImage}
              disabled={isProcessing}
              className="w-full h-8 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs gap-1.5"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
              Optimize Image
            </Button>
          </div>
        )}

        {/* Output Result HUD */}
        {generatedResult && (
          <div className="p-3 rounded-lg border border-emerald-800/60 bg-emerald-950/20 text-xs space-y-1.5 font-mono">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{generatedResult.message}</span>
            </div>
            {generatedResult.generatedFiles && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {generatedResult.generatedFiles.map((f: string) => (
                  <Badge key={f} variant="outline" className="border-emerald-800 text-emerald-300 text-[10px]">
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};