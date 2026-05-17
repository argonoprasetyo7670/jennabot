"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

interface CreditsContextType {
  balance: number
  loading: boolean
  refresh: () => Promise<void>
  deduct: (amount: number, feature: string, description?: string) => Promise<boolean>
  checkSufficient: (amount: number) => boolean
}

const CreditsContext = createContext<CreditsContextType>({
  balance: 0,
  loading: true,
  refresh: async () => {},
  deduct: async () => false,
  checkSufficient: () => false,
})

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/credits")
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance)
      }
    } catch {
      console.warn("Failed to fetch credits")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh when generation queue deducts credits
  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener("credits-updated", handler)
    return () => window.removeEventListener("credits-updated", handler)
  }, [refresh])

  const checkSufficient = useCallback((amount: number) => {
    return balance >= amount
  }, [balance])

  const deduct = useCallback(async (amount: number, feature: string, description?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, feature, description }),
      })

      if (res.status === 402) {
        // Insufficient credits
        return false
      }

      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance)
        return true
      }

      return false
    } catch {
      console.error("Failed to deduct credits")
      return false
    }
  }, [])

  return (
    <CreditsContext value={{ balance, loading, refresh, deduct, checkSufficient }}>
      {children}
    </CreditsContext>
  )
}

export function useCredits() {
  return useContext(CreditsContext)
}
