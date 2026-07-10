import type { ExtensionManifest } from '@shared/types'
import { diceExtension } from './dice'
import { translatorExtension } from './translator'
import { ttsExtension } from './tts'

export const builtinExtensions: ExtensionManifest[] = [
  diceExtension,
  translatorExtension,
  ttsExtension,
]

export function getBuiltinExtensions(): ExtensionManifest[] {
  return builtinExtensions
}
