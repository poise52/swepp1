<template>
  <div class="minesweeper__header">
    <button class="minesweeper__back pi pi-arrow-left" @click="emit('back')" title="В меню"></button>
    <div class="minesweeper__display">{{ formatNumber(minesLeft) }}</div>
    <button class="minesweeper__restart" @click="emit('restart')" title="Перезапустить (тот же seed)">
      {{ getEmoji(gameStatus) }}
    </button>
    <div class="minesweeper__display">{{ formatNumber(time) }}</div>
    <button class="minesweeper__new-game pi pi-refresh" @click="emit('newGame')" title="Новая игра"></button>
  </div>
  <div class="minesweeper__seed">seed: {{ seed }}</div>
</template>

<script setup lang="ts">
import type { GameStatus } from '@/composables/useMinesweeper'

interface Props {
  minesLeft: number
  time: number
  gameStatus: GameStatus
  seed: number
}

defineProps<Props>()

const emit = defineEmits<{
  restart: []
  newGame: []
  back: []
}>()

const formatNumber = (num: number): string => {
  return String(Math.min(999, Math.max(-99, num))).padStart(3, '0')
}

const getEmoji = (status: GameStatus): string => {
  switch (status) {
    case 'won': return '😎'
    case 'lost': return '😵'
    default: return '🙂'
  }
}
</script>
