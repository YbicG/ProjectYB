import { create } from 'zustand'
import type { TerminalInstance, TerminalLayout, TerminalStatus, TerminalFilter } from '../types/terminal'
import { generateId } from '../lib/utils'

import { useNotificationStore } from './useNotificationStore'

interface TerminalOptions {
  name: string
  cwd: string
  projectId?: string
  projectName?: string
  serviceId?: string
  isService?: boolean
  command?: string
}

interface TerminalState {
  terminals: TerminalInstance[]
  activeTerminalId: string | null
  layout: TerminalLayout
  filter: TerminalFilter
  setFilter: (filter: TerminalFilter) => void
  createTerminal: (options: TerminalOptions) => Promise<string>
  killTerminal: (id: string) => void
  restartTerminal: (id: string) => Promise<void>
  setActiveTerminal: (id: string) => void
  setLayout: (layout: TerminalLayout) => void
  updateTerminalStatus: (id: string, status: TerminalStatus) => void
  removeTerminal: (id: string) => void
  renameTerminal: (id: string, name: string) => void
}

const exitListeners = new Map<string, () => void>()

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  activeTerminalId: null,
  layout: 'tabs',
  filter: 'all',

  setFilter: (filter) => set({ filter }),
  
  createTerminal: async (options) => {
    const id = generateId()
    const cwd = options.cwd || 'D:\\Code'
    const newTerminal: TerminalInstance = {
      id,
      name: options.name,
      cwd,
      projectId: options.projectId,
      projectName: options.projectName,
      serviceId: options.serviceId,
      isService: options.isService ?? false,
      status: 'starting',
      createdAt: Date.now(),
      command: options.command
    }
    
    set((state) => ({
      terminals: [...state.terminals, newTerminal],
      activeTerminalId: id
    }))

    try {
      const pid = await window.api.terminal.spawn({
        id,
        cwd,
        cols: 120,
        rows: 30,
        name: options.name,
        projectId: options.projectId,
        projectName: options.projectName,
        serviceId: options.serviceId,
        isService: options.isService,
        command: options.command
      })
      
      // Register onExit handler
      if (window.api?.terminal?.onExit) {
        const unsub = window.api.terminal.onExit(id, (exitCode: number) => {
          const terminal = get().terminals.find(t => t.id === id)
          get().updateTerminalStatus(id, exitCode === 0 ? 'stopped' : 'error')
          if (exitCode !== 0) {
            useNotificationStore.getState().notify({
              title: 'Terminal Process Failed',
              message: `Terminal "${terminal?.name || options.name}" exited with error code ${exitCode}`,
              type: 'error',
              category: 'terminals',
              actionTab: 'terminals'
            })
          }
        })
        exitListeners.set(id, unsub)
      }

      if (options.command) {
        // Allow powershell / bash 250ms to finish initializing prompt before writing
        setTimeout(() => {
          window.api.terminal.write(id, `${options.command}\r\n`)
        }, 250)
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
    const { terminals, createTerminal, removeTerminal } = get()
    const term = terminals.find(t => t.id === id)
    if (!term) return
    
    removeTerminal(id)
    await new Promise(r => setTimeout(r, 200))
    
    await createTerminal({
      name: term.name,
      cwd: term.cwd,
      projectId: term.projectId,
      projectName: term.projectName,
      serviceId: term.serviceId,
      isService: term.isService,
      command: term.command
    })
  },
  
  setActiveTerminal: (id) => set({ activeTerminalId: id }),
  
  setLayout: (layout) => set({ layout }),
  
  updateTerminalStatus: (id, status) => set((state) => ({
    terminals: state.terminals.map(t => t.id === id ? { ...t, status } : t)
  })),
  
  removeTerminal: (id) => {
    const unsub = exitListeners.get(id)
    if (unsub) {
      unsub()
      exitListeners.delete(id)
    }

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
  },

  renameTerminal: (id, name) => set((state) => ({
    terminals: state.terminals.map(t => t.id === id ? { ...t, name } : t)
  }))
}))
