const fs = require('fs');

function extractMedia(data) {
  const processMediaArray = (arr) => {
    return arr.map((m) => {
      const gen = m.image?.generatedImage
      const rawMgId = gen?.mediaGenerationId
      const resolvedMgId = rawMgId && typeof rawMgId === "object" ? rawMgId.mediaGenerationId : rawMgId
      return {
        url: gen?.fifeUrl || gen?.uri,
        mediaGenerationId: resolvedMgId,
      }
    }).filter((m) => m.url)
  }

  if (Array.isArray(data.media)) return processMediaArray(data.media)
  if (Array.isArray(data.images)) return data.images

  const response = data.response
  if (response && Array.isArray(response.media)) return processMediaArray(response.media)
  if (response && Array.isArray(response.images)) return response.images

  if (response && Array.isArray(response.operations)) {
    return response.operations
      .filter((op) => {
        const status = (op.status || "").toUpperCase()
        return status.includes("SUCCESS") || status.includes("SUCCEEDED")
      })
      .map((op) => {
        const image = op.image
        const imageUrl = image?.uri || image?.fifeUrl
        const rawMgId = op.mediaGenerationId
        const resolvedMgId = rawMgId && typeof rawMgId === "object" ? rawMgId.mediaGenerationId : rawMgId
        return {
          url: imageUrl,
          mediaGenerationId: resolvedMgId,
        }
      })
      .filter((m) => m.url)
  }

  return []
}

const payload = {
  "response": {
    "media": [
      {
        "image": {
          "dimensions": { "height": 1376, "width": 768 },
          "generatedImage": {
            "fifeUrl": "https://flow-content.google/image/...",
            "mediaGenerationId": "user:2232-email:...-image:..."
          }
        },
        "name": "6e204d95-...",
        "workflowId": "76cf0034-..."
      }
    ]
  },
  "status": "completed"
};

console.log(extractMedia(payload));
