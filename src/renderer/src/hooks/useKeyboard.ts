import { useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { useTerminalStore } from '../stores/useTerminalStore'
import type { TabType } from '../stores/useAppStore'

export function useKeyboard() {
  const toggleCommandPalette = useAppStore((state) => state.toggleCommandPalette)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const activeTab = useAppStore((state) => state.activeTab)
  const { createTerminal, killTerminal, activeTerminalId } = useTerminalStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: Ctrl+K
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
      
      // Tab switching: Ctrl+1-5
      if (e.ctrlKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault()
        const tabs: TabType[] = ['dashboard', 'terminals', 'git', 'services', 'settings']
        const index = parseInt(e.key) - 1
        setActiveTab(tabs[index])
      }
      
      // Terminal actions
      if (activeTab === 'terminals') {
        // New Terminal: Ctrl+T
        if (e.ctrlKey && e.key === 't') {
          e.preventDefault()
          createTerminal({
            name: 'Local Terminal',
            cwd: 'D:\\Code'
          })
        }
        
        // Close Terminal: Ctrl+W
        if (e.ctrlKey && e.key === 'w' && activeTerminalId) {
          e.preventDefault()
          killTerminal(activeTerminalId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette, setActiveTab, activeTab, createTerminal, killTerminal, activeTerminalId])
}
