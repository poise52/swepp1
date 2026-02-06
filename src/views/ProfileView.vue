<template>
  <MainLayout>
    <div class="profile">
      <h2 class="profile__title">Профиль</h2>

      <div class="profile__info">
        <div class="profile__field">
          <span class="profile__label">Имя пользователя:</span>
          <span class="profile__value">{{ currentUser?.username }}</span>
        </div>
        <div class="profile__field">
          <span class="profile__label">Email:</span>
          <span class="profile__value">{{ currentUser?.email }}</span>
        </div>
        <div class="profile__field">
          <span class="profile__label">Дата регистрации:</span>
          <span class="profile__value">{{ formatDate(currentUser?.createdAt) }}</span>
        </div>
      </div>

      <h3 class="profile__subtitle">Мои рекорды</h3>

      <div v-if="isLoading" class="profile__loading">Загрузка...</div>
      <div v-else-if="error" class="profile__error">{{ error }}</div>
      <div v-else-if="records.length === 0" class="profile__empty">Рекордов пока нет</div>
      <div v-else class="profile__records">
        <div v-for="record in records" :key="record.id" class="profile__record">
          <div class="profile__record-info">
            <div class="profile__record-diff">{{ record.difficulty }}</div>
            <div class="profile__record-meta">
              {{ record.cols }}×{{ record.rows }} · {{ record.mines }} мин
            </div>
          </div>
          <div class="profile__record-time">{{ formatTime(record.time) }}</div>
          <div :class="['profile__record-status', `profile__record-status--${record.won ? 'won' : 'lost'}`]">
            {{ record.won ? '✓' : '✗' }}
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import MainLayout from '@/layouts/MainLayout.vue'
import { api } from '@/services/api'
import type { GameRecord } from '@/types/api'

const store = useStore()
const currentUser = computed(() => store.getters.currentUser)

const records = ref<GameRecord[]>([])
const isLoading = ref(false)
const error = ref('')

const formatDate = (date?: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ru-RU')
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const loadRecords = async () => {
  if (!currentUser.value?.id) return

  isLoading.value = true
  error.value = ''

  try {
    const response = await api.getUserRecords(currentUser.value.id, 10)
    records.value = response.records
  } catch (err: any) {
    error.value = 'Ошибка загрузки рекордов'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRecords)
</script>

<style scoped lang="scss">
.profile {
  background: var(--ms-menu-bg);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 24px var(--ms-shadow);
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;

  &__title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
    color: var(--ms-text);
  }

  &__info {
    margin-bottom: 32px;
  }

  &__field {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--ms-menu-form-bg);
    border-radius: 8px;
    margin-bottom: 8px;
  }

  &__label {
    color: var(--ms-text-secondary);
    font-weight: 500;
  }

  &__value {
    color: var(--ms-text);
    font-weight: 600;
  }

  &__subtitle {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--ms-text);
  }

  &__loading,
  &__error,
  &__empty {
    text-align: center;
    padding: 40px;
    color: var(--ms-text-secondary);
  }

  &__error {
    color: var(--ms-num-3);
  }

  &__records {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__record {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: var(--ms-menu-form-bg);
    border-radius: 8px;
  }

  &__record-info {
    flex: 1;
  }

  &__record-diff {
    font-weight: 600;
    color: var(--ms-text);
  }

  &__record-meta {
    font-size: 12px;
    color: var(--ms-text-secondary);
  }

  &__record-time {
    font-size: 18px;
    font-weight: 700;
    color: var(--ms-text);
  }

  &__record-status {
    font-size: 20px;
    font-weight: 700;
    min-width: 30px;
    text-align: center;

    &--won {
      color: var(--ms-num-2);
    }

    &--lost {
      color: var(--ms-num-3);
    }
  }
}
</style>
