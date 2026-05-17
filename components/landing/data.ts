export const heroTiles = [
  { src: "/jennabot/hero-1.webp", alt: "Workflow preview poster", title: "Product ads", className: "col-span-5 row-span-2 md:col-span-3" },
  { src: "/jennabot/hero-2.webp", alt: "AI storefront preview", title: "Marketplace drops", className: "col-span-7 row-span-2 md:col-span-4" },
  { src: "/jennabot/hero-3.webp", alt: "Creative campaign artwork", title: "Poster drafts", className: "col-span-4 row-span-2 md:col-span-2" },
  { src: "/jennabot/hero-4.webp", alt: "Gallery preview artwork", title: "Gallery uploads", className: "col-span-8 row-span-2 md:col-span-5" },
] as const;

export const stats = [
  { value: "50K+", label: "Images Generated", suffix: "" },
  { value: "10K+", label: "Videos Created", suffix: "" },
  { value: "5K+", label: "Active Creators", suffix: "" },
  { value: "99.9%", label: "Uptime", suffix: "" },
] as const;

export const featureCards = [
  {
    icon: "image",
    badge: "0.25 credit/image",
    title: "Image Studio",
    description: "Text-to-image, image-to-image, multiple model choices, and style control. Generate ads, concept art, posters, and storefront visuals from prompts or references.",
    tags: ["Text to Image", "Image to Image", "Style Control", "Hi-Res Output"],
  },
  {
    icon: "video",
    badge: "3 credits/video",
    title: "Video Studio",
    description: "Produce clips from text, images, or reference-based inputs. Powered by Veo 3.1 for cinema-quality short-form video generation.",
    tags: ["Text to Video", "Image to Video", "Veo 3.1", "Camera Control"],
  },
  {
    icon: "workflow",
    badge: "Node-based",
    title: "Workflow Canvas",
    description: "Compose and edit generation steps visually with a node-based canvas. Chain multiple AI operations into reusable, shareable production pipelines.",
    tags: ["Visual Editor", "Reusable Flows", "AI Agent", "Premium Nodes"],
  },
  {
    icon: "store",
    badge: "Marketplace",
    title: "NgatStore",
    description: "Buy and sell workflow templates inside the dashboard. Monetize your creative workflows and earn 100% credits from every sale.",
    tags: ["Sell Templates", "100% Earnings", "Community", "Instant Deploy"],
  },
] as const;

export const howItWorks = [
  { step: "01", title: "Sign up in seconds", description: "Create your account with Google or email. Get instant access to all creation tools and a 7-day VIP trial." },
  { step: "02", title: "Create with AI", description: "Generate images, videos, and visual content using state-of-the-art AI models. One credit system across all tools." },
  { step: "03", title: "Build workflows", description: "Chain generation steps into reusable workflows with our visual canvas editor. Automate your creative pipeline." },
  { step: "04", title: "Sell & earn", description: "List your workflow templates on NgatStore. Earn 100% credits from sales and grow your creator business." },
] as const;

export const vipBullets = [
  "Create unlimited workflows",
  "Premium workflow nodes (Extend, Pose, Camera Control, Voice)",
  "Workflow AI Agent assistant",
  "Gallery access & management",
  "Duplicate and share workflows by email",
  "Selected offers include bonus credits",
] as const;

export const faqItems = [
  { q: "What is the difference between Basic and VIP?", a: "Basic gives you access to Image Studio, Video Studio, and up to 3 workflows. VIP unlocks unlimited workflows, premium nodes, Gallery, Workflow AI Agent, and sharing tools." },
  { q: "Which payment methods are available?", a: "We support bank transfer, e-wallet (GoPay, OVO, Dana), and credit/debit cards through our Midtrans payment gateway." },
  { q: "Can I sell templates on NgatStore?", a: "Yes! Any creator can list workflow templates on NgatStore. You earn 100% of the credit value from every sale." },
  { q: "Can AI-generated content be used commercially?", a: "Absolutely. All generated content is positioned for business and marketing use cases. You own full commercial rights to your creations." },
  { q: "How does the credit system work?", a: "Credits are a unified currency across all tools. Images cost 0.25 credits, videos cost 3 credits. Purchase credit packs or earn credits by selling templates." },
  { q: "Is there a free trial?", a: "New accounts get a 7-day VIP trial with full access to premium features, plus starter credits to explore all creation tools." },
] as const;

export const supportCards = [
  { badge: "FREE", title: "WhatsApp Community", description: "Join the content creator community and get tips, ideas, and workflow inspiration from fellow creators.", href: "https://chat.whatsapp.com/" },
  { badge: "PRIORITY", title: "CS Admin Support", description: "Contact customer support for direct help, payment issues, and production blockers. Fast response guaranteed.", href: "https://wa.me/" },
] as const;

export const marqueeItems = [
  "Image Generation", "Video Creation", "Workflow Canvas", "NgatStore", "AI Agent",
  "Product Ads", "Poster Drafts", "Style Control", "Camera Control", "Hi-Res Output",
] as const;
