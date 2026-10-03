"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Odświeża rozmowę w kręgu co kilka sekund (prosta alternatywa dla Realtime w prototypie). */
export function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(t)
  }, [router, seconds])
  return null
}
