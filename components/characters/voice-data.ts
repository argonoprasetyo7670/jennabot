// Shared voice metadata used across character/voice UI
export type VoiceGender = "male" | "female"

export interface VoiceInfo {
  name: string
  gender: VoiceGender
  style: string
}

export const VOICE_DATA: VoiceInfo[] = [
  { name: "Achernar", gender: "female", style: "Soft, warm" },
  { name: "Achird", gender: "male", style: "Friendly, kind" },
  { name: "Algenib", gender: "male", style: "Gravelly, textured" },
  { name: "Algieba", gender: "male", style: "Smooth, flowing" },
  { name: "Alnilam", gender: "male", style: "Confident, firm" },
  { name: "Aoede", gender: "female", style: "Breezy, relaxed" },
  { name: "Autonoe", gender: "female", style: "Bright, cheerful" },
  { name: "Callirrhoe", gender: "female", style: "Friendly, easy-going" },
  { name: "Charon", gender: "male", style: "Calm, professional" },
  { name: "Despina", gender: "female", style: "Smooth, gentle" },
  { name: "Enceladus", gender: "male", style: "Soft, breathy" },
  { name: "Erinome", gender: "female", style: "Clear, articulate" },
  { name: "Fenrir", gender: "male", style: "Passionate, energetic" },
  { name: "Gacrux", gender: "female", style: "Mature, composed" },
  { name: "Iapetus", gender: "male", style: "Clear, clean" },
  { name: "Kore", gender: "female", style: "Strong, firm" },
  { name: "Laomedeia", gender: "female", style: "Positive, upbeat" },
  { name: "Leda", gender: "female", style: "Youthful, energetic" },
  { name: "Orus", gender: "male", style: "Calm, firm" },
  { name: "Puck", gender: "male", style: "Upbeat, lively" },
  { name: "Pulcherrima", gender: "male", style: "Forward, enterprising" },
  { name: "Rasalgethi", gender: "male", style: "Professional narrator" },
  { name: "Sadachbia", gender: "male", style: "Lively, vivid" },
  { name: "Sadaltager", gender: "male", style: "Knowledgeable" },
  { name: "Schedar", gender: "male", style: "Even, steady" },
  { name: "Sulafat", gender: "female", style: "Warm" },
  { name: "Umbriel", gender: "male", style: "Relaxed, easy-going" },
  { name: "Vindemiatrix", gender: "female", style: "Gentle, delicate" },
  { name: "Zephyr", gender: "female", style: "Bright, clear" },
  { name: "Zubenelgenubi", gender: "male", style: "Casual, relaxed" },
]

/** Map for O(1) lookup by voice name */
export const VOICE_MAP = new Map(VOICE_DATA.map(v => [v.name, v]))

/** System voice preview URL */
export function getVoicePreviewUrl(name: string) {
  return `https://www.gstatic.com/aitestkitchen/voices/samples/${name}.wav`
}
