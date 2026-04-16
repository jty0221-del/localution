'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  provider: string
  profile_image: string
}

export function useUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(function() {
    try {
      const userCookie = document.cookie.split(';').find(function(c) {
        return c.trim().indexOf('localution_user=') === 0
      })
      if (userCookie) {
        const userData = decodeURIComponent(userCookie.split('=')[1])
        const parsed = JSON.parse(userData)
        setUser(parsed)
      }
    } catch (_) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return { user, loading }
}
