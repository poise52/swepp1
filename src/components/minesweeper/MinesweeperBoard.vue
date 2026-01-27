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
          @open="(r, c) => emit('cellOpen', r, c)"
          @mark="(r, c) => emit('cellMark', r, c)"
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
}

defineProps<Props>()

const emit = defineEmits<{
  cellOpen: [row: number, col: number]
  cellMark: [row: number, col: number]
}>()
</script>
