<template>
  <MinesweeperMenu v-if="showMenu" @start="handleStart" />

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
import { ref, computed, watch } from 'vue'
import { useSettings } from '@/composables/useSettings'
import { api } from '@/services/api'
import { store } from '@/store'
import type { GameStatus, MinesweeperCell } from '@/types/api'
import MinesweeperMenu from './MinesweeperMenu.vue'
import MinesweeperHeader from './MinesweeperHeader.vue'
import MinesweeperBoard from './MinesweeperBoard.vue'

const showMenu = ref(true)
const currentDifficulty = ref('Новичок')
const { settings } = useSettings()
const gameId = ref<string | null>(null)
const board = ref<MinesweeperCell[][]>([])
const gameStatus = ref<GameStatus>('idle')
const minesCount = ref(0)
const time = ref(0)
const cols = ref(0)
const rows = ref(0)
const seed = ref(0)
const highlightedCells = ref<Set<string>>(new Set())
const lastParams = ref<{ rows: number; cols: number; mines: number; seed?: number } | null>(null)
const isBusy = ref(false)
const isLeavingGame = ref(false)

const flagsCount = computed(() => board.value.flat().filter(cell => cell.mark === 'flag').length)

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

const applyGameState = (state: any) => {
  if (isLeavingGame.value) return
  gameId.value = state.gameId
  board.value = state.board
  gameStatus.value = state.gameStatus
  rows.value = state.rows
  cols.value = state.cols
  minesCount.value = state.mines
  seed.value = state.seed
  time.value = state.time
}

const createGame = async (params: { rows: number; cols: number; mines: number; seed?: number }) => {
  isLeavingGame.value = false
  const state = await api.createMinesweeperGame({
    ...params,
    settings: {
      fieldGeneration: settings.value.fieldGeneration,
      showQuestionMarks: settings.value.showQuestionMarks,
      enableChord: settings.value.enableChord,
      devMode: settings.value.devMode
    }
  })
  applyGameState(state)
}

const isIgnorableGameError = (err: any): boolean => {
  const status = err?.response?.status
  return status === 404 || status === 410
}

const handleCellOpen = async (row: number, col: number) => {
  if (!gameId.value || isBusy.value) return
  isBusy.value = true
  try {
    const state = await api.revealMinesweeperCell(gameId.value, row, col)
    applyGameState(state)
  } catch (err) {
    if (!isIgnorableGameError(err) && !isLeavingGame.value) {
      console.error('Failed to reveal cell:', err)
    }
  } finally {
    isBusy.value = false
  }
}

const handleCellMark = async (row: number, col: number) => {
  if (!gameId.value || isBusy.value) return
  isBusy.value = true
  try {
    const state = await api.markMinesweeperCell(gameId.value, row, col)
    applyGameState(state)
  } catch (err) {
    if (!isIgnorableGameError(err) && !isLeavingGame.value) {
      console.error('Failed to mark cell:', err)
    }
  } finally {
    isBusy.value = false
  }
}

const handleStart = async (rowsCount: number, colsCount: number, mines: number, difficulty: string, customSeed?: number) => {
  currentDifficulty.value = difficulty
  lastParams.value = { rows: rowsCount, cols: colsCount, mines, seed: customSeed }
  await createGame(lastParams.value)
  showMenu.value = false
}

const backToMenu = async () => {
  isLeavingGame.value = true
  showMenu.value = true
  clearHighlight()
  const currentGameId = gameId.value
  gameId.value = null
  if (currentGameId) {
    try {
      await api.deleteMinesweeperGame(currentGameId)
    } catch (err) {
      if (!isIgnorableGameError(err)) {
        console.error('Failed to delete game session:', err)
      }
    }
  }
}

const restartGame = async () => {
  if (!lastParams.value) return
  await createGame({
    rows: lastParams.value.rows,
    cols: lastParams.value.cols,
    mines: lastParams.value.mines,
    seed: seed.value
  })
}

const newGame = async () => {
  if (!lastParams.value) return
  await createGame({
    rows: lastParams.value.rows,
    cols: lastParams.value.cols,
    mines: lastParams.value.mines
  })
}

const getNeighbors = (row: number, col: number) => {
  const out: MinesweeperCell[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value) {
        out.push(board.value[nr][nc])
      }
    }
  }
  return out
}

const highlightNeighbors = (row: number, col: number) => {
  const cell = board.value[row]?.[col]
  if (!cell || !cell.isOpen || cell.adjacentMines === 0) return
  highlightedCells.value.clear()
  for (const n of getNeighbors(row, col)) {
    if (!n.isOpen && n.mark !== 'flag') {
      highlightedCells.value.add(`${n.row}-${n.col}`)
    }
  }
}

const clearHighlight = () => {
  highlightedCells.value.clear()
}

watch(gameStatus, async (status) => {
  if (status === 'won' && store.getters.isAuthenticated) {
    try {
      await api.saveGameRecord({
        difficulty: currentDifficulty.value,
        rows: rows.value,
        cols: cols.value,
        mines: minesCount.value,
        time: time.value,
        seed: seed.value,
        won: true
      })
    } catch (err) {
      console.error('Failed to save record:', err)
    }
  }
})
</script>
