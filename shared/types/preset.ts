export interface GenerationPreset {
  id: string
  name: string
  temperature: number
  max_tokens: number
  top_p: number
  top_k: number
  frequency_penalty: number
  presence_penalty: number
  repetition_penalty: number
  stop: string[]
  stream: boolean
  createdAt: number
  updatedAt: number
}