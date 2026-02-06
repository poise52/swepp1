<template>
  <div class="ms-menu">
    <div class="ms-menu__header">
      <h1 class="ms-menu__title">Сапёр</h1>
      <button class="ms-menu__theme-btn" @click="toggleTheme" :title="theme === 'light' ? 'Тёмная тема' : 'Светлая тема'">
        {{ theme === 'light' ? '🌙' : '☀️' }}
      </button>
    </div>

    <div class="ms-menu__section">
      <div class="ms-menu__section-title">Уровень</div>
      <div class="ms-menu__difficulties">
        <label
            v-for="diff in difficulties"
            :key="diff.name"
            class="ms-menu__radio ms-menu__radio--diff"
            :class="{ 'ms-menu__radio--selected': selectedDifficulty === diff.name }"
        >
          <input
              type="radio"
              name="difficulty"
              :value="diff.name"
              v-model="selectedDifficulty"
          />
          <span class="ms-menu__radio-mark"></span>
          <span class="ms-menu__radio-content">
            <span class="ms-menu__radio-label">{{ diff.name }}</span>
            <span class="ms-menu__radio-info">{{ diff.cols }}×{{ diff.rows }} · {{ diff.mines }} мин</span>
          </span>
        </label>

        <div class="ms-menu__custom-difficulty">
          <label
              class="ms-menu__radio ms-menu__radio--diff"
              :class="{ 'ms-menu__radio--selected': selectedDifficulty === 'custom' }"
          >
            <input
                type="radio"
                name="difficulty"
                value="custom"
                v-model="selectedDifficulty"
            />
            <span class="ms-menu__radio-mark"></span>
            <span class="ms-menu__radio-content">
              <span class="ms-menu__radio-label">Своя</span>
              <span v-if="selectedDifficulty !== 'custom'" class="ms-menu__radio-info">настроить размер</span>
            </span>
          </label>
          <div v-if="selectedDifficulty === 'custom'" class="ms-menu__custom-inline">
            <div class="ms-menu__inline-field">
              <label>Ширина:</label>
              <input type="number" v-model.number="customCols" :min="MIN_SIZE" :max="MAX_SIZE" />
            </div>
            <div class="ms-menu__inline-field">
              <label>Высота:</label>
              <input type="number" v-model.number="customRows" :min="MIN_SIZE" :max="MAX_SIZE" />
            </div>
            <div class="ms-menu__inline-field">
              <label>Мины:</label>
              <input type="number" v-model.number="customMines" :min="MIN_MINES" :max="maxMines" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="ms-menu__section">
      <div class="ms-menu__section-title">Настройки</div>

      <div class="ms-menu__settings-grid">
        <div class="ms-menu__setting-group">
          <div class="ms-menu__setting-label">Создание поля</div>
          <div class="ms-menu__options">
            <label class="ms-menu__radio ms-menu__radio--small">
              <input type="radio" name="fieldGen" value="safe-start" v-model="settings.fieldGeneration" />
              <span class="ms-menu__radio-mark"></span>
              <span class="ms-menu__radio-label">Безопасный старт</span>
            </label>
            <label class="ms-menu__radio ms-menu__radio--small">
              <input type="radio" name="fieldGen" value="random" v-model="settings.fieldGeneration" />
              <span class="ms-menu__radio-mark"></span>
              <span class="ms-menu__radio-label">Случайное</span>
            </label>
          </div>
        </div>

        <div class="ms-menu__setting-group">
          <div class="ms-menu__setting-label">Опции</div>
          <div class="ms-menu__options">
            <label class="ms-menu__checkbox">
              <input type="checkbox" v-model="settings.showQuestionMarks" />
              <span class="ms-menu__checkbox-mark"></span>
              <span class="ms-menu__checkbox-label">Знаки вопроса</span>
            </label>
            <label class="ms-menu__checkbox">
              <input type="checkbox" v-model="settings.enableChord" />
              <span class="ms-menu__checkbox-mark"></span>
              <span class="ms-menu__checkbox-label">Разоружение</span>
            </label>
            <label class="ms-menu__checkbox">
              <input type="checkbox" v-model="settings.devMode" />
              <span class="ms-menu__checkbox-mark"></span>
              <span class="ms-menu__checkbox-label">Режим разработчика</span>
            </label>
          </div>
        </div>
      </div>

      <div class="ms-menu__scale-row">
        <span class="ms-menu__setting-label">Масштаб</span>
        <div class="ms-menu__scale">
          <input
              type="range"
              min="50"
              max="150"
              step="10"
              v-model.number="settings.scale"
          />
          <span class="ms-menu__scale-value">{{ settings.scale }}%</span>
        </div>
      </div>

      <div class="ms-menu__seed-row">
        <span class="ms-menu__setting-label">Seed</span>
        <input type="number" v-model="customSeed" placeholder="случайный" />
      </div>
    </div>

    <button
        class="ms-menu__btn ms-menu__btn--start"
        :disabled="!isValid"
        @click="startGame"
    >
      Начать игру
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useSettings } from '@/composables/useSettings'

const { theme, toggleTheme } = useTheme()
const { settings } = useSettings()

interface Difficulty {
  name: string
  rows: number
  cols: number
  mines: number
}

const difficulties: Difficulty[] = [
  { name: 'Новичок', rows: 9, cols: 9, mines: 10 },
  { name: 'Любитель', rows: 16, cols: 16, mines: 40 },
  { name: 'Эксперт', rows: 16, cols: 30, mines: 99 }
]

const emit = defineEmits<{
  start: [rows: number, cols: number, mines: number, difficulty: string, seed?: number]
}>()

const selectedDifficulty = ref('Новичок')
const customRows = ref(10)
const customCols = ref(10)
const customMines = ref(15)
const customSeed = ref('')

const MIN_SIZE = 5
const MAX_SIZE = 50
const MIN_MINES = 1

const maxMines = computed(() => {
  return Math.floor(customRows.value * customCols.value * 0.8)
})

const isValid = computed(() => {
  if (selectedDifficulty.value === 'custom') {
    return customRows.value >= MIN_SIZE &&
        customRows.value <= MAX_SIZE &&
        customCols.value >= MIN_SIZE &&
        customCols.value <= MAX_SIZE &&
        customMines.value >= MIN_MINES &&
        customMines.value <= maxMines.value
  }
  return true
})

const startGame = () => {
  let rows: number, cols: number, mines: number
  const difficulty = selectedDifficulty.value === 'custom' ? 'Своя' : selectedDifficulty.value

  if (selectedDifficulty.value === 'custom') {
    rows = customRows.value
    cols = customCols.value
    mines = customMines.value
  } else {
    const diff = difficulties.find(d => d.name === selectedDifficulty.value)!
    rows = diff.rows
    cols = diff.cols
    mines = diff.mines
  }

  const seed = customSeed.value ? parseInt(customSeed.value) : undefined
  emit('start', rows, cols, mines, difficulty, seed)
}
</script>
