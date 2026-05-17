"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    TrendingUpIcon,
    TrendingDownIcon,
    UsersIcon,
    DollarSignIcon,
    ActivityIcon,
    ImageIcon,
    VideoIcon,
    SparklesIcon,
    ArrowUpRightIcon,
    ClockIcon,
    ZapIcon,
    StarIcon,
} from "lucide-react"

/* ─── stat cards data ─── */
const stats = [
    {
        title: "Total Revenue",
        value: "$12,845",
        change: "+18.2%",
        trend: "up" as const,
        icon: DollarSignIcon,
        description: "vs last month",
        gradient: "from-violet-500/20 to-purple-500/20",
        iconBg: "bg-violet-500/10 text-violet-500",
    },
    {
        title: "Active Users",
        value: "2,340",
        change: "+12.5%",
        trend: "up" as const,
        icon: UsersIcon,
        description: "vs last month",
        gradient: "from-blue-500/20 to-cyan-500/20",
        iconBg: "bg-blue-500/10 text-blue-500",
    },
    {
        title: "AI Generations",
        value: "18,429",
        change: "+32.1%",
        trend: "up" as const,
        icon: SparklesIcon,
        description: "vs last month",
        gradient: "from-amber-500/20 to-orange-500/20",
        iconBg: "bg-amber-500/10 text-amber-500",
    },
    {
        title: "Conversion Rate",
        value: "3.24%",
        change: "-0.8%",
        trend: "down" as const,
        icon: ActivityIcon,
        description: "vs last month",
        gradient: "from-emerald-500/20 to-teal-500/20",
        iconBg: "bg-emerald-500/10 text-emerald-500",
    },
]

/* ─── chart data (weekly) ─── */
const chartData = [
    { day: "Mon", images: 42, videos: 18 },
    { day: "Tue", images: 58, videos: 24 },
    { day: "Wed", images: 35, videos: 15 },
    { day: "Thu", images: 72, videos: 32 },
    { day: "Fri", images: 64, videos: 28 },
    { day: "Sat", images: 88, videos: 42 },
    { day: "Sun", images: 52, videos: 22 },
]
const chartMax = Math.max(...chartData.map((d) => d.images + d.videos))

/* ─── recent activity ─── */
const recentActivity = [
    { user: "Sarah Chen", initials: "SC", action: "Generated 12 product images", type: "image" as const, time: "2 min ago", status: "completed" as const },
    { user: "Alex Rivera", initials: "AR", action: "Created AI video campaign", type: "video" as const, time: "15 min ago", status: "processing" as const },
    { user: "Maria Kim", initials: "MK", action: "Upgraded to Pro plan", type: "upgrade" as const, time: "1 hr ago", status: "completed" as const },
    { user: "James Wu", initials: "JW", action: "Batch processed 48 images", type: "image" as const, time: "2 hrs ago", status: "completed" as const },
    { user: "Lina Patel", initials: "LP", action: "Generated brand video", type: "video" as const, time: "3 hrs ago", status: "completed" as const },
]

/* ─── top models ─── */
const topModels = [
    { name: "Image Gen Pro", usage: 82, requests: "4,291", color: "bg-violet-500" },
    { name: "Video Creator", usage: 64, requests: "3,180", color: "bg-blue-500" },
    { name: "Style Transfer", usage: 51, requests: "2,540", color: "bg-cyan-500" },
    { name: "Background AI", usage: 43, requests: "2,105", color: "bg-amber-500" },
    { name: "Text-to-Speech", usage: 28, requests: "1,380", color: "bg-emerald-500" },
]

/* ─── quick actions ─── */
const quickActions = [
    { title: "Generate Image", description: "Create AI images from text prompts", icon: ImageIcon, gradient: "from-violet-500 to-purple-600" },
    { title: "Create Video", description: "Transform ideas into AI videos", icon: VideoIcon, gradient: "from-blue-500 to-cyan-600" },
    { title: "AI Assistant", description: "Chat with your AI copilot", icon: SparklesIcon, gradient: "from-amber-500 to-orange-600" },
    { title: "Boost Speed", description: "Upgrade for faster generation", icon: ZapIcon, gradient: "from-emerald-500 to-teal-600" },
]

export default function AdminPage() {
    return (
        <>
            {/* ─── header ─── */}
            <DashboardHeader
                breadcrumbs={[
                    { label: "Jenna Bot Pro", href: "/dashboard" },
                    { label: "Admin Panel" },
                ]}
            />

            {/* ─── main content ─── */}
            <div className="flex flex-1 flex-col gap-6 p-4 pt-0 pb-8">
                {/* Title row */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
                        <p className="text-muted-foreground text-sm">Overview administrasi platform Jenna Bot Pro.</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <Badge variant="outline" className="gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            All systems online
                        </Badge>
                    </div>
                </div>

                {/* ─── stat cards ─── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <Card key={stat.title} className="relative overflow-hidden border py-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardDescription className="text-sm font-medium">{stat.title}</CardDescription>
                                <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                                    <stat.icon className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                                <div className="mt-1 flex items-center gap-1 text-xs">
                                    {stat.trend === "up" ? (
                                        <TrendingUpIcon className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                        <TrendingDownIcon className="h-3 w-3 text-red-500" />
                                    )}
                                    <span className={stat.trend === "up" ? "font-medium text-emerald-500" : "font-medium text-red-500"}>
                                        {stat.change}
                                    </span>
                                    <span className="text-muted-foreground">{stat.description}</span>
                                </div>
                            </CardContent>
                            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-20 ${stat.gradient}`} />
                        </Card>
                    ))}
                </div>

                {/* ─── charts + activity row ─── */}
                <div className="grid gap-4 lg:grid-cols-7">
                    {/* Bar chart */}
                    <Card className="lg:col-span-4 py-5">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>AI Generations</CardTitle>
                                    <CardDescription>Weekly generation volume by type</CardDescription>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                                        Images
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                        Videos
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 h-48">
                                {chartData.map((d) => (
                                    <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                                        <div className="relative flex w-full flex-col items-center gap-0.5" style={{ height: 160 }}>
                                            <div
                                                className="w-full max-w-8 rounded-t-md bg-violet-500/80 transition-all duration-500 hover:bg-violet-500"
                                                style={{ height: `${(d.images / chartMax) * 100}%`, minHeight: 4 }}
                                            />
                                            <div
                                                className="w-full max-w-8 rounded-b-md bg-blue-500/80 transition-all duration-500 hover:bg-blue-500"
                                                style={{ height: `${(d.videos / chartMax) * 100}%`, minHeight: 4 }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium mt-1">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent activity */}
                    <Card className="lg:col-span-3 py-5">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Recent Activity</CardTitle>
                                    <CardDescription>Latest actions across your workspace</CardDescription>
                                </div>
                                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                                    View all
                                    <ArrowUpRightIcon className="h-3 w-3" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentActivity.map((activity, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50">
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                                            {activity.initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{activity.user}</p>
                                        <p className="text-xs text-muted-foreground truncate">{activity.action}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <Badge variant={activity.status === "completed" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                                            {activity.status === "processing" && (
                                                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            )}
                                            {activity.status}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <ClockIcon className="h-2.5 w-2.5" />
                                            {activity.time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* ─── models + quick actions row ─── */}
                <div className="grid gap-4 lg:grid-cols-7">
                    {/* Top models */}
                    <Card className="lg:col-span-3 py-5">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Top Models</CardTitle>
                                    <CardDescription>Most used AI models this month</CardDescription>
                                </div>
                                <StarIcon className="h-4 w-4 text-amber-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {topModels.map((model) => (
                                <div key={model.name} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{model.name}</span>
                                        <span className="text-muted-foreground text-xs">{model.requests} requests</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                                        <div className={`h-full rounded-full ${model.color} transition-all duration-700`} style={{ width: `${model.usage}%` }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Quick actions */}
                    <Card className="lg:col-span-4 py-5">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Jump into your most used tools</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {quickActions.map((action) => (
                                    <button
                                        key={action.title}
                                        className="group relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-muted-foreground/20"
                                    >
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${action.gradient} text-white shadow-sm`}>
                                            <action.icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold">{action.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                                        </div>
                                        <ArrowUpRightIcon className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
