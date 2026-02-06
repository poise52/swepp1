import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { GameSettings } from './useSettings'

export type CellMark = 'none' | 'flag' | 'question'
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

export interface Cell {
  row: number
  col: number
  isMine: boolean
  isOpen: boolean
  mark: CellMark
  adjacentMines: number
}

export interface MinesweeperState {
  board: Ref<Cell[][]>
  gameStatus: Ref<GameStatus>
  minesCount: Ref<number>
  flagsCount: ComputedRef<number>
  time: Ref<number>
  rows: Ref<number>
  cols: Ref<number>
  seed: Ref<number>
  highlightedCells: Ref<Set<string>>
}

export interface MinesweeperActions {
  initGame: (rows: number, cols: number, mines: number, customSeed?: number, settings?: GameSettings) => void
  openCell: (row: number, col: number, settings?: GameSettings) => void
  cycleMark: (row: number, col: number, settings?: GameSettings) => void
  restartGame: () => void
  newGame: () => void
  highlightNeighbors: (row: number, col: number) => void
  clearHighlight: () => void
}

function createSeededRandom(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function useMinesweeper(): MinesweeperState & MinesweeperActions {
  const board = ref<Cell[][]>([])
  const gameStatus = ref<GameStatus>('idle')
  const minesCount = ref(0)
  const time = ref(0)
  const rows = ref(0)
  const cols = ref(0)
  const seed = ref(0)
  const highlightedCells = ref<Set<string>>(new Set())

  let timerInterval: number | null = null
  let firstClick = true
  let random: () => number = Math.random
  let currentSettings: GameSettings | null = null

  const flagsCount = computed(() => {
    return board.value.flat().filter(cell => cell.mark === 'flag').length
  })

  const getNeighbors = (row: number, col: number): Cell[] => {
    const neighbors: Cell[] = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value) {
          neighbors.push(board.value[nr][nc])
        }
      }
    }
    return neighbors
  }

  const createEmptyBoard = (): Cell[][] => {
    const newBoard: Cell[][] = []
    for (let r = 0; r < rows.value; r++) {
      const row: Cell[] = []
      for (let c = 0; c < cols.value; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          isOpen: false,
          mark: 'none',
          adjacentMines: 0
        })
      }
      newBoard.push(row)
    }
    return newBoard
  }

  const placeMinesInitial = () => {
    random = createSeededRandom(seed.value)

    const positions: Array<{r: number, c: number}> = []
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        positions.push({ r, c })
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }

    for (let i = 0; i < minesCount.value && i < positions.length; i++) {
      const pos = positions[i]
      board.value[pos.r][pos.c].isMine = true
    }
  }

  const relocateMinesFromZone = (clickRow: number, clickCol: number) => {
    const minesToMove: Array<{r: number, c: number}> = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = clickRow + dr
        const nc = clickCol + dc
        if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value) {
          if (board.value[nr][nc].isMine) {
            minesToMove.push({ r: nr, c: nc })
          }
        }
      }
    }

    if (minesToMove.length === 0) return

    const freeCells: Array<{r: number, c: number}> = []
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        const inZone = Math.abs(r - clickRow) <= 1 && Math.abs(c - clickCol) <= 1
        if (!inZone && !board.value[r][c].isMine) {
          freeCells.push({ r, c })
        }
      }
    }

    for (let i = 0; i < minesToMove.length && i < freeCells.length; i++) {
      const from = minesToMove[i]
      const to = freeCells[i]
      board.value[from.r][from.c].isMine = false
      board.value[to.r][to.c].isMine = true
    }
  }

  const calculateNumbers = () => {
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        if (!board.value[r][c].isMine) {
          const neighbors = getNeighbors(r, c)
          board.value[r][c].adjacentMines = neighbors.filter(n => n.isMine).length
        }
      }
    }
  }

  const revealEmpty = (row: number, col: number) => {
    const cell = board.value[row][col]
    if (cell.isOpen || cell.mark === 'flag') return

    cell.isOpen = true

    if (cell.adjacentMines === 0 && !cell.isMine) {
      const neighbors = getNeighbors(row, col)
      for (const neighbor of neighbors) {
        if (!neighbor.isOpen && !neighbor.isMine) {
          revealEmpty(neighbor.row, neighbor.col)
        }
      }
    }
  }

  const revealAllMines = () => {
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        if (board.value[r][c].isMine) {
          board.value[r][c].isOpen = true
        }
      }
    }
  }

  const flagAllMines = () => {
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        if (board.value[r][c].isMine) {
          board.value[r][c].mark = 'flag'
        }
      }
    }
  }

  const checkWin = (): boolean => {
    for (let r = 0; r < rows.value; r++) {
      for (let c = 0; c < cols.value; c++) {
        const cell = board.value[r][c]
        if (!cell.isMine && !cell.isOpen) {
          return false
        }
      }
    }
    return true
  }

  const startTimer = () => {
    if (timerInterval) return
    timerInterval = window.setInterval(() => {
      time.value++
    }, 1000)
  }

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  const initGame = (r: number, c: number, mines: number, customSeed?: number, settings?: GameSettings) => {
    stopTimer()
    rows.value = r
    cols.value = c
    minesCount.value = mines
    time.value = 0
    gameStatus.value = 'idle'
    firstClick = true
    seed.value = customSeed ?? Math.floor(Math.random() * 1000000)
    currentSettings = settings || null
    board.value = createEmptyBoard()
    placeMinesInitial()
  }

  const openCell = (row: number, col: number, settings?: GameSettings) => {
    if (gameStatus.value === 'won' || gameStatus.value === 'lost') return

    const effectiveSettings = settings || currentSettings
    const cell = board.value[row][col]

    if (cell.isOpen && cell.adjacentMines > 0) {
      if (!effectiveSettings?.enableChord) return

      const neighbors = getNeighbors(row, col)
      const flaggedCount = neighbors.filter(n => n.mark === 'flag').length
      const closedUnflaggedCount = neighbors.filter(n => !n.isOpen && n.mark !== 'flag').length

      if (closedUnflaggedCount === cell.adjacentMines - flaggedCount && closedUnflaggedCount > 0) {
        for (const neighbor of neighbors) {
          if (!neighbor.isOpen && neighbor.mark !== 'flag') {
            neighbor.mark = 'flag'
          }
        }
        return
      }

      if (flaggedCount === cell.adjacentMines) {
        for (const neighbor of neighbors) {
          if (!neighbor.isOpen && neighbor.mark !== 'flag') {
            openCell(neighbor.row, neighbor.col, settings)
          }
        }
      }
      return
    }

    if (cell.isOpen || cell.mark === 'flag') return

    if (firstClick) {
      firstClick = false
      const safeStart = effectiveSettings?.fieldGeneration !== 'random'
      if (safeStart) {
        relocateMinesFromZone(row, col)
      }
      calculateNumbers()
      gameStatus.value = 'playing'
      startTimer()
    }

    if (cell.isMine) {
      if (effectiveSettings?.devMode) {
        return
      }
      cell.isOpen = true
      revealAllMines()
      gameStatus.value = 'lost'
      stopTimer()
      return
    }

    revealEmpty(row, col)

    if (checkWin()) {
      gameStatus.value = 'won'
      flagAllMines()
      stopTimer()
    }
  }

  const cycleMark = (row: number, col: number, settings?: GameSettings) => {
    if (gameStatus.value === 'won' || gameStatus.value === 'lost') return

    const effectiveSettings = settings || currentSettings
    const cell = board.value[row][col]
    if (cell.isOpen) return

    const showQuestion = effectiveSettings?.showQuestionMarks !== false
    const marks: CellMark[] = showQuestion ? ['none', 'flag', 'question'] : ['none', 'flag']
    const currentIndex = marks.indexOf(cell.mark)
    cell.mark = marks[(currentIndex + 1) % marks.length]
  }

  const restartGame = () => {
    initGame(rows.value, cols.value, minesCount.value, seed.value)
  }

  const newGame = () => {
    initGame(rows.value, cols.value, minesCount.value)
  }

  const highlightNeighbors = (row: number, col: number) => {
    const cell = board.value[row][col]
    if (!cell.isOpen || cell.adjacentMines === 0) return

    highlightedCells.value.clear()
    const neighbors = getNeighbors(row, col)

    for (const neighbor of neighbors) {
      if (!neighbor.isOpen && neighbor.mark !== 'flag') {
        highlightedCells.value.add(`${neighbor.row}-${neighbor.col}`)
      }
    }
  }

  const clearHighlight = () => {
    highlightedCells.value.clear()
  }

  return {
    board,
    gameStatus,
    minesCount,
    flagsCount,
    time,
    rows,
    cols,
    seed,
    highlightedCells,
    initGame,
    openCell,
    cycleMark,
    restartGame,
    newGame,
    highlightNeighbors,
    clearHighlight
  }
}
