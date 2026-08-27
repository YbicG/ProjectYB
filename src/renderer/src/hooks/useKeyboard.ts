import { useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { useTerminalStore } from '../stores/useTerminalStore'
import { useNotesStore } from '../stores/useNotesStore'
import { useThemeStore } from '../stores/useThemeStore'
import { useSearchStore } from '../stores/useSearchStore'
import { useSnippetStore } from '../stores/useSnippetStore'
import { useOverviewStore } from '../stores/useOverviewStore'
import type { TabType } from '../stores/useAppStore'

export function useKeyboard() {
  const toggleCommandPalette = useAppStore((state) => state.toggleCommandPalette)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const activeTab = useAppStore((state) => state.activeTab)
  const { createTerminal, killTerminal, activeTerminalId } = useTerminalStore()
  const { setScratchpadModalOpen, scratchpadModalOpen } = useNotesStore()
  const { setShortcutsModalOpen, shortcutsModalOpen } = useThemeStore()
  const { setModalOpen: setSearchModalOpen, isModalOpen: searchModalOpen } = useSearchStore()
  const { setModalOpen: setSnippetModalOpen, isModalOpen: snippetModalOpen } = useSnippetStore()
  const { toggleFullscreen } = useOverviewStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable

      // Global Search: Ctrl+Shift+F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault()
        setSearchModalOpen(!searchModalOpen)
        return
      }

      // Command Snippets Vault: Ctrl+Shift+S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault()
        setSnippetModalOpen(!snippetModalOpen)
        return
      }

      // Wallboard Fullscreen Toggle: F11 (when on overview tab or global)
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
        return
      }

      // Command palette: Ctrl+K or Ctrl+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault()
        toggleCommandPalette()
        return
      }

      // Quick Scratchpad: Ctrl+N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        setScratchpadModalOpen(!scratchpadModalOpen)
        return
      }

      // Keyboard shortcuts modal: Ctrl+/ or ? (when not inside an input)
      if (((e.ctrlKey || e.metaKey) && e.key === '/') || (!isInput && e.key === '?')) {
        e.preventDefault()
        setShortcutsModalOpen(!shortcutsModalOpen)
        return
      }

      // Tab switching: Ctrl+1-9
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        e.preventDefault()
        const tabs: TabType[] = [
          'dashboard',
          'overview',
          'api',
          'terminals',
          'git',
          'services',
          'dependencies',
          'optimizer',
          'settings'
        ]
        const index = parseInt(e.key, 10) - 1
        if (tabs[index]) {
          setActiveTab(tabs[index])
        }
        return
      }

      // Quick Jump to Optimizer: Ctrl+Shift+O
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault()
        setActiveTab('optimizer')
        return
      }

      // Quick Jump to Services / Docker: Ctrl+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        setActiveTab('services')
        return
      }

      // Quick Jump to Dependencies: Ctrl+Shift+P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setActiveTab('dependencies')
        return
      }

      // New Terminal: Ctrl+T
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        const defaultCwd = useAppStore.getState().scanPaths[0] || 'D:\\Code'
        createTerminal({
          name: 'Local Terminal',
          cwd: defaultCwd
        })
        setActiveTab('terminals')
        return
      }

      // Close Terminal: Ctrl+W
      if (activeTab === 'terminals' && (e.ctrlKey || e.metaKey) && e.key === 'w' && activeTerminalId) {
        e.preventDefault()
        killTerminal(activeTerminalId)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    toggleCommandPalette,
    setActiveTab,
    activeTab,
    createTerminal,
    killTerminal,
    activeTerminalId,
    scratchpadModalOpen,
    shortcutsModalOpen,
    searchModalOpen,
    snippetModalOpen,
    toggleFullscreen
  ])
}
