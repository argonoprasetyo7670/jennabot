"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  LayoutDashboardIcon,
  BookOpenIcon,
  MessageCircleIcon,
  ImageIcon,
  SparklesIcon,
  ShoppingBagIcon,
  UserIcon,
  LayoutTemplateIcon,
  PenToolIcon,
  VideoIcon,
  FilmIcon,
  StarIcon,
  LayoutPanelLeftIcon,
  LayersIcon,
  ClapperboardIcon,
  ZapIcon,
  TimerIcon,
  GitMergeIcon,
  JoystickIcon,
  BrainCircuitIcon,
  FlameIcon,
  MessageSquareIcon,
  CoinsIcon,
  GalleryHorizontalEndIcon,
  KeyRoundIcon,
  FileTextIcon,
  ShieldIcon,

} from "lucide-react"

/* ─── Navigation items per sidebar.md spec ─── */
const navItems: NavItem[] = [
  // ── Single links ──
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon className="h-4 w-4" />,
    type: "link",
  },
  // {
  //   title: "Tutorial",
  //   url: "/tutorial",
  //   icon: <BookOpenIcon className="h-4 w-4" />,
  //   type: "link",
  // },
  {
    title: "WA Group Chat",
    url: "https://chat.whatsapp.com/",
    icon: <MessageCircleIcon className="h-4 w-4" />,
    type: "external",
  },

  // ── Image Tools (collapsible) ──
  {
    title: "Image Tools",
    url: "#",
    icon: <ImageIcon className="h-4 w-4" />,
    type: "collapsible",
    items: [
      { title: "AI Image Generator", url: "/dashboard/tools/ai-image-generator" },
      { title: "Product Studio", url: "/dashboard/product-studio" },
      { title: "Model Studio", url: "/dashboard/model-studio" },
      { title: "Thumbnail Generator", url: "/dashboard/thumbnail" },
      // { title: "Prompt Generator", url: "/dashboard/tools/prompt-generator" },
    ],
  },

  // ── Video Tools (collapsible) ──
  {
    title: "Video Tools",
    url: "#",
    icon: <VideoIcon className="h-4 w-4" />,
    type: "collapsible",
    items: [
      { title: "AI Video Generator", url: "/dashboard/tools/ai-video-generator" },
      { title: "Review Product", url: "/dashboard/review-product" },
      // { title: "Storyboard", url: "/dashboard/storyboard" },
      // { title: "Scene Builder", url: "/dashboard/scene-builder" },
      // { title: "Video Template", url: "/dashboard/video-template" },
      // { title: "TikTok Hook Generator", url: "/dashboard/tiktok-hook-gen" },
      // { title: "Extend Video", url: "/dashboard/extend-video" },
      // { title: "Merge Videos", url: "/dashboard/concatenate-video" },
      // { title: "Motion Control", url: "/dashboard/motion-control" },
      // { title: "Kling v3 Omni", url: "/dashboard/kling-v3-omni" },
      // { title: "Seedance Pro", url: "/dashboard/seedance-pro" },
    ],
  },

  // ── Single links (bottom section) ──
  // {
  //   title: "Chat AI",
  //   url: "/dashboard/chat",
  //   icon: <MessageSquareIcon className="h-4 w-4" />,
  //   type: "link",
  // },
  {
    title: "Buy Credits",
    url: "/dashboard/buy-credits",
    icon: <CoinsIcon className="h-4 w-4" />,
    type: "link",
  },
  {
    title: "Gallery",
    url: "/dashboard/gallery",
    icon: <GalleryHorizontalEndIcon className="h-4 w-4" />,
    type: "link",
  },
  // {
  //   title: "Workflow Builder",
  //   url: "/dashboard/workflow",
  //   icon: <GitMergeIcon className="h-4 w-4" />,
  //   type: "link",
  // },
  // {
  //   title: "API Keys",
  //   url: "/dashboard/api-keys",
  //   icon: <KeyRoundIcon className="h-4 w-4" />,
  //   type: "link",
  // },
  // {
  //   title: "API Docs",
  //   url: "/dashboard/api-docs",
  //   icon: <FileTextIcon className="h-4 w-4" />,
  //   type: "link",
  // },
  {
    title: "Admin Panel",
    url: "/dashboard/admin",
    icon: <ShieldIcon className="h-4 w-4" />,
    type: "link",
    adminOnly: true,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const userRole = session?.user?.role ?? "user"
  const isAdmin = userRole === "admin"

  // Filter out adminOnly items for non-admin users
  const filteredItems = React.useMemo(
    () => navItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* ── Header: Logo + Brand ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                  <Image
                    src="/jennabot/logo.png"
                    alt="Jenna Bot Pro"
                    width={32}
                    height={32}
                    className="object-contain"
                    style={{ width: "auto", height: "auto" }}
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Jenna Bot Pro</span>
                  <span className="truncate text-xs text-muted-foreground">AI Generator</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Content: Navigation ── */}
      <SidebarContent>
        <NavMain items={filteredItems} />
      </SidebarContent>

      {/* ── Footer: User dropdown ── */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
