import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

const ToastContext = createContext<{ toast: string; showToast: (msg: string) => void }>({
  toast: '', showToast: () => {}
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState('')
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])
  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      {toast && <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg text-sm z-[300]">{toast}</div>}
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
