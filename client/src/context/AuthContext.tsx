import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
export interface User {
  id: string
  email: string
}

type AuthTokens = {
  refreshToken: string | null
  accessToken: string | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, userName: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Tokens are stored in cookies (HttpOnly) on the server; do not use localStorage.

const readResponseError = async (response: Response) => {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      const data = (await response.json()) as { message?: string }
      return data.message || `Request failed with status ${response.status}`
    } catch {
      return `Request failed with status ${response.status}`
    }
  }

  const text = await response.text().catch(() => '')
  return text.trim() || `Request failed with status ${response.status}`
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [, setTokens] = useState<AuthTokens>({
    refreshToken: null,
    accessToken: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already logged in on mount
  useEffect(() => {
    checkCurrentUser()
  }, [])

  const getApiUrl = () => {
    if (window.location.hostname === 'ticket.com') {
      return 'https://ticket.com'
    }
    return 'http://localhost:3000'
  }

  const storeTokens = (nextTokens: AuthTokens) => {
    // Keep tokens in React state only; server is responsible for cookie storage.
    setTokens(nextTokens)
  }

  const checkCurrentUser = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/users/currentUser`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.currentUser) setUser(data.currentUser)
      }
    } catch (error) {
      console.error('Error checking current user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, userName: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${getApiUrl()}/api/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, userName }),
      })

      if (!response.ok) {
        throw new Error(await readResponseError(response))
      }

      const data = await response.json()
      // Server should set auth cookies; keep user in state from response.
      setUser(data.user)
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${getApiUrl()}/api/users/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error(await readResponseError(response))
      }

      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    storeTokens({ refreshToken: null, accessToken: null })
    // Attempt server signout to clear cookies
    void fetch(`${getApiUrl()}/api/users/signout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
  }

  const refreshSession = async () => {
    const response = await fetch(`${getApiUrl()}/api/refresh`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Could not refresh session')
    }

    const data = (await response.json()) as { token?: string }
    storeTokens({
      refreshToken: data.token ?? null,
      accessToken: null,
    })
  }

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    refreshSession,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
