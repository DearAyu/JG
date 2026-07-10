export type WorldBookEntryPosition = 'before_char' | 'after_char' | 'at_depth'

export interface WorldBookEntry {
  id: string
  keys: string[]
  secondaryKeys: string[]
  content: string
  comment: string
  enabled: boolean
  selective: boolean
  insertionOrder: number
  position: WorldBookEntryPosition
  depth: number
  constant: boolean
}

export interface WorldBook {
  id: string
  name: string
  description: string
  entries: WorldBookEntry[]
  createdAt: number
  updatedAt: number
}