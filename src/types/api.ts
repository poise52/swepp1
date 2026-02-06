export interface User {
  id: string
  username: string
  email: string
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
}

export interface RecordsResponse {
  records: GameRecord[]
  total: number
}

export interface ApiError {
  message: string
  code?: string
}
