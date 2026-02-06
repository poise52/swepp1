<template>
  <div class="layout">
    <nav class="layout__nav">
      <div class="layout__nav-left">
        <router-link to="/" class="layout__logo">Сапёр</router-link>
        <router-link to="/records" class="layout__link">Рекорды</router-link>
        <router-link to="/help" class="layout__link">Справка</router-link>
      </div>
      <div class="layout__nav-right">
        <button class="layout__theme-btn" @click="toggleTheme" :title="theme === 'light' ? 'Тёмная тема' : 'Светлая тема'">
          {{ theme === 'light' ? '🌙' : '☀️' }}
        </button>
        <template v-if="isAuthenticated">
          <router-link to="/profile" class="layout__link">{{ currentUser?.username }}</router-link>
          <button @click="handleLogout" class="layout__link layout__link--btn">Выход</button>
        </template>
        <template v-else>
          <router-link to="/login" class="layout__link">Вход</router-link>
          <router-link to="/register" class="layout__link">Регистрация</router-link>
        </template>
      </div>
    </nav>
    <main class="layout__main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const store = useStore()
const { theme, toggleTheme } = useTheme()

const isAuthenticated = computed(() => store.getters.isAuthenticated)
const currentUser = computed(() => store.getters.currentUser)

const handleLogout = async () => {
  await store.dispatch('logout')
  router.push('/login')
}
</script>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--ms-page-bg);

  &__nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    background: var(--ms-bg);
    border-bottom: 1px solid var(--ms-border);
  }

  &__nav-left,
  &__nav-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__logo {
    font-family: 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--ms-text);
    text-decoration: none;
    margin-right: 8px;
  }

  &__link {
    color: var(--ms-text-secondary);
    text-decoration: none;
    font-size: 14px;
    transition: color 0.2s;

    &:hover {
      color: var(--ms-text);
    }

    &.router-link-active {
      color: var(--ms-text);
      font-weight: 600;
    }

    &--btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
    }
  }

  &__theme-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
  }

  &__main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
}
</style>
