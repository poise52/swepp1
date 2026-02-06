import { ref, watch } from 'vue'

export type FieldGeneration = 'random' | 'safe-start' | 'pure-logic'

export interface GameSettings {
  fieldGeneration: FieldGeneration
  showQuestionMarks: boolean
  enableChord: boolean
  scale: number
  devMode: boolean
}

const STORAGE_KEY = 'minesweeper-settings'

const defaultSettings: GameSettings = {
  fieldGeneration: 'safe-start',
  showQuestionMarks: true,
  enableChord: true,
  scale: 100,
  devMode: false
}

const loadSettings = (): GameSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch {}
  return { ...defaultSettings }
}

const settings = ref<GameSettings>(loadSettings())

export function useSettings() {
  watch(settings, (newSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
  }, { deep: true })

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    settings.value[key] = value
  }

  const resetSettings = () => {
    settings.value = { ...defaultSettings }
  }

  return {
    settings,
    updateSetting,
    resetSettings
  }
}
