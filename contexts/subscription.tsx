"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface SubscriptionInfo {
  id: string
  plan: string
  status: string
  startDate: string
  endDate: string
  price: number
  planId: string | null
  isActive: boolean
  daysRemaining: number
  features: string[]
}

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null
  loading: boolean
  refresh: () => Promise<void>
  isSubscribed: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  refresh: async () => {},
  isSubscribed: false,
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/current")
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription || null)
      }
    } catch {
      console.warn("Failed to fetch subscription")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh on subscription-updated event
  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener("subscription-updated", handler)
    return () => window.removeEventListener("subscription-updated", handler)
  }, [refresh])

  const isSubscribed = subscription?.isActive === true

  return (
    <SubscriptionContext value={{ subscription, loading, refresh, isSubscribed }}>
      {children}
    </SubscriptionContext>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext)
}
