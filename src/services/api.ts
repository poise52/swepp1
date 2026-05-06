import axios, { type AxiosInstance } from 'axios'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  GameRecord,
  RecordsResponse,
  User,
  MinesweeperGameState,
  MinesweeperSettingsPayload,
  OnlineLobby,
  StartMatchResponse,
  GameStatus
} from '@/types/api'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token')
          window.location.href = import.meta.env.BASE_URL + 'login'
        }
        return Promise.reject(error)
      }
    )
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', data)
    return response.data
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data)
    return response.data
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me')
    return response.data
  }

  async saveGameRecord(record: Omit<GameRecord, 'id' | 'userId' | 'createdAt'>): Promise<GameRecord> {
    const response = await this.client.post<GameRecord>('/records', record)
    return response.data
  }

  async getRecords(difficulty?: string, limit = 10): Promise<RecordsResponse> {
    const response = await this.client.get<RecordsResponse>('/records', {
      params: { difficulty, limit }
    })
    return response.data
  }

  async getUserRecords(userId: string, limit = 10): Promise<RecordsResponse> {
    const response = await this.client.get<RecordsResponse>(`/records/user/${userId}`, {
      params: { limit }
    })
    return response.data
  }

  async createMinesweeperGame(payload: {
    rows: number
    cols: number
    mines: number
    seed?: number
    settings: MinesweeperSettingsPayload
  }): Promise<MinesweeperGameState> {
    const response = await this.client.post<MinesweeperGameState>('/minesweeper/games', payload)
    return response.data
  }

  async revealMinesweeperCell(gameId: string, row: number, col: number): Promise<MinesweeperGameState> {
    const response = await this.client.post<MinesweeperGameState>(`/minesweeper/games/${gameId}/reveal`, { row, col })
    return response.data
  }

  async markMinesweeperCell(gameId: string, row: number, col: number): Promise<MinesweeperGameState> {
    const response = await this.client.post<MinesweeperGameState>(`/minesweeper/games/${gameId}/mark`, { row, col })
    return response.data
  }

  async getMinesweeperGame(gameId: string, devMode = false): Promise<MinesweeperGameState> {
    const response = await this.client.get<MinesweeperGameState>(`/minesweeper/games/${gameId}`, {
      params: { devMode }
    })
    return response.data
  }

  async deleteMinesweeperGame(gameId: string): Promise<void> {
    await this.client.delete(`/minesweeper/games/${gameId}`)
  }

  async createOnlineLobby(payload: {
    mode: 'casual' | 'ranked'
    rows: number
    cols: number
    mines: number
    seed?: number
    settings: MinesweeperSettingsPayload
  }): Promise<OnlineLobby> {
    const response = await this.client.post<OnlineLobby>('/online/lobbies', payload)
    return response.data
  }

  async joinOnlineLobby(payload: { inviteCode?: string; inviteLink?: string }): Promise<OnlineLobby> {
    const response = await this.client.post<OnlineLobby>('/online/lobbies/join', payload)
    return response.data
  }

  async getOnlineLobby(lobbyId: string): Promise<OnlineLobby> {
    const response = await this.client.get<OnlineLobby>(`/online/lobbies/${lobbyId}`)
    return response.data
  }

  async setOnlineReady(lobbyId: string, ready: boolean): Promise<OnlineLobby> {
    const response = await this.client.post<OnlineLobby>(`/online/lobbies/${lobbyId}/ready`, { ready })
    return response.data
  }

  async startOnlineMatch(lobbyId: string): Promise<StartMatchResponse> {
    const response = await this.client.post<StartMatchResponse>(`/online/lobbies/${lobbyId}/start`)
    return response.data
  }

  async sendOnlineMove(matchId: string, row: number, col: number, action: 'reveal' | 'mark'): Promise<void> {
    await this.client.post(`/online/matches/${matchId}/moves`, { row, col, action })
  }

  async finishOnlineMatch(matchId: string, winnerId: string): Promise<void> {
    await this.client.post(`/online/matches/${matchId}/finish`, { winnerId })
  }

  async getOpponentState(matchId: string): Promise<{ opponentGameId: string; board: MinesweeperGameState['board']; gameStatus: GameStatus }> {
    const response = await this.client.get(`/online/matches/${matchId}/opponent-state`)
    return response.data
  }

  getOnlineWsUrl(lobbyId: string): string {
    const token = localStorage.getItem('auth_token') || ''
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '')
    const wsBase = apiBase.replace(/^http/, 'ws')
    return `${wsBase}/api/online/lobbies/${lobbyId}/ws?token=${encodeURIComponent(token)}`
  }
}

export const api = new ApiService()
