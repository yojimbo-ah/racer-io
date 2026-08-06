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
  getRefreshToken: () => string
  getAccessToken: () => string
  refreshSession: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REFRESH_TOKEN_KEY = 'refreshToken'
const ACCESS_TOKEN_KEY = 'accessToken'

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
  const [tokens, setTokens] = useState<AuthTokens>({
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
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
    setTokens(nextTokens)

    if (nextTokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, nextTokens.refreshToken)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }

    if (nextTokens.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, nextTokens.accessToken)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  }

  const checkCurrentUser = async () => {
    const refreshToken = tokens.refreshToken ?? localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/users/currentUser`, {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          'Content-Type': 'application/json'
        }
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
      if (!data.token || !data.accessToken) {
        throw new Error('Signup succeeded but token data was missing')
      }
      storeTokens({
        refreshToken: data.token,
        accessToken: data.accessToken,
      })
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
      if (!data.token || !data.accessToken) {
        throw new Error('Login succeeded but token data was missing')
      }
      storeTokens({
        refreshToken: data.token,
        accessToken: data.accessToken,
      })
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
  }
  const getRefreshToken = () => {
    const refreshToken = tokens.refreshToken ?? localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      throw Error('Refresh token not found')
    }

    return refreshToken
  }

  const getAccessToken = () => {
    const accessToken = tokens.accessToken ?? localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      throw Error('Access token not found')
    }

    return accessToken
  }

  const refreshSession = async () => {
    const accessToken = getAccessToken()

    const response = await fetch(`${getApiUrl()}/api/refresh`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Could not refresh session')
    }

    const data = (await response.json()) as { token?: string }
    storeTokens({
      refreshToken: data.token ?? null,
      accessToken,
    })
  }

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    getRefreshToken,
    getAccessToken,
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
