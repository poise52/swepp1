<template>
  <MinesweeperMenu v-if="showMenu" @start="startGame" />

  <div v-else :class="gameClass" :style="gameStyle">
    <MinesweeperHeader
        :mines-left="minesLeft"
        :time="time"
        :game-status="gameStatus"
        :seed="seed"
        @restart="restartGame"
        @new-game="newGame"
        @back="backToMenu"
    />
    <MinesweeperBoard
        :board="board"
        :game-status="gameStatus"
        :cols="cols"
        :highlighted-cells="highlightedCells"
        :dev-mode="settings.devMode"
        @cell-open="handleCellOpen"
        @cell-mark="handleCellMark"
        @cell-highlight="highlightNeighbors"
        @clear-highlight="clearHighlight"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMinesweeper } from '@/composables/useMinesweeper'
import { useSettings } from '@/composables/useSettings'
import MinesweeperMenu from './MinesweeperMenu.vue'
import MinesweeperHeader from './MinesweeperHeader.vue'
import MinesweeperBoard from './MinesweeperBoard.vue'

const showMenu = ref(true)
const { settings } = useSettings()

const {
  board,
  gameStatus,
  minesCount,
  flagsCount,
  time,
  cols,
  rows,
  seed,
  highlightedCells,
  initGame,
  openCell,
  cycleMark,
  restartGame,
  newGame,
  highlightNeighbors,
  clearHighlight
} = useMinesweeper()

const minesLeft = computed(() => minesCount.value - flagsCount.value)

const gameClass = computed(() => {
  return {
    'minesweeper': true,
    'minesweeper--won': gameStatus.value === 'won',
    'minesweeper--lost': gameStatus.value === 'lost'
  }
})

const gameStyle = computed(() => ({
  transform: `scale(${settings.value.scale / 100})`,
  transformOrigin: 'top center'
}))

const handleCellOpen = (row: number, col: number) => {
  openCell(row, col, settings.value)
}

const handleCellMark = (row: number, col: number) => {
  cycleMark(row, col, settings.value)
}

const startGame = (rows: number, colsCount: number, mines: number, customSeed?: number) => {
  initGame(rows, colsCount, mines, customSeed, settings.value)
  showMenu.value = false
}

const backToMenu = () => {
  showMenu.value = true
}
</script>
