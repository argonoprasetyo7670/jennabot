"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon, ExternalLinkIcon } from "lucide-react"

export interface NavSubItem {
  title: string
  url: string
}

export interface NavItem {
  title: string
  url: string
  icon?: React.ReactNode
  type: "link" | "collapsible" | "external"
  items?: NavSubItem[]
  adminOnly?: boolean
}

const STORAGE_KEY = "sidebar-open-sections"

function getPersistedSections(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistSections(sections: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections))
  } catch {
    // ignore
  }
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  // Start with empty set to avoid hydration mismatch (localStorage not available on server)
  const [openSections, setOpenSections] = React.useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = React.useState(false)

  // Hydrate from localStorage + auto-open active section after mount
  React.useEffect(() => {
    const persisted = getPersistedSections()
    const initial = new Set(persisted)

    // Auto-open section containing active page
    items.forEach((item) => {
      if (item.type === "collapsible" && item.items) {
        const hasActive = item.items.some((sub) => pathname === sub.url || pathname.startsWith(sub.url + "/"))
        if (hasActive) initial.add(item.title)
      }
    })

    setOpenSections(initial)
    setHydrated(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open section when pathname changes (navigation)
  React.useEffect(() => {
    if (!hydrated) return
    setOpenSections((prev) => {
      const next = new Set(prev)
      items.forEach((item) => {
        if (item.type === "collapsible" && item.items) {
          const hasActive = item.items.some((sub) => pathname === sub.url || pathname.startsWith(sub.url + "/"))
          if (hasActive) next.add(item.title)
        }
      })
      return next
    })
  }, [pathname, hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = (title: string, isOpen: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (isOpen) {
        next.add(title)
      } else {
        next.delete(title)
      }
      persistSections(Array.from(next))
      return next
    })
  }

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/")

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          if (item.type === "external") {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.icon}
                    <span>{item.title}</span>
                    <ExternalLinkIcon className="ml-auto h-3 w-3 opacity-50" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          if (item.type === "collapsible" && item.items) {
            const sectionActive = item.items.some((sub) => isActive(sub.url))

            return (
              <Collapsible
                key={item.title}
                asChild
                open={openSections.has(item.title)}
                onOpenChange={(open) => toggleSection(item.title, open)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={sectionActive ? "text-sidebar-primary font-semibold" : ""}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                      <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const subActive = isActive(subItem.url)
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={subActive}>
                              <Link href={subItem.url}>
                                {subActive && (
                                  <span className="relative mr-1 flex h-1.5 w-1.5 shrink-0">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--sidebar-primary)] opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--sidebar-primary)]" />
                                  </span>
                                )}
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          // Single link
          const linkActive = isActive(item.url)
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild isActive={linkActive}>
                <Link href={item.url}>
                  {item.icon}
                  {linkActive && (
                    <span className="relative mr-0.5 flex h-1.5 w-1.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--sidebar-primary)] opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--sidebar-primary)]" />
                    </span>
                  )}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
