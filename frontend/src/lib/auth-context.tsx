"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { getToken, removeToken } from "@/lib/api-client"

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
  const [token, setTokenState] = useState<string | null>(() => getToken())

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
