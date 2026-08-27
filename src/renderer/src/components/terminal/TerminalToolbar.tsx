import React from 'react';
import { Plus, PanelRight, PanelBottom, Trash, RotateCw, Eraser, LayoutGrid, List, Columns } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@renderer/lib/utils';

export const TerminalToolbar: React.FC = () => {
  const { layout, setLayout, addTerminal, removeTerminal, activeTerminalId } = useTerminalStore();

  return (
    <div className="h-10 flex items-center px-2 bg-zinc-950 border-b border-zinc-800 gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-50" onClick={() => addTerminal({ name: 'Local', cwd: '.' })}>
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Terminal</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-800" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-50">
              <PanelRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split Horizontal</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-50">
              <PanelBottom className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split Vertical</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-800" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-50">
              <Eraser className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear Console</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-50">
              <RotateCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Restart Terminal</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-zinc-400 hover:text-red-500"
              onClick={() => activeTerminalId && removeTerminal(activeTerminalId)}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kill Terminal</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <div className="flex items-center bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-7 w-7 rounded-sm", layout === 'tabs' ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-50")}
                onClick={() => setLayout('tabs')}
              >
                <Columns className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tabs Layout</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-7 w-7 rounded-sm", layout === 'grid' ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-50")}
                onClick={() => setLayout('grid')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Grid Layout</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-7 w-7 rounded-sm", layout === 'list' ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-50")}
                onClick={() => setLayout('list')}
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>List Layout</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};
