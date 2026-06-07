import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { deductCredits, CREDIT_COST_STORYBOARD } from "@/lib/credit-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const body = await req.json()
    const { productName, description, targetAudience, duration, scenesCount = 5 } = body

    if (!productName || !description) {
      return NextResponse.json({ error: "Nama produk dan deskripsi wajib diisi" }, { status: 400 })
    }

    // Check credits
    const credits = await prisma.user_credits.findUnique({ where: { userId: session.user.id } })
    const currentBalance = credits?.balance ?? 0

    if (currentBalance < CREDIT_COST_STORYBOARD) {
      return NextResponse.json(
        { error: `Kredit tidak cukup. Butuh ${CREDIT_COST_STORYBOARD}, saldo: ${currentBalance}` },
        { status: 402 }
      )
    }

    const systemPrompt = `Anda adalah seorang ahli video marketing dan UGC creator profesional.
Tugas Anda adalah membuat struktur storyboard video promosi berdasarkan detail produk yang diberikan.

Output HARUS berformat JSON dengan struktur berikut persis:
{
  "scenes": [
    {
      "number": 1,
      "name": "HOOK",
      "duration": "Berapa detik scene ini berlangsung (misal: 0-5 Detik)",
      "visual": "Deskripsi adegan berbahasa Indonesia yang detail dan jelas.",
      "imagePrompt": "Detailed english prompt describing the visual scene to be passed to an AI Image Generator. Focus on subject, action, environment, lighting, and camera angle. Example: 'A commercial shot of a young man spraying tire cleaner on his car wheel, sunny day, 4k, hyperrealistic'.",
      "narasi": "Kata-kata voice over/narasi.",
      "teksOverlay": "Teks singkat yang muncul di layar.",
      "keterangan": "Instruksi kamera/talent tambahan."
    }
    // ... total \${scenesCount} scenes
  ],
  "benefitUtama": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "caraPakai": [
    { "step": 1, "title": "SEMPROT", "description": "Semprotkan merata." },
    { "step": 2, "title": "RATAKAN", "description": "Gunakan microfiber." }
  ],
  "produkInfo": ["Nama: Produk", "Isi: 400ml", "Info penting lainnya"],
  "ctaOptions": ["Pesan 1", "Pesan 2", "Pesan 3"]
}

PENTING:
- Gunakan bahasa Indonesia yang engaging dan menjual (ala UGC TikTok).
- Bagilah total durasi video (${duration || "15-30 detik"}) secara logis ke dalam ${scenesCount} scene. Jangan cuma 2 detik per scene!
- Scene pertama selalu HOOK yang menarik perhatian.
- Scene terakhir selalu Call to Action (CTA).`

    const userPrompt = `Buatkan storyboard untuk produk berikut:
Nama Produk: ${productName}
Deskripsi/Kelebihan: ${description}
Target Audiens: ${targetAudience || "Umum"}
Jumlah Scene: ${scenesCount}
`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error("[storyboard] OpenAI Error:", data)
      return NextResponse.json({ error: data.error?.message || "Failed to generate storyboard" }, { status: 500 })
    }

    const resultText = data.choices[0].message.content
    let parsedResult
    try {
      parsedResult = JSON.parse(resultText)
    } catch (err) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    // Deduct credits only after successful generation
    await deductCredits(session.user.id, CREDIT_COST_STORYBOARD, "storyboard-generator", "Generate Storyboard JSON")

    return NextResponse.json({
      success: true,
      data: parsedResult,
      creditsDeducted: CREDIT_COST_STORYBOARD
    })

  } catch (error: any) {
    console.error("[storyboard] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
