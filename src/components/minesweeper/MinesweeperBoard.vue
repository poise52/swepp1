<template>
  <div
      class="minesweeper__board"
      :style="{ gridTemplateColumns: `repeat(${cols}, 32px)` }"
      @contextmenu.prevent
  >
    <div v-for="(row, rowIndex) in board" :key="rowIndex" class="minesweeper__row">
      <MinesweeperCell
          v-for="cell in row"
          :key="`${cell.row}-${cell.col}`"
          :cell="cell"
          :game-status="gameStatus"
          :is-highlighted="highlightedCells.has(`${cell.row}-${cell.col}`)"
          :dev-mode="devMode"
          @open="(r, c) => emit('cellOpen', r, c)"
          @mark="(r, c) => emit('cellMark', r, c)"
          @highlight="(r, c) => emit('cellHighlight', r, c)"
          @clear-highlight="emit('clearHighlight')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Cell } from '@/composables/useMinesweeper'
import MinesweeperCell from './MinesweeperCell.vue'

interface Props {
  board: Cell[][]
  gameStatus: string
  cols: number
  highlightedCells: Set<string>
  devMode: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  cellOpen: [row: number, col: number]
  cellMark: [row: number, col: number]
  cellHighlight: [row: number, col: number]
  clearHighlight: []
}>()
</script>
