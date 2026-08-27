import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Subscribe to an IPC event channel. The callback is called each time
 * the main process emits to this channel. Cleans up the listener on unmount.
 *
 * @param channel - The IPC channel name (must be registered on window.api via contextBridge)
 * @param callback - Handler invoked with the event payload args
 */
export function useIPCEvent(channel: string, callback: (...args: any[]) => void): void {
  // Stable ref so we don't need the callback in the dep array
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    // window.api exposes named namespaces, not a generic channel listener.
    // For generic event subscription we fall back to ipcRenderer via window if
    // the app has exposed it, or warn in dev.
    const ipcRenderer = (window as any).ipcRenderer as
      | { on: (ch: string, fn: (...a: any[]) => void) => void; removeListener: (ch: string, fn: (...a: any[]) => void) => void }
      | undefined

    if (!ipcRenderer) {
      console.warn(`[useIPCEvent] ipcRenderer not exposed on window — channel "${channel}" will not be subscribed.`)
      return
    }

    const handler = (...args: any[]) => callbackRef.current(...args)
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  }, [channel])
}

interface IPCInvokeResult<T> {
  /** Last successful response */
  data: T | null
  /** True while an invocation is in-flight */
  loading: boolean
  /** Error message from the last failed invocation */
  error: string | null
  /** Call this to actually fire the IPC invocation */
  invoke: (...args: any[]) => Promise<T>
}

/**
 * Generic hook to invoke an IPC channel imperatively.
 * Returns `{ data, loading, error, invoke }`.
 * The `invoke` function is stable across renders.
 *
 * @param channel - The IPC channel name
 */
export function useIPCInvoke<T = unknown>(channel: string): IPCInvokeResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invoke = useCallback(
    async (...args: any[]): Promise<T> => {
      const ipcRenderer = (window as any).ipcRenderer as
        | { invoke: (ch: string, ...a: any[]) => Promise<T> }
        | undefined

      if (!ipcRenderer) {
        const msg = `[useIPCInvoke] ipcRenderer not exposed on window — cannot invoke "${channel}"`
        console.warn(msg)
        setError(msg)
        throw new Error(msg)
      }

      setLoading(true)
      setError(null)
      try {
        const result = await ipcRenderer.invoke(channel, ...args)
        setData(result)
        return result
      } catch (err: any) {
        const message: string = err?.message ?? String(err)
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [channel]
  )

  return { data, loading, error, invoke }
}
