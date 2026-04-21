'use client'

import { useEffect } from 'react'

export default function RootPage() {
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    window.location.replace(base + '/dashboard/')
  }, [])
  return null
}
