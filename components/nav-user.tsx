"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ChevronsUpDownIcon,
  CoinsIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react"
import * as React from "react"

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0]?.slice(0, 2).toUpperCase() || "U"
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "U"
}

function useThemeToggle() {
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"))
  }, [])

  const toggle = () => {
    const html = document.documentElement
    if (isDark) {
      html.classList.remove("dark")
      html.classList.add("light")
      localStorage.setItem("theme", "light")
      setIsDark(false)
    } else {
      html.classList.remove("light")
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
      setIsDark(true)
    }
  }

  return { isDark, toggle }
}

export function NavUser() {
  const { data: session } = useSession()
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { isDark, toggle: toggleTheme } = useThemeToggle()

  const user = session?.user
  const name = user?.name || "User"
  const email = user?.email || ""
  const avatar = user?.image || ""
  const initials = getInitials(name, email)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatar} alt={name} />
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/dashboard/buy-credits")}>
                <CoinsIcon className="mr-2 h-4 w-4" />
                Buy Credits
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={toggleTheme}>
                {isDark ? (
                  <SunIcon className="mr-2 h-4 w-4" />
                ) : (
                  <MoonIcon className="mr-2 h-4 w-4" />
                )}
                {isDark ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOutIcon className="mr-2 h-4 w-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
