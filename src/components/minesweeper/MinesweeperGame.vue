<template>
  <MinesweeperMenu
      v-if="showMenu"
      @start="handleStart"
      @online-create="handleOnlineCreate"
      @online-join="handleOnlineJoin"
  />

  <div v-else-if="isLobbyPhase" class="ms-lobby-shell">
    <div class="ms-lobby-card">
      <div class="ms-lobby-card__top">
        <h2 class="ms-lobby-card__title">Лобби</h2>
        <span
          class="ms-lobby-card__badge"
          :class="{ 'ms-lobby-card__badge--ranked': onlineLobby!.mode === 'ranked' }"
        >
          {{ onlineLobby!.mode === 'ranked' ? 'Рейтинг' : 'Обычный' }}
        </span>
      </div>
      <p class="ms-lobby-card__meta">
        {{ onlineLobby!.cols }}×{{ onlineLobby!.rows }} · {{ onlineLobby!.mines }} мин · сид {{ onlineLobby!.seed }}
      </p>

      <div class="ms-lobby-card__invite-block">
        <span class="ms-lobby-card__label">Код приглашения</span>
        <div class="ms-lobby-card__code">{{ onlineLobby!.inviteCode }}</div>
        <div class="ms-lobby-card__copy-row">
          <button type="button" class="ms-menu__btn" @click="copyInviteCode">Копировать код</button>
          <button type="button" class="ms-menu__btn" @click="copyInviteLink">Копировать ссылку</button>
        </div>
        <div v-if="onlineLobby!.inviteLink" class="ms-lobby-card__link">{{ onlineLobby!.inviteLink }}</div>
      </div>

      <div v-if="copyFeedback" class="ms-lobby-card__toast">{{ copyFeedback }}</div>

      <div class="ms-lobby-card__section-title">Игроки</div>
      <ul class="ms-lobby-player-list">
        <li
          v-for="(p, idx) in onlineLobby!.players"
          :key="p.userId"
          class="ms-lobby-player"
          :class="{ 'ms-lobby-player--me': p.userId === myUserId }"
        >
          <div class="ms-lobby-player__left">
            <span class="ms-lobby-player__avatar">{{ playerInitial(p.username) }}</span>
            <span class="ms-lobby-player__name">
              {{ p.username }}
              <span v-if="p.userId === myUserId" class="ms-lobby-player__you">(вы)</span>
            </span>
          </div>
          <div class="ms-lobby-player__tags">
            <span v-if="idx === 0" class="ms-lobby-player__tag ms-lobby-player__tag--host">Хост</span>
            <span
              class="ms-lobby-player__tag"
              :class="p.ready ? 'ms-lobby-player__tag--ready' : 'ms-lobby-player__tag--waiting'"
            >
              {{ p.ready ? 'Готов' : 'Ожидание' }}
            </span>
          </div>
        </li>
        <li v-if="onlineLobby!.players.length < 2" class="ms-lobby-player ms-lobby-player--empty">
          <div class="ms-lobby-player__left">
            <span class="ms-lobby-player__avatar ms-lobby-player__avatar--muted">…</span>
            <span class="ms-lobby-player__name ms-lobby-player__name--placeholder">Ждём соперника</span>
          </div>
        </li>
      </ul>

      <div class="ms-lobby-card__actions">
        <div class="ms-lobby-card__actions-row">
          <button type="button" class="ms-menu__btn" @click="backToMenu">В меню</button>
          <button type="button" class="ms-menu__btn ms-menu__btn--start" @click="toggleReady">
            {{ amReady ? 'Снять готовность' : 'Готов' }}
          </button>
        </div>
        <button
          v-if="canStartMatch"
          type="button"
          class="ms-menu__btn ms-menu__btn--start"
          @click="startOnlineMatch"
        >
          Начать матч
        </button>
      </div>
    </div>
  </div>

  <div v-else :class="gameClass" :style="gameStyle">
    <div v-if="onlineMatchId" class="ms-online-strip">
      <button type="button" class="ms-menu__btn" @click="toggleSwapView">
        {{ viewingOpponent ? 'Моё поле' : 'Поле соперника' }}
      </button>
    </div>
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
        :board="viewingOpponent ? opponentBoard : board"
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
import type { GameStatus, MinesweeperCell, OnlineLobby, StartMatchResponse } from '@/types/api'
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
const onlineLobby = ref<OnlineLobby | null>(null)
const onlineMatchId = ref<string | null>(null)
const onlineWs = ref<WebSocket | null>(null)
const opponentBoard = ref<MinesweeperCell[][]>([])
const viewingOpponent = ref(false)
const copyFeedback = ref('')
let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null

const myUserId = computed(() => store.getters.currentUser?.id || '')

const isLobbyPhase = computed(() => !!onlineLobby.value && !onlineMatchId.value)

const flashCopyFeedback = (message: string) => {
  copyFeedback.value = message
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
  copyFeedbackTimer = setTimeout(() => {
    copyFeedback.value = ''
    copyFeedbackTimer = null
  }, 2200)
}

const playerInitial = (username: string) => {
  const c = username.trim()[0]
  return c ? c.toUpperCase() : '?'
}

const copyInviteCode = async () => {
  if (!onlineLobby.value) return
  try {
    await navigator.clipboard.writeText(onlineLobby.value.inviteCode)
    flashCopyFeedback('Код скопирован в буфер')
  } catch {
    flashCopyFeedback('Не удалось скопировать')
  }
}

const copyInviteLink = async () => {
  if (!onlineLobby.value?.inviteLink) return
  try {
    await navigator.clipboard.writeText(onlineLobby.value.inviteLink)
    flashCopyFeedback('Ссылка скопирована')
  } catch {
    flashCopyFeedback('Не удалось скопировать')
  }
}

const amReady = computed(() => {
  if (!onlineLobby.value || !myUserId.value) return false
  return onlineLobby.value.players.find(p => p.userId === myUserId.value)?.ready ?? false
})
const canStartMatch = computed(() => {
  if (!onlineLobby.value || onlineMatchId.value) return false
  const allReady = onlineLobby.value.players.length === 2 && onlineLobby.value.players.every(p => p.ready)
  return allReady && onlineLobby.value.players[0]?.userId === myUserId.value
})

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

const connectLobbyWs = (lobbyId: string) => {
  onlineWs.value?.close()
  const ws = new WebSocket(api.getOnlineWsUrl(lobbyId))
  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data)
      if (msg.event === 'lobby_updated') {
        onlineLobby.value = msg.payload as OnlineLobby
      } else if (msg.event === 'match_started') {
        const started = msg.payload as StartMatchResponse
        if (!onlineMatchId.value) {
          onlineMatchId.value = started.matchId
          gameId.value = started.myGameId
          const myState = await api.getMinesweeperGame(started.myGameId, settings.value.devMode)
          applyGameState(myState)
          await refreshOpponentState()
        }
      } else if (msg.event === 'player_move' && onlineMatchId.value) {
        await refreshOpponentState()
      } else if (msg.event === 'match_finished') {
        console.log('Match finished', msg.payload)
      }
    } catch (e) {
      console.error('WS parse error', e)
    }
  }
  onlineWs.value = ws
}

const refreshOpponentState = async () => {
  if (!onlineMatchId.value) return
  try {
    const state = await api.getOpponentState(onlineMatchId.value)
    opponentBoard.value = state.board
  } catch (err) {
    console.error('Failed to fetch opponent state', err)
  }
}

const isIgnorableGameError = (err: any): boolean => {
  const status = err?.response?.status
  return status === 404 || status === 410
}

const handleCellOpen = async (row: number, col: number) => {
  if (viewingOpponent.value) return
  if (!gameId.value || isBusy.value) return
  isBusy.value = true
  try {
    const state = await api.revealMinesweeperCell(gameId.value, row, col)
    applyGameState(state)
    if (onlineMatchId.value) {
      await api.sendOnlineMove(onlineMatchId.value, row, col, 'reveal')
      await refreshOpponentState()
    }
  } catch (err) {
    if (!isIgnorableGameError(err) && !isLeavingGame.value) {
      console.error('Failed to reveal cell:', err)
    }
  } finally {
    isBusy.value = false
  }
}

const handleCellMark = async (row: number, col: number) => {
  if (viewingOpponent.value) return
  if (!gameId.value || isBusy.value) return
  isBusy.value = true
  try {
    const state = await api.markMinesweeperCell(gameId.value, row, col)
    applyGameState(state)
    if (onlineMatchId.value) {
      await api.sendOnlineMove(onlineMatchId.value, row, col, 'mark')
      await refreshOpponentState()
    }
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
  onlineLobby.value = null
  onlineMatchId.value = null
  lastParams.value = { rows: rowsCount, cols: colsCount, mines, seed: customSeed }
  await createGame(lastParams.value)
  showMenu.value = false
}

const handleOnlineCreate = async (
  rowsCount: number,
  colsCount: number,
  mines: number,
  difficulty: string,
  customSeed: number | undefined,
  mode: 'casual' | 'ranked'
) => {
  currentDifficulty.value = difficulty
  const lobby = await api.createOnlineLobby({
    mode,
    rows: rowsCount,
    cols: colsCount,
    mines,
    seed: customSeed,
    settings: {
      fieldGeneration: settings.value.fieldGeneration,
      showQuestionMarks: settings.value.showQuestionMarks,
      enableChord: settings.value.enableChord,
      devMode: settings.value.devMode
    }
  })
  onlineLobby.value = lobby
  lastParams.value = { rows: rowsCount, cols: colsCount, mines, seed: lobby.seed }
  showMenu.value = false
  connectLobbyWs(lobby.id)
}

const handleOnlineJoin = async (invite: string) => {
  const payload = invite.includes('http') ? { inviteLink: invite } : { inviteCode: invite.toUpperCase() }
  const lobby = await api.joinOnlineLobby(payload)
  onlineLobby.value = lobby
  lastParams.value = { rows: lobby.rows, cols: lobby.cols, mines: lobby.mines, seed: lobby.seed }
  showMenu.value = false
  connectLobbyWs(lobby.id)
}

const toggleReady = async () => {
  if (!onlineLobby.value) return
  onlineLobby.value = await api.setOnlineReady(onlineLobby.value.id, !amReady.value)
}

const startOnlineMatch = async () => {
  if (!onlineLobby.value) return
  const started = await api.startOnlineMatch(onlineLobby.value.id)
  onlineMatchId.value = started.matchId
  gameId.value = started.myGameId
  const state = await api.getMinesweeperGame(started.myGameId, settings.value.devMode)
  applyGameState(state)
  await refreshOpponentState()
}

const toggleSwapView = () => {
  viewingOpponent.value = !viewingOpponent.value
}

const backToMenu = async () => {
  isLeavingGame.value = true
  onlineWs.value?.close()
  onlineWs.value = null
  showMenu.value = true
  clearHighlight()
  onlineLobby.value = null
  onlineMatchId.value = null
  opponentBoard.value = []
  viewingOpponent.value = false
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
  if (status === 'won' && onlineMatchId.value && myUserId.value) {
    try {
      await api.finishOnlineMatch(onlineMatchId.value, myUserId.value)
    } catch (err) {
      console.error('Failed to finish online match:', err)
    }
  }
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
