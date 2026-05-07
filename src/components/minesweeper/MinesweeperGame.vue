<template>
  <div v-if="bootstrappingOnline" class="ms-boot">Подключение к игре…</div>
  <template v-else>
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
      <button type="button" class="ms-menu__btn" :disabled="isSyncingOnline || !activeGameId" @click="syncOnlineField">
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
        <!-- Слева всегда игрок 1 (owner лобби), справа игрок 2 — как на сервере; данные в разных ref, без swap одной доски. -->
        <div class="ms-duel-col ms-duel-col--host" :class="{ 'ms-duel-col--interactive': isLobbyHost }">
          <div class="ms-duel-caption">
            {{ hostSeatName }}
            <span v-if="isLobbyHost" class="ms-duel-caption__you"> (вы)</span>
            <span class="ms-duel-caption__meta">
              · мин {{ player1MinesLeft }} · {{ player1StatusLabel }}
            </span>
          </div>
          <MinesweeperBoard
              :key="`p1-${onlineMatchId}`"
              :board="player1Board"
              :game-status="player1GameStatus"
              :cols="cols"
              :highlighted-cells="isLobbyHost ? highlightedCells : emptyHighlightSet"
              :dev-mode="isLobbyHost ? effectiveDevMode : false"
              :read-only="!isLobbyHost"
              @cell-open="(r, c) => onDuelCellOpen('p1', r, c)"
              @cell-mark="(r, c) => onDuelCellMark('p1', r, c)"
              @cell-highlight="(r, c) => onDuelCellHighlight('p1', r, c)"
              @clear-highlight="() => onDuelClearHighlight('p1')"
          />
        </div>
        <div class="ms-duel-col ms-duel-col--guest" :class="{ 'ms-duel-col--interactive': !isLobbyHost }">
          <div class="ms-duel-caption">
            {{ guestSeatName }}
            <span v-if="!isLobbyHost" class="ms-duel-caption__you"> (вы)</span>
            <span class="ms-duel-caption__meta">
              · мин {{ player2MinesLeft }} · {{ player2StatusLabel }}
            </span>
          </div>
          <MinesweeperBoard
              :key="`p2-${onlineMatchId}`"
              :board="player2Board"
              :game-status="player2GameStatus"
              :cols="cols"
              :highlighted-cells="!isLobbyHost ? highlightedCells : emptyHighlightSet"
              :dev-mode="!isLobbyHost ? effectiveDevMode : false"
              :read-only="isLobbyHost"
              @cell-open="(r, c) => onDuelCellOpen('p2', r, c)"
              @cell-mark="(r, c) => onDuelCellMark('p2', r, c)"
              @cell-highlight="(r, c) => onDuelCellHighlight('p2', r, c)"
              @clear-highlight="() => onDuelClearHighlight('p2')"
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { useSettings } from '@/composables/useSettings'
import { api } from '@/services/api'
import { store } from '@/store'
import type { GameStatus, MinesweeperCell, OnlineLobby, StartMatchResponse } from '@/types/api'
import MinesweeperMenu from './MinesweeperMenu.vue'
import MinesweeperHeader from './MinesweeperHeader.vue'
import MinesweeperBoard from './MinesweeperBoard.vue'

const bootstrappingOnline = ref(true)
const showMenu = ref(true)
const currentDifficulty = ref('Новичок')
const { settings } = useSettings()
const gameId = ref<string | null>(null)
const myGameId = ref<string | null>(null)
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
const activeGameId = computed(() => (onlineMatchId.value ? myGameId.value : gameId.value))
const onlineWs = ref<WebSocket | null>(null)
const player1Board = ref<MinesweeperCell[][]>([])
const player2Board = ref<MinesweeperCell[][]>([])
const player1GameStatus = ref<GameStatus>('idle')
const player2GameStatus = ref<GameStatus>('idle')
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

const minesLeftForBoard = (b: MinesweeperCell[][]) => {
  if (!b.length || !minesCount.value) return minesCount.value
  const flags = b.flat().filter((c) => c.mark === 'flag').length
  return minesCount.value - flags
}

const player1MinesLeft = computed(() => minesLeftForBoard(player1Board.value))

const player2MinesLeft = computed(() => minesLeftForBoard(player2Board.value))

const player1StatusLabel = computed(() => gameStatusRu(player1GameStatus.value))

const player2StatusLabel = computed(() => gameStatusRu(player2GameStatus.value))

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

const flagsCount = computed(() => {
  const g =
    onlineMatchId.value ? (isLobbyHost.value ? player1Board.value : player2Board.value) : board.value
  return g.flat().filter(cell => cell.mark === 'flag').length
})

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
  if (!b?.length) return []
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(b) as MinesweeperCell[][]
    }
    return JSON.parse(JSON.stringify(b)) as MinesweeperCell[][]
  } catch {
    try {
      return JSON.parse(JSON.stringify(b)) as MinesweeperCell[][]
    } catch {
      return []
    }
  }
}

const ONLINE_MS_SESSION_KEY = 'swepp-ms-online-v1'

const persistOnlineSessionSnapshot = () => {
  try {
    if (onlineMatchId.value && myGameId.value && onlineLobby.value?.id) {
      sessionStorage.setItem(
        ONLINE_MS_SESSION_KEY,
        JSON.stringify({
          lobbyId: onlineLobby.value.id,
          matchId: onlineMatchId.value,
          myGameId: myGameId.value,
          pinnedOpponentUserId: pinnedOpponentUserId.value || undefined
        })
      )
    } else {
      sessionStorage.removeItem(ONLINE_MS_SESSION_KEY)
    }
  } catch {
    /* ignore */
  }
}

const clearOnlineSessionSnapshot = () => {
  try {
    sessionStorage.removeItem(ONLINE_MS_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

let playTickInterval: ReturnType<typeof setInterval> | null = null

const stopPlayTick = () => {
  if (playTickInterval) {
    clearInterval(playTickInterval)
    playTickInterval = null
  }
}

const syncPlayTicker = () => {
  if (!activeGameId.value || gameStatus.value !== 'playing') {
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
  if (!onlineMatchId.value) {
    gameId.value = state.gameId
  }
  const cells = cloneCells(state.board)
  if (onlineMatchId.value) {
    if (isLobbyHost.value) {
      player1Board.value = cells
      player1GameStatus.value = state.gameStatus
    } else {
      player2Board.value = cells
      player2GameStatus.value = state.gameStatus
    }
  } else {
    board.value = cells
  }
  gameStatus.value = state.gameStatus
  rows.value = state.rows
  cols.value = state.cols
  minesCount.value = state.mines
  seed.value = state.seed
  time.value = state.time
  syncPlayTicker()
}

const loadOnlineMatchFromStartResponse = async (started: StartMatchResponse) => {
  isLeavingGame.value = false
  syncPinnedOpponentFromLobby()
  myGameId.value = started.myGameId
  gameId.value = started.myGameId
  const newMatch = onlineMatchId.value !== started.matchId
  if (newMatch) {
    onlineMatchId.value = started.matchId
    player1Board.value = []
    player2Board.value = []
    player1GameStatus.value = 'playing'
    player2GameStatus.value = 'playing'
    clearHighlight()
  }
  const myState = await api.getMinesweeperGame(started.myGameId, effectiveDevMode.value)
  applyGameState(myState)
  await refreshOpponentState()
  persistOnlineSessionSnapshot()
}

const hydrateActiveMatchIfNeeded = async () => {
  const lob = onlineLobby.value
  if (!lob?.id || lob.status !== 'active' || onlineMatchId.value) return
  try {
    const started = await api.getActiveMatch(lob.id)
    if (!started) return
    await loadOnlineMatchFromStartResponse(started)
  } catch (e) {
    console.error('hydrate active match failed', e)
  }
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
        await hydrateActiveMatchIfNeeded()
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
        const moverId = (msg.payload as { userId?: string })?.userId
        if (moverId && moverId === myUserId.value) return
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
            if (myGameId.value) {
              const myState = await api.getMinesweeperGame(myGameId.value, effectiveDevMode.value)
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
    const cells = cloneCells(state.board)
    const gs = state.gameStatus
    if (isLobbyHost.value) {
      player2Board.value = cells
      player2GameStatus.value = gs
    } else {
      player1Board.value = cells
      player1GameStatus.value = gs
    }
  } catch (err) {
    console.error('Failed to fetch opponent state', err)
  }
}

const isIgnorableGameError = (err: any): boolean => {
  const status = err?.response?.status
  return status === 404 || status === 410
}

const handleCellOpen = async (row: number, col: number) => {
  const targetId = onlineMatchId.value ? myGameId.value : gameId.value
  if (!targetId || isBusy.value) return
  if (gameStatus.value === 'won' || gameStatus.value === 'lost') return
  isBusy.value = true
  try {
    const state = await api.revealMinesweeperCell(targetId, row, col)
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
  const targetId = onlineMatchId.value ? myGameId.value : gameId.value
  if (!targetId || isBusy.value) return
  if (gameStatus.value === 'won' || gameStatus.value === 'lost') return
  isBusy.value = true
  try {
    const state = await api.markMinesweeperCell(targetId, row, col)
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
  await hydrateActiveMatchIfNeeded()
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
  await hydrateActiveMatchIfNeeded()
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
  if (!myGameId.value || !onlineMatchId.value) return
  isSyncingOnline.value = true
  try {
    isLeavingGame.value = false
    const myState = await api.getMinesweeperGame(myGameId.value, effectiveDevMode.value)
    applyGameState(myState)
    await refreshOpponentState()
    persistOnlineSessionSnapshot()
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
  clearOnlineSessionSnapshot()
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
  player1Board.value = []
  player2Board.value = []
  player1GameStatus.value = 'idle'
  player2GameStatus.value = 'idle'
  stopPlayTick()
  gameId.value = null
  myGameId.value = null
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
  const currentGameId = onlineMatchId.value ? myGameId.value : gameId.value
  stopPlayTick()
  clearOnlineSessionSnapshot()
  onlineWs.value?.close()
  onlineWs.value = null
  showMenu.value = true
  clearHighlight()
  onlineLobby.value = null
  onlineMatchId.value = null
  player1Board.value = []
  player2Board.value = []
  pinnedOpponentUserId.value = ''
  player1GameStatus.value = 'idle'
  player2GameStatus.value = 'idle'
  gameId.value = null
  myGameId.value = null
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

const chordGrid = (): MinesweeperCell[][] =>
  onlineMatchId.value ? (isLobbyHost.value ? player1Board.value : player2Board.value) : board.value

const getNeighbors = (row: number, col: number) => {
  const grid = chordGrid()
  const out: MinesweeperCell[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value) {
        out.push(grid[nr][nc])
      }
    }
  }
  return out
}

const highlightNeighbors = (row: number, col: number) => {
  const grid = chordGrid()
  const cell = grid[row]?.[col]
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

const myInteractiveSeat = computed<'p1' | 'p2'>(() => (isLobbyHost.value ? 'p1' : 'p2'))

const onDuelCellOpen = (seat: 'p1' | 'p2', row: number, col: number) => {
  if (!onlineMatchId.value || seat !== myInteractiveSeat.value) return
  handleCellOpen(row, col)
}

const onDuelCellMark = (seat: 'p1' | 'p2', row: number, col: number) => {
  if (!onlineMatchId.value || seat !== myInteractiveSeat.value) return
  handleCellMark(row, col)
}

const onDuelCellHighlight = (seat: 'p1' | 'p2', row: number, col: number) => {
  if (!onlineMatchId.value || seat !== myInteractiveSeat.value) return
  highlightNeighbors(row, col)
}

const onDuelClearHighlight = (seat: 'p1' | 'p2') => {
  if (!onlineMatchId.value || seat !== myInteractiveSeat.value) return
  clearHighlight()
}

const tryRestoreOnlineSession = async () => {
  if (!store.getters.isAuthenticated) return
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(ONLINE_MS_SESSION_KEY)
  } catch {
    return
  }
  if (!raw) return
  let parsed: { lobbyId: string; matchId: string; myGameId: string; pinnedOpponentUserId?: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearOnlineSessionSnapshot()
    return
  }
  try {
    const lobby = await api.getOnlineLobby(parsed.lobbyId)
    onlineLobby.value = lobby
    syncHostEditor()
    syncPinnedOpponentFromLobby()
    if (parsed.pinnedOpponentUserId) pinnedOpponentUserId.value = parsed.pinnedOpponentUserId

    onlineMatchId.value = parsed.matchId
    myGameId.value = parsed.myGameId
    gameId.value = parsed.myGameId
    isLeavingGame.value = false

    try {
      const myState = await api.getMinesweeperGame(parsed.myGameId, effectiveDevMode.value)
      applyGameState(myState)
      await refreshOpponentState()
    } catch {
      const started = await api.getActiveMatch(parsed.lobbyId)
      if (!started) throw new Error('no game and no active match')
      await loadOnlineMatchFromStartResponse(started)
    }

    showMenu.value = false
    connectLobbyWs(parsed.lobbyId)
    persistOnlineSessionSnapshot()
  } catch (e) {
    console.error('restore online session failed', e)
    clearOnlineSessionSnapshot()
    onlineLobby.value = null
    onlineMatchId.value = null
    gameId.value = null
    myGameId.value = null
    board.value = []
    player1Board.value = []
    player2Board.value = []
  }
}

onBeforeUnmount(() => stopPlayTick())

onMounted(async () => {
  try {
    await tryRestoreOnlineSession()
  } finally {
    bootstrappingOnline.value = false
  }
})

watch(
  [onlineMatchId, gameId, myGameId, pinnedOpponentUserId, () => onlineLobby.value?.id],
  () => persistOnlineSessionSnapshot()
)

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
.ms-boot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 12rem;
  padding: 2rem;
  font-size: 1rem;
  opacity: 0.92;
}

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
