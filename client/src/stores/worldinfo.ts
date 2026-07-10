import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WorldBook, WorldBookEntry } from '@shared/types'
import { api } from '@/services/api'

export const useWorldInfoStore = defineStore('worldinfo', () => {
  const books = ref<(WorldBook & { entryCount?: number })[]>([])
  const activeBook = ref<WorldBook | null>(null)
  const isLoaded = ref(false)

  const bookCount = computed(() => books.value.length)

  async function loadBooks() {
    try {
      books.value = await api.getWorldBooks()
    } catch (e) {
      console.error('Failed to load world books:', e)
    }
    isLoaded.value = true
  }

  async function loadBook(id: string) {
    try {
      activeBook.value = await api.getWorldBook(id)
      return activeBook.value
    } catch (e) {
      console.error('Failed to load world book:', e)
      return null
    }
  }

  async function createBook(name: string, description?: string): Promise<WorldBook> {
    const book = await api.createWorldBook({ name, description })
    books.value.unshift({ ...book, entryCount: 0 })
    return book
  }

  async function updateBook(id: string, data: Partial<WorldBook>): Promise<WorldBook> {
    const updated = await api.updateWorldBook(id, data)
    const idx = books.value.findIndex((b) => b.id === id)
    if (idx !== -1) {
      books.value[idx] = { ...books.value[idx], ...updated, entryCount: updated.entries.length }
    }
    if (activeBook.value?.id === id) {
      activeBook.value = updated
    }
    return updated
  }

  async function deleteBook(id: string) {
    await api.deleteWorldBook(id)
    books.value = books.value.filter((b) => b.id !== id)
    if (activeBook.value?.id === id) {
      activeBook.value = null
    }
  }

  async function addEntry(bookId: string, data?: Partial<WorldBookEntry>): Promise<WorldBookEntry> {
    const entry = await api.addWorldBookEntry(bookId, data || {})
    if (activeBook.value?.id === bookId) {
      activeBook.value.entries.push(entry)
    }
    const book = books.value.find((b) => b.id === bookId)
    if (book) book.entryCount = (book.entryCount ?? 0) + 1
    return entry
  }

  async function updateEntry(
    bookId: string,
    entryId: string,
    data: Partial<WorldBookEntry>
  ): Promise<WorldBookEntry> {
    const updated = await api.updateWorldBookEntry(bookId, entryId, data)
    if (activeBook.value?.id === bookId) {
      const idx = activeBook.value.entries.findIndex((e) => e.id === entryId)
      if (idx !== -1) {
        activeBook.value.entries[idx] = updated
      }
    }
    return updated
  }

  async function deleteEntry(bookId: string, entryId: string) {
    await api.deleteWorldBookEntry(bookId, entryId)
    if (activeBook.value?.id === bookId) {
      activeBook.value.entries = activeBook.value.entries.filter((e) => e.id !== entryId)
    }
    const book = books.value.find((b) => b.id === bookId)
    if (book) book.entryCount = Math.max(0, (book.entryCount ?? 0) - 1)
  }

  async function saveAllEntries(bookId: string) {
    if (!activeBook.value || activeBook.value.id !== bookId) return
    await api.updateWorldBook(bookId, { entries: activeBook.value.entries })
    const book = books.value.find((b) => b.id === bookId)
    if (book) book.entryCount = activeBook.value.entries.length
  }

  async function scanEntries(bookId: string, messages: { content: string }[], scanDepth?: number) {
    return await api.scanWorldBook(bookId, messages, scanDepth)
  }

  function getBookForCharacter(characterWorldBookId?: string | null): WorldBook | null {
    if (!characterWorldBookId) return null
    return books.value.find((b) => b.id === characterWorldBookId) ?? null
  }

  return {
    books,
    activeBook,
    isLoaded,
    bookCount,
    loadBooks,
    loadBook,
    createBook,
    updateBook,
    deleteBook,
    addEntry,
    updateEntry,
    deleteEntry,
    saveAllEntries,
    scanEntries,
    getBookForCharacter,
  }
})