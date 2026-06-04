"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { VideoTemplateContent } from "./components/video-template-content"

export default function VideoTemplatePage() {
  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Video Tools", href: "/dashboard" },
        { label: "Video Template" },
      ]} />

      <div className="flex-1 overflow-y-auto">
        <VideoTemplateContent />
      </div>
    </div>
  )
}
