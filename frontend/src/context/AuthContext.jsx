import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null // corrupted localStorage must not crash the app
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const fetchUser = useCallback(async () => {
    if (!token) { setLoading(false); return }
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
      localStorage.setItem('user', JSON.stringify(res.data))
    } catch (err) {
      // Only an invalid/expired session logs the user out; a network blip keeps the cached user.
      if (err.response?.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }, [token, logout])

  useEffect(() => { fetchUser() }, [fetchUser])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const accessToken = res.data.access_token
    localStorage.setItem('token', accessToken)
    setToken(accessToken)
    // Fetch user info
    const userRes = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    setUser(userRes.data)
    localStorage.setItem('user', JSON.stringify(userRes.data))
    return userRes.data
  }, [])

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data)
    return res.data
  }, [])

  // Stable identity: consumers only re-render when user/token/loading actually change.
  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
