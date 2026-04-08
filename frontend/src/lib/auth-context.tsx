"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { getToken, login as apiLogin, removeToken } from "@/lib/api-client"

interface AuthContextValue {
  token: string | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  isAuthenticated: false,
  setToken: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null)

  useEffect(() => {
    // Read token from localStorage on mount
    const stored = getToken()
    if (stored) {
      setTokenState(stored)
    }
  }, [])

  const setToken = useCallback((newToken: string) => {
    setTokenState(newToken)
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setTokenState(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated: !!token, setToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
