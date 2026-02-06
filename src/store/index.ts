import { createStore } from 'vuex'
import type { User } from '@/types/api'

export interface RootState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export const store = createStore<RootState>({
  state: {
    user: null,
    isAuthenticated: false,
    isLoading: false
  },

  mutations: {
    SET_USER(state, user: User | null) {
      state.user = user
      state.isAuthenticated = !!user
    },

    SET_LOADING(state, isLoading: boolean) {
      state.isLoading = isLoading
    }
  },

  actions: {
    async login({ commit }, { email, password }) {
      commit('SET_LOADING', true)
      try {
        const { api } = await import('@/services/api')
        const response = await api.login({ email, password })
        localStorage.setItem('auth_token', response.token)
        commit('SET_USER', response.user)
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async register({ commit }, { username, email, password }) {
      commit('SET_LOADING', true)
      try {
        const { api } = await import('@/services/api')
        const response = await api.register({ username, email, password })
        localStorage.setItem('auth_token', response.token)
        commit('SET_USER', response.user)
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async logout({ commit }) {
      try {
        const { api } = await import('@/services/api')
        await api.logout()
      } catch {
      } finally {
        localStorage.removeItem('auth_token')
        commit('SET_USER', null)
      }
    },

    async fetchCurrentUser({ commit }) {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        commit('SET_USER', null)
        return
      }

      commit('SET_LOADING', true)
      try {
        const { api } = await import('@/services/api')
        const user = await api.getCurrentUser()
        commit('SET_USER', user)
      } catch {
        localStorage.removeItem('auth_token')
        commit('SET_USER', null)
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },

  getters: {
    isAuthenticated: (state) => state.isAuthenticated,
    currentUser: (state) => state.user,
    isLoading: (state) => state.isLoading
  }
})
