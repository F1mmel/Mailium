import { ref } from 'vue'

export interface ToastItem {
  id: string
  title: string
  message?: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

const toasts = ref<ToastItem[]>([])

export const useToast = () => {
  const addToast = (
    title: string,
    message?: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success',
    duration = 3500
  ) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = { id, title, message, type, duration }

    toasts.value.push(newToast)

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    addToast,
    removeToast,
    success: (title: string, message?: string) => addToast(title, message, 'success'),
    error: (title: string, message?: string) => addToast(title, message, 'error'),
    info: (title: string, message?: string) => addToast(title, message, 'info'),
    warning: (title: string, message?: string) => addToast(title, message, 'warning')
  }
}
