"use client"

import { useState, useRef } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { DownloadIcon, QrCodeIcon, Share2Icon } from "lucide-react"

export default function QRGeneratorPage() {
  const [text, setText] = useState("")
  const [fgColor, setFgColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("#FFFFFF")
  const [size, setSize] = useState(256)
  
  const qrRef = useRef<HTMLDivElement>(null)

  const handleDownload = () => {
    if (!qrRef.current) return
    const canvas = qrRef.current.querySelector("canvas")
    if (!canvas) return

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream")
    let downloadLink = document.createElement("a")
    downloadLink.href = pngUrl
    downloadLink.download = "qrcode.png"
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Tools", href: "/dashboard" },
        { label: "QR Code Generator" },
      ]} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Editor Side */}
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-6 animate-fade-up">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <QrCodeIcon className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Generator QR Code</h2>
                <p className="text-xs text-muted-foreground">Ubah teks atau URL menjadi QR Code instan</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground/80">Teks / URL</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Masukkan teks atau URL di sini..."
                  className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground/80">Warna QR</label>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded bg-transparent outline-none border-none"
                    />
                    <span className="text-xs text-muted-foreground uppercase">{fgColor}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground/80">Warna Latar</label>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded bg-transparent outline-none border-none"
                    />
                    <span className="text-xs text-muted-foreground uppercase">{bgColor}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground/80">Ukuran</label>
                  <span className="text-xs text-muted-foreground">{size}px</span>
                </div>
                <input
                  type="range"
                  min="128"
                  max="512"
                  step="32"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Preview Side */}
          <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center min-h-[400px] animate-fade-up border border-border/50 bg-gradient-to-br from-muted/20 to-muted/5">
            <h3 className="text-sm font-medium text-foreground/70 mb-6 w-full text-left">Preview QR Code</h3>
            
            {text ? (
              <div className="flex flex-col items-center gap-8">
                <div 
                  ref={qrRef}
                  className="rounded-2xl bg-white p-4 shadow-2xl transition-all duration-300 hover:scale-105 border border-border"
                  style={{ backgroundColor: bgColor }}
                >
                  <QRCodeCanvas
                    value={text}
                    size={size}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                
                <Button 
                  onClick={handleDownload}
                  className="btn-glow flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl px-8"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download PNG
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                <QrCodeIcon className="w-16 h-16 opacity-20" />
                <p className="text-sm font-medium">Mulai ketik untuk melihat QR Code</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
