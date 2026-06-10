import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('mindpalace-theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('mindpalace-theme', dark ? 'dark' : 'light')
  }, [dark])
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(!dark) }}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }
