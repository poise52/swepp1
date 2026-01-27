<template>
  <button
      :class="getCellClass(cell, gameStatus)"
      @click="handleClick(cell)"
      @contextmenu="handleContextMenu($event, cell)"
  >
    <template v-if="getCellContent(cell)">
      <span v-if="getCellContent(cell)?.type === 'flag'" class="ms-cell__flag">
        <i class="pi pi-flag-fill"></i>
      </span>
      <span v-else-if="getCellContent(cell)?.type === 'question'" class="ms-cell__question">?</span>
      <span v-else-if="getCellContent(cell)?.type === 'mine'" class="ms-cell__mine">💣</span>
      <span v-else-if="getCellContent(cell)?.type === 'number'">
        {{ getCellContent(cell)?.value }}
      </span>
    </template>
  </button>
</template>

<script setup lang="ts">
import type { Cell } from '@/composables/useMinesweeper'

interface Props {
  cell: Cell
  gameStatus: string
}

defineProps<Props>()

const emit = defineEmits<{
  open: [row: number, col: number]
  mark: [row: number, col: number]
}>()

const handleClick = (cell: Cell) => {
  emit('open', cell.row, cell.col)
}

const handleContextMenu = (e: MouseEvent, cell: Cell) => {
  e.preventDefault()
  emit('mark', cell.row, cell.col)
}

const getCellClass = (cell: Cell, gameStatus: string) => {
  const classes = ['ms-cell']

  if (cell.isOpen) {
    classes.push('ms-cell--open')

    if (cell.isMine) {
      classes.push('ms-cell--mine')
      if (gameStatus === 'lost') {
        classes.push('ms-cell--exploded')
      }
    } else if (cell.adjacentMines > 0) {
      classes.push(`ms-cell--num-${cell.adjacentMines}`)
    }
  } else {
    classes.push('ms-cell--closed')
  }

  return classes
}

const getCellContent = (cell: Cell) => {
  if (!cell.isOpen) {
    if (cell.mark === 'flag') return { type: 'flag' }
    if (cell.mark === 'question') return { type: 'question' }
    return null
  }

  if (cell.isMine) return { type: 'mine' }
  if (cell.adjacentMines > 0) return { type: 'number', value: cell.adjacentMines }
  return null
}
</script>
