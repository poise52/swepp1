export type UserRole = 'user' | 'admin' | 'superuser' | string

export interface User {
  id: string
  username: string
  email: string
  ratingPts: number
  worldRank: number
  role: UserRole
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface GameRecord {
  id: string
  userId: string
  difficulty: string
  rows: number
  cols: number
  mines: number
  time: number
  seed: number
  won: boolean
  createdAt: string
  user?: {
    username: string
  }
}

export interface RecordsResponse {
  records: GameRecord[]
  total: number
}

export interface ApiError {
  message: string
  code?: string
}

export type CellMark = 'none' | 'flag' | 'question'
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

export interface MinesweeperCell {
  row: number
  col: number
  isMine: boolean
  isOpen: boolean
  mark: CellMark
  adjacentMines: number
}

export interface MinesweeperSettingsPayload {
  fieldGeneration: string
  showQuestionMarks: boolean
  enableChord: boolean
  devMode: boolean
}

export interface MinesweeperGameState {
  gameId: string
  board: MinesweeperCell[][]
  gameStatus: GameStatus
  rows: number
  cols: number
  mines: number
  seed: number
  time: number
}

export interface LobbyPlayer {
  userId: string
  username: string
  ready: boolean
}

export interface OnlineLobby {
  id: string
  /** Владелец лобби = первый столбец матча на клиенте; совпадает с тем, кто игрок 1 при старте. */
  ownerId?: string
  inviteCode: string
  inviteLink: string
  mode: 'casual' | 'ranked'
  rows: number
  cols: number
  mines: number
  seed: number
  algorithmVersion: number
  status: string
  players: LobbyPlayer[]
}

export interface StartMatchResponse {
  matchId: string
  myGameId: string
  opponentGameId: string
  seed: number
  rows: number
  cols: number
  mines: number
  mode: string
  algorithmVersion: number
}
