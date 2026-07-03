import  { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
export interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, userName: string) => Promise<void>
  logout: () => void
  getToken : () => string
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
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

  const checkCurrentUser = async () => {
    const token = localStorage.getItem('jwtToken')
    if (!token) {
      setIsLoading(false)  
      return
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/users/currentUser`, {
        headers: {
          'Authorization': `Bearer ${JSON.parse(token)}`,
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
        const error = await response.json()
        throw new Error(error.message || 'Signup failed')
      }

      const data = await response.json()
      console.log(data) ;
      localStorage.setItem('jwtToken' , JSON.stringify(data.token)) ;
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
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const data = await response.json() ;
      localStorage.setItem('jwtToken' , JSON.stringify(data.token)) ;
      setUser(data.user)
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null) ;
    localStorage.setItem('jwtToken' , '') ;
  }
  const getToken = () => {
    const token = localStorage.getItem('jwtToken') ;
    if (!token) {
      throw Error('error happened') ;
    }

    return JSON.parse(token);
  }

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    getToken,
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
