"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DynamicSidebar } from "@/components/dynamic-sidebar"
import { GenerationQueueProvider } from "@/contexts/generation-queue"
import { CreditsProvider } from "@/contexts/credits"
import { SubscriptionProvider } from "@/contexts/subscription"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  // Initialize theme from localStorage
  React.useEffect(() => {
    const theme = localStorage.getItem("theme")
    if (theme === "light") {
      document.documentElement.classList.add("light")
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
    }
  }, [])

  return (
    <SessionProvider>
      <CreditsProvider>
        <SubscriptionProvider>
          <GenerationQueueProvider>
            <TooltipProvider>
              <SidebarProvider>
                <DynamicSidebar />
                <SidebarInset>
                  {children}
                </SidebarInset>
              </SidebarProvider>
            </TooltipProvider>
          </GenerationQueueProvider>
        </SubscriptionProvider>
      </CreditsProvider>
    </SessionProvider>
  )
}
