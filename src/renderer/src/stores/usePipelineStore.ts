import { create } from 'zustand';
import { Pipeline, PipelineRunState, PipelineStep } from '../types/pipeline';
import { useNotificationStore } from './useNotificationStore';
import { toast } from 'sonner';

const DEFAULT_RECIPES: Pipeline[] = [
  {
    id: 'recipe_rebuild',
    name: 'Full Clean Rebuild',
    description: 'Clean node_modules cache, install dependencies, and build bundle',
    steps: [
      { id: 's1', name: 'Clean Cache', type: 'command', command: 'git clean -dfX -e !.env' },
      { id: 's2', name: 'Install Dependencies', type: 'command', command: 'pnpm install || npm install' },
      { id: 's3', name: 'Build Project', type: 'command', command: 'npm run build' }
    ],
    createdAt: 1700000000000
  },
  {
    id: 'recipe_ci',
    name: 'Local CI Test Suite',
    description: 'Run linters, type checks, and unit tests',
    steps: [
      { id: 's1', name: 'Lint Check', type: 'command', command: 'npm run lint || echo "No lint configured"' },
      { id: 's2', name: 'TypeScript Typecheck', type: 'command', command: 'npx tsc --noEmit' },
      { id: 's3', name: 'Run Unit Tests', type: 'command', command: 'npm test' }
    ],
    createdAt: 1700000000001
  },
  {
    id: 'recipe_git_sync',
    name: 'Git Master Pull & Stash',
    description: 'Stash local work, pull origin main, and re-apply stashes',
    steps: [
      { id: 's1', name: 'Stash Work', type: 'command', command: 'git stash' },
      { id: 's2', name: 'Pull Main', type: 'command', command: 'git pull origin main' },
      { id: 's3', name: 'Pop Stash', type: 'command', command: 'git stash pop || echo "No stash to pop"' }
    ],
    createdAt: 1700000000002
  }
];

interface PipelineState {
  pipelines: Pipeline[];
  activeRun: PipelineRunState | null;
  selectedPipelineId: string | null;
  editorModalOpen: boolean;
  editingPipeline: Pipeline | null;
  isExecuting: boolean;

  // Actions
  loadPipelines: () => Promise<void>;
  savePipeline: (pipeline: Pipeline) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;
  runPipeline: (pipeline: Pipeline, cwd?: string) => Promise<void>;
  stopPipeline: (id: string) => Promise<void>;
  openEditor: (pipeline?: Pipeline) => void;
  closeEditor: () => void;
  updateActiveRun: (state: PipelineRunState) => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelines: DEFAULT_RECIPES,
  activeRun: null,
  selectedPipelineId: 'recipe_rebuild',
  editorModalOpen: false,
  editingPipeline: null,
  isExecuting: false,

  loadPipelines: async () => {
    if (!window.api?.store) return;
    try {
      const saved = (await window.api.store.get('pipelines:list')) as Pipeline[] | undefined;
      if (saved && saved.length > 0) {
        set({ pipelines: saved, selectedPipelineId: saved[0].id });
      } else {
        set({ pipelines: DEFAULT_RECIPES });
      }
    } catch {}

    // Listen for live updates
    if (window.api?.pipelines?.onStatusUpdate) {
      window.api.pipelines.onStatusUpdate((state) => {
        get().updateActiveRun(state);
      });
    }
  },

  savePipeline: async (pipeline) => {
    const { pipelines } = get();
    const exists = pipelines.some((p) => p.id === pipeline.id);
    const updated = exists
      ? pipelines.map((p) => (p.id === pipeline.id ? pipeline : p))
      : [pipeline, ...pipelines];

    set({ pipelines: updated, editorModalOpen: false, editingPipeline: null });

    try {
      if (window.api?.store) {
        await window.api.store.set('pipelines:list', updated);
      }
    } catch {}
    toast.success(`Pipeline "${pipeline.name}" saved`);
  },

  deletePipeline: async (id) => {
    const remaining = get().pipelines.filter((p) => p.id !== id);
    set({ pipelines: remaining });
    try {
      if (window.api?.store) {
        await window.api.store.set('pipelines:list', remaining);
      }
    } catch {}
    toast.info('Pipeline deleted');
  },

  runPipeline: async (pipeline, cwd) => {
    if (!window.api?.pipelines) return;
    set({ isExecuting: true });
    toast.info(`Starting pipeline "${pipeline.name}"...`);

    try {
      const runState = await window.api.pipelines.run(pipeline, cwd);
      set({ activeRun: runState });
    } catch (err: any) {
      toast.error(`Pipeline failed to start: ${err.message}`);
      set({ isExecuting: false });
    }
  },

  stopPipeline: async (id) => {
    if (!window.api?.pipelines) return;
    await window.api.pipelines.stop(id);
    set({ isExecuting: false });
    toast.info('Pipeline execution stopped');
  },

  openEditor: (pipeline) => {
    set({
      editorModalOpen: true,
      editingPipeline:
        pipeline || {
          id: `pipe_${Date.now()}`,
          name: 'Custom Pipeline',
          description: '',
          steps: [{ id: 's1', name: 'Build Step', type: 'command', command: 'npm run build' }],
          createdAt: Date.now()
        }
    });
  },

  closeEditor: () => set({ editorModalOpen: false, editingPipeline: null }),

  updateActiveRun: (state) => {
    set({
      activeRun: state,
      isExecuting: state.status === 'running'
    });

    if (state.status === 'success') {
      const p = get().pipelines.find((x) => x.id === state.pipelineId);
      toast.success(`Pipeline "${p?.name || 'Workflow'}" completed successfully!`);
      useNotificationStore.getState().notify({
        title: 'Pipeline Finished',
        message: `Workflow "${p?.name || 'Pipeline'}" completed all steps`,
        type: 'success',
        category: 'projects'
      });
    } else if (state.status === 'failed') {
      const p = get().pipelines.find((x) => x.id === state.pipelineId);
      toast.error(`Pipeline "${p?.name || 'Workflow'}" failed`);
      useNotificationStore.getState().notify({
        title: 'Pipeline Failed',
        message: `Workflow "${p?.name || 'Pipeline'}" encountered an error`,
        type: 'error',
        category: 'projects'
      });
    }
  }
}));
