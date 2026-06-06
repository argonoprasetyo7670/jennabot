const fs = require('fs');
const data = JSON.parse(fs.readFileSync('response.json', 'utf8'));

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

  return []
}

console.log(extractMedia(data));
