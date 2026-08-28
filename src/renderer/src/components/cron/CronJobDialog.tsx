import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useCronStore } from '@renderer/stores/useCronStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { Clock, Play, Sparkles, Folder } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

export const CronJobDialog: React.FC = () => {
  const { isEditorOpen, closeEditor, editingJob, saveJob } = useCronStore();
  const { projects } = useProjectStore();

  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [schedule, setSchedule] = useState('*/10 * * * *');
  const [cwd, setCwd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingJob) {
      setName(editingJob.name);
      setCommand(editingJob.command);
      setSchedule(editingJob.schedule);
      setCwd(editingJob.cwd || '');
    } else {
      setName('');
      setCommand('');
      setSchedule('*/10 * * * *');
      setCwd('');
    }
  }, [editingJob, isEditorOpen]);

  const presets = [
    { label: 'Every 5 Mins', value: '*/5 * * * *' },
    { label: 'Every 15 Mins', value: '*/15 * * * *' },
    { label: 'Hourly', value: '0 * * * *' },
    { label: 'Daily (Midnight)', value: '0 0 * * *' },
    { label: 'Every 30s (Test)', value: 'every 1m' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !command.trim() || !schedule.trim()) return;

    setIsSubmitting(true);
    try {
      await saveJob({
        id: editingJob?.id,
        name: name.trim(),
        command: command.trim(),
        schedule: schedule.trim(),
        cwd: cwd.trim() || undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">
                {editingJob ? 'Edit Scheduled Task' : 'New Scheduled Background Task'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Execute automated shell commands, cleanups, git pulls, or backups on a recurring schedule.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Task Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cron-name" className="text-xs text-zinc-300">
              Task Name
            </Label>
            <Input
              id="cron-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Git Pull All Repos, DB Snapshot, Cache Purge"
              required
              className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
            />
          </div>

          {/* Shell Command */}
          <div className="space-y-1.5">
            <Label htmlFor="cron-cmd" className="text-xs text-zinc-300">
              Shell Command
            </Label>
            <Input
              id="cron-cmd"
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. git pull origin main, npm run build, python sync.py"
              required
              className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
            />
          </div>

          {/* Schedule & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cron-sched" className="text-xs text-zinc-300">
                Cron Expression / Interval
              </Label>
              <span className="text-[11px] font-mono text-violet-400">{schedule}</span>
            </div>
            <Input
              id="cron-sched"
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g. */10 * * * * or every 15m"
              required
              className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSchedule(p.value)}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-mono border transition-all',
                    schedule === p.value
                      ? 'bg-violet-950/40 border-violet-500/50 text-violet-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Working Directory */}
          <div className="space-y-1.5">
            <Label htmlFor="cron-cwd" className="text-xs text-zinc-300">
              Working Directory (Optional)
            </Label>
            <Input
              id="cron-cwd"
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="e.g. D:\Code\Repositories\MyProject (leave blank for default)"
              className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
            />

            {/* Quick Project Select */}
            {projects.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar pt-1">
                {projects.slice(0, 6).map((proj) => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => setCwd(proj.path)}
                    className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 truncate max-w-[150px]"
                    title={proj.path}
                  >
                    📁 {proj.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeEditor} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-md"
            >
              {editingJob ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
