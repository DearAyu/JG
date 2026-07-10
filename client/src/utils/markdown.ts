import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function renderMarkdown(text: string): string {
  if (!text) return ''
  return marked.parse(text) as string
}

export function stripMarkdown(text: string): string {
  return text.replace(/[#*`~>_\-]/g, '').trim()
}
