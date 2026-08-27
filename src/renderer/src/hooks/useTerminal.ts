import { useCallback } from 'react'
import { useTerminalStore } from '../stores/useTerminalStore'
import { useAppStore } from '../stores/useAppStore'
import type { ProjectInfo } from '../types/project'

/**
 * Provides helper functions for terminal lifecycle management:
 * - `createProjectTerminal` — spawns a terminal scoped to a project and
 *   switches the UI to the Terminals tab.
 * - `killTerminal` — kills a terminal by id (delegates to store).
 * - `focusTerminal` — sets the active terminal and switches to Terminals tab.
 */
export function useTerminal() {
  const createTerminal = useTerminalStore((s) => s.createTerminal)
  const killTerminal = useTerminalStore((s) => s.killTerminal)
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  /**
   * Creates a terminal for the given project, sets it as active, and navigates
   * to the Terminals tab so the user can interact immediately.
   *
   * @returns The new terminal id
   */
  const createProjectTerminal = useCallback(
    async (project: ProjectInfo): Promise<string> => {
      const id = await createTerminal({
        name: project.name,
        cwd: project.path,
        projectId: project.id
      })
      setActiveTab('terminals')
      return id
    },
    [createTerminal, setActiveTab]
  )

  /**
   * Kills a terminal by id. Does not navigate away.
   */
  const kill = useCallback(
    (id: string) => {
      killTerminal(id)
    },
    [killTerminal]
  )

  /**
   * Sets the given terminal as active and navigates to the Terminals tab.
   */
  const focusTerminal = useCallback(
    (id: string) => {
      setActiveTerminal(id)
      setActiveTab('terminals')
    },
    [setActiveTerminal, setActiveTab]
  )

  return {
    createProjectTerminal,
    killTerminal: kill,
    focusTerminal
  }
}
