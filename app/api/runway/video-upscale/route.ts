import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

const USEAPI_BASE = "https://api.useapi.net/v1/runwayml"

// Helper function
async function safeParseResponse(res: Response, context: string) {
  try {
    const text = await res.text()
    if (!text) return null
    return JSON.parse(text)
  } catch (err) {
    console.error(`[${context}] Failed to parse JSON. Status: ${res.status}`)
    return null
  }
}

export async function POST(req: NextRequest) {
  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { videoAssetId } = body

    if (!videoAssetId) {
      return NextResponse.json({ error: "videoAssetId is required" }, { status: 400 })
    }

    const payload = {
      videoAssetId,
      exploreMode: true // FREE upscale
    }

    const response = await fetch(`${USEAPI_BASE}/videos/upscale`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await safeParseResponse(response, "video-upscale-post")
    if (!data) {
      return NextResponse.json({ error: "Failed to parse API response" }, { status: response.status || 500 })
    }

    if (!response.ok) {
      return NextResponse.json({ error: data.error || `Error ${response.status}` }, { status: response.status })
    }

    const taskId = (data.task as Record<string, unknown> | undefined)?.taskId || data.taskId
    if (!taskId) {
      return NextResponse.json({ error: "No taskId returned" }, { status: 500 })
    }

    return NextResponse.json({ taskId })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId")
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 })
  }

  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  try {
    const res = await fetch(`${USEAPI_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })

    const data = await safeParseResponse(res, "video-upscale-poll")
    if (!data) {
      return NextResponse.json({ error: "Failed to parse poll response" }, { status: 500 })
    }

    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ taskId, status: "processing" })
      return NextResponse.json({ taskId, status: "error", error: data.error || "Poll failed" }, { status: 500 })
    }

    const taskStatus = data.status as string

    if (taskStatus === "PENDING" || taskStatus === "RUNNING" || taskStatus === "THROTTLED") {
      return NextResponse.json({
        taskId,
        status: "processing",
        progressRatio: data.progressRatio ? parseFloat(data.progressRatio) : undefined,
        progressText: data.progressText as string | undefined,
      })
    }

    if (taskStatus === "FAILED" || taskStatus === "CANCELLED") {
      return NextResponse.json({ taskId, status: "error", error: data.error || "Task failed" }, { status: 500 })
    }

    if (taskStatus === "SUCCEEDED") {
      const artifacts = (data.artifacts as Record<string, unknown>[]) || []
      const videos = artifacts.map((a) => ({
        url: a.url as string,
        assetId: a.assetId as string,
        previewUrls: a.previewUrls as string[] | undefined,
        metadata: a.metadata as Record<string, unknown> | undefined,
      }))

      return NextResponse.json({
        taskId,
        status: "done",
        artifacts: videos,
      })
    }

    return NextResponse.json({ taskId, status: "processing" })
  } catch (error) {
    return NextResponse.json({ taskId, status: "error", error: "Poll error" }, { status: 500 })
  }
}

export const maxDuration = 300
