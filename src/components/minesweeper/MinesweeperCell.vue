<template>
  <button
      type="button"
      :tabindex="readOnly ? -1 : 0"
      :class="cellButtonClass(cell, gameStatus, isHighlighted, devMode, readOnly)"
      @mousedown="handleMouseDown(cell)"
      @mouseup="handleMouseUp(cell)"
      @mouseleave="emit('clearHighlight')"
      @click="handleClick(cell)"
      @contextmenu="handleContextMenu($event, cell)"
  >
    <template v-if="getCellContent(cell, devMode)">
      <span v-if="getCellContent(cell, devMode)?.type === 'flag'" class="ms-cell__flag">
        <i class="pi pi-flag-fill"></i>
      </span>
      <span v-else-if="getCellContent(cell, devMode)?.type === 'question'" class="ms-cell__question">?</span>
      <span v-else-if="getCellContent(cell, devMode)?.type === 'mine'" class="ms-cell__mine">💣</span>
      <span v-else-if="getCellContent(cell, devMode)?.type === 'dev-mine'" class="ms-cell__dev-mine">💣</span>
      <span v-else-if="getCellContent(cell, devMode)?.type === 'number'">
        {{ getCellContent(cell, devMode)?.value }}
      </span>
    </template>
  </button>
</template>

<script setup lang="ts">
import type { Cell } from '@/composables/useMinesweeper'

interface Props {
  cell: Cell
  gameStatus: string
  isHighlighted: boolean
  devMode: boolean
  readOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false
})

const emit = defineEmits<{
  open: [row: number, col: number]
  mark: [row: number, col: number]
  highlight: [row: number, col: number]
  clearHighlight: []
}>()

const handleMouseDown = (cell: Cell) => {
  if (props.readOnly) return
  if (cell.isOpen && cell.adjacentMines > 0) {
    emit('highlight', cell.row, cell.col)
  }
}

const handleMouseUp = (cell: Cell) => {
  if (props.readOnly) return
  emit('clearHighlight')
}

const handleClick = (cell: Cell) => {
  if (props.readOnly) return
  emit('open', cell.row, cell.col)
}

const handleContextMenu = (e: MouseEvent, cell: Cell) => {
  if (props.readOnly) return
  e.preventDefault()
  emit('mark', cell.row, cell.col)
}

const cellButtonClass = (
  cell: Cell,
  gameStatus: string,
  isHighlighted: boolean,
  devMode: boolean,
  ro: boolean
) => [...getCellClass(cell, gameStatus, isHighlighted, devMode), ro ? 'ms-cell--readonly' : ''].filter(Boolean)

const getCellClass = (cell: Cell, gameStatus: string, isHighlighted: boolean, devMode: boolean): string[] => {
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
    if (isHighlighted) {
      classes.push('ms-cell--highlighted')
    }
    if (devMode && cell.isMine && cell.mark !== 'flag') {
      classes.push('ms-cell--dev-mine')
    }
  }

  return classes
}

const getCellContent = (cell: Cell, devMode: boolean) => {
  if (!cell.isOpen) {
    if (cell.mark === 'flag') return { type: 'flag' }
    if (cell.mark === 'question') return { type: 'question' }
    if (devMode && cell.isMine) return { type: 'dev-mine' }
    return null
  }

  if (cell.isMine) return { type: 'mine' }
  if (cell.adjacentMines > 0) return { type: 'number', value: cell.adjacentMines }
  return null
}
</script>

<style scoped>
/* Не использовать pointer-events: none — событие проходит сквозь клетку к полю ниже при наложении двух досок. */
.ms-cell--readonly {
  cursor: default;
  opacity: 0.92;
}
</style>
