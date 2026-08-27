import { create } from 'zustand';
import { SearchFileResult } from '../types/search';
import { useProjectStore } from './useProjectStore';

interface SearchState {
  query: string;
  isModalOpen: boolean;
  isLoading: boolean;
  selectedProjectId: string; // 'all' or projectId
  isRegex: boolean;
  isCaseSensitive: boolean;
  fileExtension: string;
  results: SearchFileResult[];
  totalMatches: number;

  // Actions
  setQuery: (query: string) => void;
  setModalOpen: (open: boolean) => void;
  setSelectedProjectId: (id: string) => void;
  setIsRegex: (isRegex: boolean) => void;
  setIsCaseSensitive: (isCaseSensitive: boolean) => void;
  setFileExtension: (ext: string) => void;
  executeSearch: () => Promise<void>;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  isModalOpen: false,
  isLoading: false,
  selectedProjectId: 'all',
  isRegex: false,
  isCaseSensitive: false,
  fileExtension: 'all',
  results: [],
  totalMatches: 0,

  setQuery: (query) => {
    set({ query });
  },

  setModalOpen: (isModalOpen) => set({ isModalOpen }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setIsRegex: (isRegex) => set({ isRegex }),
  setIsCaseSensitive: (isCaseSensitive) => set({ isCaseSensitive }),
  setFileExtension: (fileExtension) => set({ fileExtension }),

  executeSearch: async () => {
    const { query, selectedProjectId, isRegex, isCaseSensitive, fileExtension } = get();
    if (!query || !query.trim() || !window.api?.search) return;

    set({ isLoading: true });

    const projects = useProjectStore.getState().projects;
    let targetProjects = projects.map((p) => ({ id: p.id, name: p.name, path: p.path }));

    if (selectedProjectId !== 'all') {
      targetProjects = targetProjects.filter((p) => p.id === selectedProjectId);
    }

    const extensions = fileExtension !== 'all' ? [fileExtension] : undefined;

    try {
      const results = (await window.api.search.query({
        query: query.trim(),
        projectPaths: targetProjects,
        isRegex,
        isCaseSensitive,
        fileExtensions: extensions,
        maxResultsPerProject: 50,
        maxTotalResults: 250
      })) as SearchFileResult[];

      let totalMatches = 0;
      results.forEach((r) => {
        totalMatches += r.matches.length;
      });

      set({ results, totalMatches, isLoading: false });
    } catch (err) {
      console.error('[useSearchStore] Search failed:', err);
      set({ results: [], totalMatches: 0, isLoading: false });
    }
  },

  clearSearch: () => set({ query: '', results: [], totalMatches: 0, isLoading: false })
}));
