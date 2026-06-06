"use client"

/**
 * node-loading-overlay.tsx
 * Lottie loading overlay shown inside workflow nodes when they are running.
 * Uses lottie-react (already installed).
 */

import Lottie from "lottie-react"

// Minimal inline Lottie JSON for a smooth spinning gradient arc
// This is a compact, dependency-free loading animation
const LOADING_LOTTIE = {
  "v": "5.7.4", "fr": 60, "ip": 0, "op": 60, "w": 80, "h": 80,
  "assets": [],
  "layers": [{
    "ty": 4, "nm": "ring", "sr": 1, "ks": {
      "o": { "a": 0, "k": 100 }, "r": { "a": 1, "k": [{ "i": { "x": [0.83], "y": [0.83] }, "o": { "x": [0.17], "y": [0.17] }, "t": 0, "s": [0] }, { "t": 60, "s": [360] }] },
      "p": { "a": 0, "k": [40, 40, 0] }, "a": { "a": 0, "k": [0, 0, 0] }, "s": { "a": 0, "k": [100, 100, 100] }
    },
    "ao": 0, "shapes": [{
      "ty": "el", "s": { "a": 0, "k": [56, 56] }, "p": { "a": 0, "k": [0, 0] }, "nm": "Ellipse"
    }, {
      "ty": "st", "c": { "a": 0, "k": [0.545, 0.361, 0.965, 1] }, "o": { "a": 0, "k": 100 },
      "w": { "a": 0, "k": 5 }, "lc": 2, "lj": 2, "d": [{ "n": "d", "nm": "dash", "v": { "a": 0, "k": 90 } }, { "n": "o", "nm": "offset", "v": { "a": 0, "k": 0 } }]
    }, { "ty": "fl", "c": { "a": 0, "k": [0, 0, 0, 0] }, "o": { "a": 0, "k": 0 } }],
    "ip": 0, "op": 60, "st": 0, "bm": 0
  }]
}

interface NodeLoadingOverlayProps {
  label?: string
  size?: "sm" | "md"
}

export function NodeLoadingOverlay({ label, size = "md" }: NodeLoadingOverlayProps) {
  const lottieSz = size === "sm" ? 36 : 56

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm gap-2">
      <Lottie
        animationData={LOADING_LOTTIE}
        loop
        autoplay
        style={{ width: lottieSz, height: lottieSz }}
      />
      {label && (
        <span className="text-[10px] font-medium text-violet-300 animate-pulse">
          {label}
        </span>
      )}
    </div>
  )
}

/** Map node type → loading label in Indonesian */
export function getNodeLoadingLabel(nodeType?: string): string {
  switch (nodeType) {
    case "uploadNode":    return "Mengupload..."
    case "promptNode":    return "Menyiapkan..."
    case "imageGenNode":  return "Membuat gambar..."
    case "videoGenNode":  return "Membuat video..."
    case "galleryNode":   return "Menyimpan..."
    case "outputNode":    return "Memproses..."
    default:              return "Memproses..."
  }
}
