'use client'

import { useEffect, useState } from 'react'

interface UserData {
  id: string
  name: string
  email: string
  provider: string
  profile_image: string
}

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(function() {
    try {
      const cookies = document.cookie.split(';')
      let userCookie = ''
      for (let i = 0; i < cookies.length; i++) {
        const c = cookies[i].trim()
        if (c.indexOf('localution_user=') === 0) {
          userCookie = c.substring('localution_user='.length)
          break
        }
      }
      if (userCookie) {
        const decoded = decodeURIComponent(userCookie)
        const parsed = JSON.parse(decoded)
        setUser(parsed)
      }
    } catch (_) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = function() {
    window.location.href = '/api/auth/logout'
  }

  return { user, loading, logout }
}
