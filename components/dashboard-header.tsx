"use client"

import * as React from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { HeaderActions } from "@/components/header-actions"

export interface BreadcrumbSegment {
  label: string
  href?: string
}

interface DashboardHeaderProps {
  breadcrumbs?: BreadcrumbSegment[]
}

export function DashboardHeader({ breadcrumbs }: DashboardHeaderProps) {
  const segments: BreadcrumbSegment[] = breadcrumbs || [
    { label: "Jenna Bot Pro", href: "/dashboard" },
    { label: "Dashboard" },
  ]

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1
              if (isLast) {
                return (
                  <BreadcrumbItem key={segment.label}>
                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                )
              }
              return (
                <React.Fragment key={segment.label}>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href={segment.href || "#"}>
                      {segment.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="px-4">
        <HeaderActions />
      </div>
    </header>
  )
}
