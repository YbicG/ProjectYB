import { create } from 'zustand'

export interface AppNotification {
  id: string
  title: string
  message: string
  time: Date
  read: boolean
}

interface NotificationState {
  notifications: AppNotification[]
  addNotification: (title: string, message: string) => void
  markAsRead: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [
    { id: 'startup', title: 'System', message: 'ProjectYB started successfully', time: new Date(), read: false }
  ],
  addNotification: (title, message) => set((state) => ({
    notifications: [
      { id: Date.now().toString() + Math.random().toString(), title, message, time: new Date(), read: false },
      ...state.notifications
    ]
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  })),
  clearAll: () => set({ notifications: [] })
}))
