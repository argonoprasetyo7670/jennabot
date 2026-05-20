// Next.js 16.2.2 workStore bug (GitHub #87719): static prerendering fails
// with "Expected workStore to be initialized" during build.
// Force dynamic rendering + no-store cache for all pages.
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import type { Metadata } from "next";
import "./globals.css";
import { Noto_Sans, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const playfairDisplayHeading = Playfair_Display({ subsets: ['latin'], variable: '--font-heading' });

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' });

// Use generateMetadata instead of static `metadata` export.
// Static metadata triggers createMetadataComponents → workAsyncStorage.getStore()
// during /_global-error prerendering, which fails because there's no request context.
// (Next.js 16.2.2 bug, GitHub #87719)
export function generateMetadata(): Metadata {
  return {
    title: "Jennabot - Unlimited AI Generator ",
    description:
      "Landing page for Jennabot with editorial sections, product previews, and conversion blocks.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", notoSans.variable, playfairDisplayHeading.variable)} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
