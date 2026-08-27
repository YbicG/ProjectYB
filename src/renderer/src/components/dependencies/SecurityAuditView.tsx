import React from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, Wrench, ExternalLink, AlertTriangle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useDependencyStore } from '@renderer/stores/useDependencyStore';
import { cn } from '@renderer/lib/utils';

interface SecurityAuditViewProps {
  projectPath: string;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({ projectPath }) => {
  const { auditSummary, isLoadingAudit, loadAudit, fixVulnerabilities } = useDependencyStore();

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-600 text-white text-[9px] px-1.5 py-0">High</Badge>;
      case 'moderate':
        return <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0">Moderate</Badge>;
      case 'low':
        return <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0">Low</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] px-1.5 py-0">Info</Badge>;
    }
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 flex flex-col h-full">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <CardTitle className="text-xs font-semibold text-zinc-100">Security Vulnerabilities</CardTitle>
          {auditSummary && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {auditSummary.total} Issues
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {auditSummary && auditSummary.total > 0 && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 gap-1.5"
              onClick={() => fixVulnerabilities(projectPath)}
              disabled={isLoadingAudit}
            >
              <Wrench className="w-3 h-3" /> Auto-Fix Audit
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => loadAudit(projectPath)}
            disabled={isLoadingAudit}
            title="Re-run security audit"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoadingAudit && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      {/* Severity Summary Bar */}
      {auditSummary && auditSummary.total > 0 && (
        <div className="p-3 bg-zinc-900/40 border-b border-zinc-800 flex items-center justify-around text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-zinc-400">Critical:</span>
            <strong className="text-zinc-200">{auditSummary.critical}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-zinc-400">High:</span>
            <strong className="text-zinc-200">{auditSummary.high}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-zinc-400">Moderate:</span>
            <strong className="text-zinc-200">{auditSummary.moderate}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-zinc-400">Low:</span>
            <strong className="text-zinc-200">{auditSummary.low}</strong>
          </div>
        </div>
      )}

      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoadingAudit ? (
            <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              Running security vulnerability scan…
            </div>
          ) : !auditSummary || auditSummary.total === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mb-1" />
              <span className="font-semibold text-zinc-300">0 Known Security Vulnerabilities</span>
              <span>All installed packages have clean security audits.</span>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {auditSummary.vulnerabilities.map((v) => (
                <div key={v.id} className="p-3.5 hover:bg-zinc-900/50 transition-colors space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(v.severity)}
                      <span className="text-xs font-semibold text-zinc-200">{v.name}</span>
                    </div>
                    {v.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-zinc-400 hover:text-white px-1.5"
                        onClick={() => window.open(v.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Advisory
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400">{v.title}</p>

                  <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono">
                    {v.affectedVersions && (
                      <span>Affected: <strong className="text-red-400">{v.affectedVersions}</strong></span>
                    )}
                    {v.patchedVersions && (
                      <span>Patched: <strong className="text-emerald-400">{v.patchedVersions}</strong></span>
                    )}
                    {v.fixAvailable && (
                      <span className="text-emerald-400">✓ Fix Available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
