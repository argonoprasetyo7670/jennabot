"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"

// Dynamic import to avoid SSR issues with lottie-react
const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

/**
 * 5 free Lottie animation URLs from LottieFiles CDN.
 * These are creative AI/generation-themed loading animations.
 *
 * HOW TO GET MORE:
 * 1. Go to https://lottiefiles.com
 * 2. Search for "loading", "AI", "creative", "spinner", etc.
 * 3. Pick a FREE animation → click "Download" → "Lottie JSON"
 * 4. Save the JSON file to /public/lottie/ folder
 * 5. Add the path to the LOTTIE_PATHS array below
 *
 * OR use LottieFiles CDN URLs directly:
 * 1. On the animation page, click the share/embed button
 * 2. Copy the JSON URL (ends in .json)
 * 3. Add it to the LOTTIE_URLS array below
 */

// Local JSON files (preferred — no external dependency)
// Place .json files in /public/lottie/ and add paths here
const LOTTIE_PATHS = [
  "/lottie/loading-1.json",
  "/lottie/loading-2.json",
  "/lottie/loading-3.json",
  "/lottie/loading-4.json",
  "/lottie/loading-5.json",
]

interface LottieLoadingProps {
  /** Size of the animation container */
  size?: number
  /** Optional className for the wrapper */
  className?: string
  /** Optional specific index (0-4) instead of random */
  index?: number
}

export function LottieLoading({ size = 120, className = "", index }: LottieLoadingProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [animationData, setAnimationData] = useState<any>(null)
  const [failed, setFailed] = useState(false)

  // Pick a random index once on mount (stable across re-renders)
  const selectedIndex = useMemo(
    () => index ?? Math.floor(Math.random() * LOTTIE_PATHS.length),
    [index]
  )

  useEffect(() => {
    const path = LOTTIE_PATHS[selectedIndex]

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lottie")
        return res.json()
      })
      .then(setAnimationData)
      .catch(() => setFailed(true))
  }, [selectedIndex])

  // Fallback: CSS spinner if Lottie fails to load
  if (failed || !animationData) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-500"
            style={{ width: size * 0.5, height: size * 0.5 }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        animationData={animationData}
        loop
        autoplay
        style={{ width: size, height: size }}
      />
    </div>
  )
}

/**
 * Smaller version for inline use (notification items, buttons, etc.)
 */
export function LottieLoadingSmall({ size = 24, className = "" }: { size?: number; className?: string }) {
  return <LottieLoading size={size} className={className} />
}
