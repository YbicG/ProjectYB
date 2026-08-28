import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { QrCode, Copy, Check, ExternalLink, Smartphone } from 'lucide-react';
import { generateQrSvg } from '@renderer/lib/qr';
import { toast } from 'sonner';

export const TunnelQrModal: React.FC = () => {
  const { qrModalOpen, closeQrModal, activeQrTunnel } = useCloudflareStore();
  const [copied, setCopied] = useState(false);

  if (!activeQrTunnel || !activeQrTunnel.publicUrl) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeQrTunnel.publicUrl || '');
    setCopied(true);
    toast.success('Public URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const qrSrc = generateQrSvg(activeQrTunnel.publicUrl, 260);

  return (
    <Dialog open={qrModalOpen} onOpenChange={(open) => !open && closeQrModal()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-sm flex flex-col p-6 shadow-2xl items-center text-center">
        <DialogHeader className="items-center space-y-1 pb-2">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-1">
            <Smartphone className="w-5 h-5" />
          </div>
          <DialogTitle className="text-base font-bold text-zinc-100">
            Mobile Device Preview
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Scan the QR code with your phone camera to test on mobile.
          </DialogDescription>
        </DialogHeader>

        {/* QR Code Container with white high-contrast background */}
        <div className="p-4 bg-white rounded-2xl shadow-xl my-3 flex items-center justify-center">
          <img
            src={qrSrc}
            alt="Tunnel QR Code"
            className="w-48 h-48 object-contain rounded-lg"
            loading="eager"
          />
        </div>

        {/* Public URL Box */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between gap-2 mt-1">
          <span className="font-mono text-xs text-orange-400 truncate text-left select-all">
            {activeQrTunnel.publicUrl}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 shrink-0"
            onClick={handleCopy}
            title="Copy URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <div className="w-full flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1 text-xs border-zinc-800 gap-1.5"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy URL'}
          </Button>

          <Button
            className="flex-1 text-xs bg-orange-600 hover:bg-orange-500 text-white gap-1.5"
            onClick={() => window.open(activeQrTunnel.publicUrl, '_blank')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
