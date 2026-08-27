import { create } from 'zustand'
import type { TerminalInstance, TerminalLayout, TerminalStatus } from '../types/terminal'
import { generateId } from '../lib/utils'

interface TerminalOptions {
  name: string
  cwd: string
  projectId?: string
  command?: string
}

interface TerminalState {
  terminals: TerminalInstance[]
  activeTerminalId: string | null
  layout: TerminalLayout
  createTerminal: (options: TerminalOptions) => Promise<string>
  killTerminal: (id: string) => void
  restartTerminal: (id: string) => Promise<void>
  setActiveTerminal: (id: string) => void
  setLayout: (layout: TerminalLayout) => void
  updateTerminalStatus: (id: string, status: TerminalStatus) => void
  removeTerminal: (id: string) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  activeTerminalId: null,
  layout: 'tabs',
  
  createTerminal: async (options) => {
    const id = generateId()
    const newTerminal: TerminalInstance = {
      id,
      name: options.name,
      cwd: options.cwd,
      projectId: options.projectId,
      status: 'starting',
      createdAt: Date.now(),
      command: options.command
    }
    
    set((state) => ({
      terminals: [...state.terminals, newTerminal],
      activeTerminalId: id
    }))

    try {
      await window.api.terminal.spawn({
        id,
        cwd: options.cwd,
        cols: 80,
        rows: 24
      })
      
      if (options.command) {
        window.api.terminal.write(id, `${options.command}\r`)
      }
      
      set((state) => ({
        terminals: state.terminals.map(t => t.id === id ? { ...t, status: 'running' } : t)
      }))
    } catch (error) {
      console.error('Failed to create terminal:', error)
      set((state) => ({
        terminals: state.terminals.map(t => t.id === id ? { ...t, status: 'error' } : t)
      }))
    }
    
    return id
  },
  
  killTerminal: (id) => {
    window.api.terminal.kill(id)
    set((state) => ({
      terminals: state.terminals.map(t => t.id === id ? { ...t, status: 'stopped' } : t)
    }))
  },
  
  restartTerminal: async (id) => {
    const { terminals, createTerminal, killTerminal } = get()
    const term = terminals.find(t => t.id === id)
    if (!term) return
    
    killTerminal(id)
    
    // Wait a brief moment before recreating
    await new Promise(r => setTimeout(r, 500))
    
    await createTerminal({
      name: term.name,
      cwd: term.cwd,
      projectId: term.projectId,
      command: term.command
    })
  },
  
  setActiveTerminal: (id) => set({ activeTerminalId: id }),
  
  setLayout: (layout) => set({ layout }),
  
  updateTerminalStatus: (id, status) => set((state) => ({
    terminals: state.terminals.map(t => t.id === id ? { ...t, status } : t)
  })),
  
  removeTerminal: (id) => {
    const { terminals, activeTerminalId, killTerminal } = get()
    const term = terminals.find(t => t.id === id)
    if (term && term.status !== 'stopped') {
      killTerminal(id)
    }
    
    const newTerminals = terminals.filter(t => t.id !== id)
    set({
      terminals: newTerminals,
      activeTerminalId: activeTerminalId === id 
        ? (newTerminals.length > 0 ? newTerminals[0].id : null) 
        : activeTerminalId
    })
  }
}))
