<template>
  <div class="minesweeper__header">
    <button class="minesweeper__back pi pi-arrow-left" @click="emit('back')" title="В меню"></button>
    <div class="minesweeper__display">{{ formatNumber(minesLeft) }}</div>
    <button
      v-if="gameControlsAllowed"
      class="minesweeper__restart"
      type="button"
      @click="emit('restart')"
      title="Перезапустить (тот же seed)"
    >
      {{ getEmoji(gameStatus) }}
    </button>
    <div v-else class="minesweeper__status-emoji" :title="'Онлайн-матч'">{{ getEmoji(gameStatus) }}</div>
    <div class="minesweeper__display">{{ formatNumber(time) }}</div>
    <button
      v-if="gameControlsAllowed"
      class="minesweeper__new-game pi pi-refresh"
      type="button"
      @click="emit('newGame')"
      title="Новая игра"
    />
  </div>
  <div class="minesweeper__seed">seed: {{ seed }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GameStatus } from '@/composables/useMinesweeper'

interface Props {
  minesLeft: number
  time: number
  gameStatus: GameStatus
  seed: number
  /** false in online ranked/casual — no restart / new-game (solo only). */
  gameControlsAllowed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  gameControlsAllowed: true
})

const emit = defineEmits<{
  restart: []
  newGame: []
  back: []
}>()

const formatNumber = (num: number): string => {
  return String(Math.min(999, Math.max(-99, num))).padStart(3, '0')
}

const gameControlsAllowed = computed(() => props.gameControlsAllowed)

const getEmoji = (status: GameStatus): string => {
  switch (status) {
    case 'won': return '😎'
    case 'lost': return '😵'
    default: return '🙂'
  }
}
</script>

<style scoped>
.minesweeper__status-emoji {
  font-size: clamp(1.25rem, 4vw, 1.85rem);
  line-height: 1;
  min-width: 2.25rem;
  text-align: center;
}
</style>
