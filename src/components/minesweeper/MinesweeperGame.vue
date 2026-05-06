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
            <span v-if="disconnectedPeerIds.includes(p.userId)" class="ms-lobby-player__tag ms-lobby-player__tag--dc">
              Отключился
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

      <div v-if="isLobbyHost" class="ms-lobby-card__settings">
        <div class="ms-lobby-card__section-title">Следующая игра (хост)</div>
        <p v-if="onlineLobby!.mode === 'ranked'" class="ms-lobby-card__hint-ranked">
          В рейтинге после «Применить» сид пересчитает сервер.
        </p>
        <div class="ms-lobby-card__fields">
          <label class="ms-lobby-field">Ширина <input v-model.number="hostEdit.cols" type="number" min="5" max="50" /></label>
          <label class="ms-lobby-field">Высота <input v-model.number="hostEdit.rows" type="number" min="5" max="50" /></label>
          <label class="ms-lobby-field">Мины <input v-model.number="hostEdit.mines" type="number" min="1" /></label>
          <label v-if="onlineLobby!.mode === 'casual'" class="ms-lobby-field">
            Сид <input v-model.number="hostEdit.seed" type="number" />
          </label>
        </div>
        <button type="button" class="ms-menu__btn" :disabled="isSavingLobbySettings" @click="saveLobbySettings">
          Применить настройки
        </button>
      </div>

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
      <button type="button" class="ms-menu__btn" :disabled="isSyncingOnline || !gameId" @click="syncOnlineField">
        Синхронизировать поле
      </button>
      <span v-if="syncFieldFeedback" class="ms-online-strip__hint">{{ syncFieldFeedback }}</span>
    </div>
    <template v-if="onlineMatchId">
      <MinesweeperHeader
          :mines-left="minesLeft"
          :time="time"
          :game-status="gameStatus"
          :seed="seed"
          :game-controls-allowed="false"
          @restart="restartGame"
          @new-game="newGame"
          @back="backToMenu"
      />
      <div class="ms-duel">
        <div class="ms-duel-col ms-duel-col--host" :class="{ 'ms-duel-col--interactive': isLobbyHost }">
          <div class="ms-duel-caption">
            {{ hostSeatName }}
            <span v-if="isLobbyHost" class="ms-duel-caption__you"> (вы)</span>
            <span class="ms-duel-caption__meta">
              · мин {{ hostSeatMinesLeft }} · {{ hostSeatStatusLabel }}
            </span>
          </div>
          <MinesweeperBoard
              :key="`seat-host-${onlineMatchId}`"
              :board="hostSeatBoard"
              :game-status="hostSeatGameStatus"
              :cols="cols"
              :highlighted-cells="isLobbyHost ? highlightedCells : emptyHighlightSet"
              :dev-mode="isLobbyHost ? effectiveDevMode : false"
              :read-only="!isLobbyHost"
              v-on="hostSeatInteract"
          />
        </div>
        <div class="ms-duel-col ms-duel-col--guest" :class="{ 'ms-duel-col--interactive': !isLobbyHost }">
          <div class="ms-duel-caption">
            {{ guestSeatName }}
            <span v-if="!isLobbyHost" class="ms-duel-caption__you"> (вы)</span>
            <span class="ms-duel-caption__meta">
              · мин {{ guestSeatMinesLeft }} · {{ guestSeatStatusLabel }}
            </span>
          </div>
          <MinesweeperBoard
              :key="`seat-guest-${onlineMatchId}`"
              :board="guestSeatBoard"
              :game-status="guestSeatGameStatus"
              :cols="cols"
              :highlighted-cells="!isLobbyHost ? highlightedCells : emptyHighlightSet"
              :dev-mode="!isLobbyHost ? effectiveDevMode : false"
              :read-only="isLobbyHost"
              v-on="guestSeatInteract"
          />
        </div>
      </div>
    </template>
    <template v-else>
      <MinesweeperHeader
          :mines-left="minesLeft"
          :time="time"
          :game-status="gameStatus"
          :seed="seed"
          :game-controls-allowed="true"
          @restart="restartGame"
          @new-game="newGame"
          @back="backToMenu"
      />
      <MinesweeperBoard
          :board="board"
          :game-status="gameStatus"
          :cols="cols"
          :highlighted-cells="highlightedCells"
          :dev-mode="effectiveDevMode"
          @cell-open="handleCellOpen"
          @cell-mark="handleCellMark"
          @cell-highlight="highlightNeighbors"
          @clear-highlight="clearHighlight"
      />
    </template>
  </div>

  <Teleport to="body">
    <div v-if="matchEndVisible" class="ms-match-end-overlay" role="presentation" @click.self="matchEndVisible = false">
      <div class="ms-match-end-modal" role="dialog" aria-labelledby="match-end-title">
        <h3 id="match-end-title">{{ matchEndHeadline }}</h3>
        <p v-if="onlineLobby" class="ms-match-end-sub">{{ onlineLobby.mode === 'ranked' ? 'Рейтинг обновится у обоих.' : '' }}</p>
        <button type="button" class="ms-menu__btn ms-menu__btn--start" @click="backToLobbyAfterMatch">
          В лобби
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
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
const opponentGameStatus = ref<GameStatus>('playing')
/** Соперник из лобби на момент старта — чтобы finish не терялся, если WS-лобби устарело. */
const pinnedOpponentUserId = ref('')
const emptyHighlightSet = new Set<string>()
const copyFeedback = ref('')
let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null
const disconnectedPeerIds = ref<string[]>([])
const matchEndVisible = ref(false)
const matchEndWinnerId = ref<string | null>(null)
const isSavingLobbySettings = ref(false)
const isSyncingOnline = ref(false)
const syncFieldFeedback = ref('')
let syncFieldFeedbackTimer: ReturnType<typeof setTimeout> | null = null
const hostEdit = ref({ rows: 9, cols: 9, mines: 10, seed: 0 })

const myUserId = computed(() => store.getters.currentUser?.id || '')

/** Владелец лобби (= левое место матча); с бэка приходит `ownerId`, иначе падаем на первого игрока. */
const seatOwnerUserId = computed(() => onlineLobby.value?.ownerId ?? onlineLobby.value?.players?.[0]?.userId ?? '')

const isLobbyPhase = computed(() => !!onlineLobby.value && !onlineMatchId.value)

const effectiveDevMode = computed(() => {
  const r = store.getters.currentUser?.role as string | undefined
  if (r === 'admin' || r === 'superuser') return settings.value.devMode
  return false
})

const isLobbyHost = computed(
  () => !!myUserId.value && !!seatOwnerUserId.value && seatOwnerUserId.value === myUserId.value
)

const opponentUserId = computed(
  () => onlineLobby.value?.players.find((p) => p.userId !== myUserId.value)?.userId ?? ''
)

const resolvedOpponentUserId = computed(() => pinnedOpponentUserId.value || opponentUserId.value)

const syncPinnedOpponentFromLobby = () => {
  const me = myUserId.value
  const other = onlineLobby.value?.players.find((p) => p.userId && p.userId !== me)
  if (other) pinnedOpponentUserId.value = other.userId
}

const hostSeatName = computed(() => {
  const oid = seatOwnerUserId.value
  if (!oid) return onlineLobby.value?.players[0]?.username ?? 'Хост'
  return onlineLobby.value?.players.find((p) => p.userId === oid)?.username ?? 'Хост'
})

const guestSeatName = computed(() => {
  const oid = seatOwnerUserId.value
  const g = onlineLobby.value?.players.find((p) => p.userId && p.userId !== oid)
  return g?.username ?? onlineLobby.value?.players[1]?.username ?? 'Гость'
})

const gameStatusRu = (s: GameStatus) => {
  switch (s) {
    case 'won':
      return 'победа'
    case 'lost':
      return 'поражение'
    case 'idle':
      return '—'
    default:
      return 'в игре'
  }
}

const hostSeatBoard = computed(() => (isLobbyHost.value ? board.value : opponentBoard.value))

const guestSeatBoard = computed(() => (isLobbyHost.value ? opponentBoard.value : board.value))

const hostSeatGameStatus = computed(() => (isLobbyHost.value ? gameStatus.value : opponentGameStatus.value))

const guestSeatGameStatus = computed(() => (isLobbyHost.value ? opponentGameStatus.value : gameStatus.value))

const minesLeftForBoard = (b: MinesweeperCell[][]) => {
  if (!b.length || !minesCount.value) return minesCount.value
  const flags = b.flat().filter((c) => c.mark === 'flag').length
  return minesCount.value - flags
}

const hostSeatMinesLeft = computed(() => minesLeftForBoard(hostSeatBoard.value))

const guestSeatMinesLeft = computed(() => minesLeftForBoard(guestSeatBoard.value))

const hostSeatStatusLabel = computed(() => gameStatusRu(hostSeatGameStatus.value))

const guestSeatStatusLabel = computed(() => gameStatusRu(guestSeatGameStatus.value))

const matchEndHeadline = computed(() => {
  const w = matchEndWinnerId.value
  if (!w) return 'Матч завершён'
  if (w === myUserId.value) return 'Вы победили'
  const name = onlineLobby.value?.players.find((p) => p.userId === w)?.username
  return name ? `Победил(а): ${name}` : 'Вы проиграли'
})

const syncHostEditor = () => {
  const lob = onlineLobby.value
  if (!lob) return
  hostEdit.value = {
    rows: lob.rows,
    cols: lob.cols,
    mines: lob.mines,
    seed: lob.seed
  }
}

const flashCopyFeedback = (message: string) => {
  copyFeedback.value = message
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
  copyFeedbackTimer = setTimeout(() => {
    copyFeedback.value = ''
    copyFeedbackTimer = null
  }, 2200)
}

const flashSyncFieldFeedback = (message: string) => {
  syncFieldFeedback.value = message
  if (syncFieldFeedbackTimer) clearTimeout(syncFieldFeedbackTimer)
  syncFieldFeedbackTimer = setTimeout(() => {
    syncFieldFeedback.value = ''
    syncFieldFeedbackTimer = null
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
  return allReady && seatOwnerUserId.value !== '' && seatOwnerUserId.value === myUserId.value
})

const saveLobbySettings = async () => {
  if (!onlineLobby.value || !isLobbyHost.value) return
  isSavingLobbySettings.value = true
  try {
    const payload: { rows: number; cols: number; mines: number; seed?: number } = {
      rows: hostEdit.value.rows,
      cols: hostEdit.value.cols,
      mines: hostEdit.value.mines
    }
    if (onlineLobby.value.mode === 'casual') {
      payload.seed = hostEdit.value.seed
    }
    onlineLobby.value = await api.patchOnlineLobbySettings(onlineLobby.value.id, payload)
    lastParams.value = {
      rows: onlineLobby.value.rows,
      cols: onlineLobby.value.cols,
      mines: onlineLobby.value.mines,
      seed: onlineLobby.value.seed
    }
    syncHostEditor()
  } catch (e) {
    console.error(e)
  } finally {
    isSavingLobbySettings.value = false
  }
}

const flagsCount = computed(() => board.value.flat().filter(cell => cell.mark === 'flag').length)

const minesLeft = computed(() => minesCount.value - flagsCount.value)

const gameClass = computed(() => {
  return {
    'minesweeper': true,
    'minesweeper--won': gameStatus.value === 'won',
    'minesweeper--lost': gameStatus.value === 'lost',
    'minesweeper--online-duel': !!onlineMatchId.value
  }
})

const gameStyle = computed(() => ({
  transform: `scale(${settings.value.scale / 100})`,
  transformOrigin: 'top center'
}))

const cloneCells = (b: MinesweeperCell[][]): MinesweeperCell[][] => {
  try {
    return JSON.parse(JSON.stringify(b)) as MinesweeperCell[][]
  } catch {
    return b
  }
}

let playTickInterval: ReturnType<typeof setInterval> | null = null

const stopPlayTick = () => {
  if (playTickInterval) {
    clearInterval(playTickInterval)
    playTickInterval = null
  }
}

/** Таймер с сервером только при каждом ответе; между ходами крутим локально во время «playing». */
const syncPlayTicker = () => {
  if (!gameId.value || gameStatus.value !== 'playing') {
    stopPlayTick()
    return
  }
  if (!playTickInterval) {
    playTickInterval = setInterval(() => {
      time.value += 1
    }, 1000)
  }
}

const applyGameState = (state: any) => {
  if (isLeavingGame.value) return
  gameId.value = state.gameId
  board.value = cloneCells(state.board)
  gameStatus.value = state.gameStatus
  rows.value = state.rows
  cols.value = state.cols
  minesCount.value = state.mines
  seed.value = state.seed
  time.value = state.time
  syncPlayTicker()
}

/** Общая подгрузка матча: HTTP-старт и WS match_started (в т.ч. повтор при пропущенном apply). */
const loadOnlineMatchFromStartResponse = async (started: StartMatchResponse) => {
  isLeavingGame.value = false
  syncPinnedOpponentFromLobby()
  const newMatch = onlineMatchId.value !== started.matchId
  if (newMatch) {
    onlineMatchId.value = started.matchId
    gameId.value = started.myGameId
    opponentBoard.value = []
    opponentGameStatus.value = 'playing'
    clearHighlight()
  }
  const myState = await api.getMinesweeperGame(started.myGameId, effectiveDevMode.value)
  applyGameState(myState)
  await refreshOpponentState()
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
  disconnectedPeerIds.value = []
  const ws = new WebSocket(api.getOnlineWsUrl(lobbyId))
  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data)
      if (msg.event === 'lobby_updated') {
        onlineLobby.value = msg.payload as OnlineLobby
        syncHostEditor()
        syncPinnedOpponentFromLobby()
      } else if (msg.event === 'match_started') {
        const started = msg.payload as StartMatchResponse
        try {
          await loadOnlineMatchFromStartResponse(started)
        } catch (e) {
          console.error('match_started hydrate failed', e)
        }
      } else if (msg.event === 'player_move' && onlineMatchId.value) {
        const mid = (msg.payload as { matchId?: string })?.matchId
        if (mid && mid !== onlineMatchId.value) return
        await refreshOpponentState()
      } else if (msg.event === 'match_finished') {
        isLeavingGame.value = false
        const winnerId = msg.payload?.winnerId as string | undefined
        matchEndWinnerId.value = winnerId ?? null
        matchEndVisible.value = true
        const finishedMid = (msg.payload as { matchId?: string })?.matchId
        if (!finishedMid || finishedMid === onlineMatchId.value) {
          try {
            await refreshOpponentState()
            if (gameId.value) {
              const myState = await api.getMinesweeperGame(gameId.value, effectiveDevMode.value)
              applyGameState(myState)
            }
          } catch (e) {
            console.error('refresh at match end', e)
          }
        }
        if (store.getters.isAuthenticated) {
          try {
            await store.dispatch('fetchCurrentUser')
          } catch {
            /* ignore */
          }
        }
      } else if (msg.event === 'player_disconnected') {
        const uid = msg.payload?.userId as string | undefined
        if (uid && !disconnectedPeerIds.value.includes(uid)) {
          disconnectedPeerIds.value = [...disconnectedPeerIds.value, uid]
        }
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
    opponentBoard.value = cloneCells(state.board)
    opponentGameStatus.value = state.gameStatus
  } catch (err) {
    console.error('Failed to fetch opponent state', err)
  }
}

const isIgnorableGameError = (err: any): boolean => {
  const status = err?.response?.status
  return status === 404 || status === 410
}

const handleCellOpen = async (row: number, col: number) => {
  if (!gameId.value || isBusy.value) return
  if (gameStatus.value === 'won' || gameStatus.value === 'lost') return
  isBusy.value = true
  try {
    const state = await api.revealMinesweeperCell(gameId.value, row, col)
    applyGameState(state)
    if (onlineMatchId.value) {
      await api.sendOnlineMove(onlineMatchId.value, row, col, 'reveal')
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
  if (!gameId.value || isBusy.value) return
  if (gameStatus.value === 'won' || gameStatus.value === 'lost') return
  isBusy.value = true
  try {
    const state = await api.markMinesweeperCell(gameId.value, row, col)
    applyGameState(state)
    if (onlineMatchId.value) {
      await api.sendOnlineMove(onlineMatchId.value, row, col, 'mark')
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
  syncHostEditor()
  isLeavingGame.value = false
  syncPinnedOpponentFromLobby()
  showMenu.value = false
  connectLobbyWs(lobby.id)
}

const handleOnlineJoin = async (invite: string) => {
  const payload = invite.includes('http') ? { inviteLink: invite } : { inviteCode: invite.toUpperCase() }
  const lobby = await api.joinOnlineLobby(payload)
  onlineLobby.value = lobby
  lastParams.value = { rows: lobby.rows, cols: lobby.cols, mines: lobby.mines, seed: lobby.seed }
  syncHostEditor()
  isLeavingGame.value = false
  syncPinnedOpponentFromLobby()
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
  try {
    await loadOnlineMatchFromStartResponse(started)
  } catch (e) {
    console.error('start match hydrate failed', e)
  }
}

const syncOnlineField = async () => {
  if (!gameId.value || !onlineMatchId.value) return
  isSyncingOnline.value = true
  try {
    isLeavingGame.value = false
    const myState = await api.getMinesweeperGame(gameId.value, effectiveDevMode.value)
    applyGameState(myState)
    await refreshOpponentState()
    flashSyncFieldFeedback('Поля обновлены')
  } catch (e) {
    console.error(e)
    flashSyncFieldFeedback('Не удалось обновить')
  } finally {
    isSyncingOnline.value = false
  }
}

const backToLobbyAfterMatch = async () => {
  matchEndVisible.value = false
  matchEndWinnerId.value = null
  if (!onlineLobby.value?.id) return
  try {
    const refreshed = await api.prepareOnlineLobbyNextRound(onlineLobby.value.id)
    onlineLobby.value = refreshed
    syncHostEditor()
  } catch (e) {
    console.error(e)
    return
  }
  isLeavingGame.value = false
  onlineMatchId.value = null
  pinnedOpponentUserId.value = ''
  opponentBoard.value = []
  opponentGameStatus.value = 'idle'
  stopPlayTick()
  gameId.value = null
  board.value = []
  gameStatus.value = 'idle'
  minesCount.value = 0
  time.value = 0
  rows.value = 0
  cols.value = 0
  seed.value = 0
}

const backToMenu = async () => {
  isLeavingGame.value = true
  stopPlayTick()
  onlineWs.value?.close()
  onlineWs.value = null
  showMenu.value = true
  clearHighlight()
  onlineLobby.value = null
  onlineMatchId.value = null
  opponentBoard.value = []
  pinnedOpponentUserId.value = ''
  opponentGameStatus.value = 'idle'
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
  if (onlineMatchId.value) return
  if (!lastParams.value) return
  await createGame({
    rows: lastParams.value.rows,
    cols: lastParams.value.cols,
    mines: lastParams.value.mines,
    seed: seed.value
  })
}

const newGame = async () => {
  if (onlineMatchId.value) return
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

const hostSeatInteract = computed(() =>
  !isLobbyHost.value
    ? {}
    : {
        onCellOpen: handleCellOpen,
        onCellMark: handleCellMark,
        onCellHighlight: highlightNeighbors,
        onClearHighlight: clearHighlight
      }
)

const guestSeatInteract = computed(() =>
  isLobbyHost.value
    ? {}
    : {
        onCellOpen: handleCellOpen,
        onCellMark: handleCellMark,
        onCellHighlight: highlightNeighbors,
        onClearHighlight: clearHighlight
      }
)

onBeforeUnmount(() => stopPlayTick())

watch(gameStatus, async (status) => {
  if (onlineMatchId.value && myUserId.value) {
    try {
      if (status === 'won') {
        await api.finishOnlineMatch(onlineMatchId.value, myUserId.value)
      } else if (status === 'lost' && resolvedOpponentUserId.value) {
        await api.finishOnlineMatch(onlineMatchId.value, resolvedOpponentUserId.value)
      }
      if ((status === 'won' || status === 'lost') && store.getters.isAuthenticated) {
        await store.dispatch('fetchCurrentUser')
      }
    } catch (err) {
      console.error('Failed to finish online match:', err)
    }
  }
  if (status === 'won' && store.getters.isAuthenticated && !onlineMatchId.value) {
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

<style scoped>
.ms-online-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.ms-online-strip__hint {
  font-size: 0.8rem;
  opacity: 0.85;
}

.ms-duel {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.35rem;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
}

.ms-duel-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  position: relative;
}

.ms-duel-col--interactive {
  z-index: 2;
}

.ms-duel-caption {
  font-size: 0.85rem;
  opacity: 0.95;
  text-align: center;
  max-width: 32rem;
  line-height: 1.3;
}

.ms-duel-caption__meta {
  opacity: 0.82;
}

.ms-lobby-card__settings {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ms-border, rgba(255, 255, 255, 0.12));
}

.ms-lobby-card__hint-ranked {
  font-size: 0.85rem;
  opacity: 0.85;
  margin: 0 0 0.5rem;
}

.ms-lobby-card__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.ms-lobby-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.ms-lobby-field input {
  min-width: 4rem;
}

.ms-lobby-player__tag--dc {
  opacity: 0.9;
  background: rgba(200, 120, 80, 0.25);
}

.ms-match-end-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}

.ms-match-end-modal {
  background: var(--ms-menu-bg, #1e1e1e);
  color: var(--ms-text-primary, #fff);
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  max-width: min(90vw, 22rem);
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.ms-match-end-modal h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.ms-match-end-sub {
  margin: 0 0 1rem;
  font-size: 0.88rem;
  opacity: 0.85;
  min-height: 1rem;
}
</style>
