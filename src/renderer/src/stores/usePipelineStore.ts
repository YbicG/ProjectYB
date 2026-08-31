import { create } from 'zustand';
import { Pipeline, PipelineRunState, PipelineStep } from '../types/pipeline';
import { useNotificationStore } from './useNotificationStore';
import { toast } from 'sonner';

const DEFAULT_RECIPES: Pipeline[] = [
  {
    id: 'recipe_qa_check',
    name: 'Pre-Commit Health Check',
    description: 'Runs typecheck, linter, and unit test suite before committing code',
    category: 'qa',
    steps: [
      { id: 's1', name: 'Linting & Syntax Check', type: 'command', actionType: 'typecheck_lint', command: 'npm run lint || npx eslint . || echo "No linter configured"' },
      { id: 's2', name: 'TypeScript Strict Typecheck', type: 'command', actionType: 'typecheck_lint', command: 'npm run typecheck || npx tsc --noEmit' },
      { id: 's3', name: 'Execute Test Suite', type: 'command', actionType: 'run_tests', command: 'npm test || npm run test:unit' }
    ],
    createdAt: 1700000000000
  },
  {
    id: 'recipe_rebuild',
    name: 'Clean Full-Stack Reset',
    description: 'Purges build artifacts and lock caches, installs dependencies, and compiles packages',
    category: 'maintenance',
    steps: [
      { id: 's1', name: 'Purge Build Artifacts', type: 'command', actionType: 'clean_artifacts', command: 'rimraf dist build .turbo node_modules/.cache || rm -rf dist build .cache' },
      { id: 's2', name: 'Fresh Dependency Install', type: 'command', actionType: 'install_deps', command: 'pnpm install || npm install || yarn install' },
      { id: 's3', name: 'Compile Production Bundles', type: 'command', actionType: 'custom_command', command: 'npm run build' }
    ],
    createdAt: 1700000000001
  },
  {
    id: 'recipe_git_sync',
    name: 'Git Master Pull & Sync',
    description: 'Safely stashes working tree changes, pulls upstream main, and re-applies stash',
    category: 'custom',
    steps: [
      { id: 's1', name: 'Stash Working Tree', type: 'command', actionType: 'git_pull', command: 'git stash' },
      { id: 's2', name: 'Pull Upstream Main', type: 'command', actionType: 'git_pull', command: 'git pull origin main' },
      { id: 's3', name: 'Re-Apply Stashed Changes', type: 'command', actionType: 'git_pull', command: 'git stash pop || echo "No stash to apply"' }
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
