<template>
  <MainLayout>
    <div class="records">
      <h2 class="records__title">Рекорды</h2>

      <div class="records__filters">
        <button
          v-for="diff in difficulties"
          :key="diff"
          :class="['records__filter-btn', { 'records__filter-btn--active': selectedDifficulty === diff }]"
          @click="selectedDifficulty = diff"
        >
          {{ diff }}
        </button>
      </div>

      <div v-if="isLoading" class="records__loading">Загрузка...</div>
      <div v-else-if="error" class="records__error">{{ error }}</div>
      <div v-else-if="records.length === 0" class="records__empty">Рекордов пока нет</div>
      <div v-else class="records__list">
        <div v-for="(record, index) in records" :key="record.id" class="records__item">
          <div class="records__rank">{{ index + 1 }}</div>
          <div class="records__info">
            <div class="records__username">{{ record.user?.username || 'Аноним' }}</div>
            <div class="records__meta">
              {{ record.cols }}×{{ record.rows }} · {{ record.mines }} мин
            </div>
          </div>
          <div class="records__time">{{ formatTime(record.time) }}</div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { api } from '@/services/api'
import type { GameRecord } from '@/types/api'

const difficulties = ['Все', 'Новичок', 'Любитель', 'Эксперт']
const selectedDifficulty = ref('Все')
const records = ref<GameRecord[]>([])
const isLoading = ref(false)
const error = ref('')

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const loadRecords = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const difficulty = selectedDifficulty.value === 'Все' ? undefined : selectedDifficulty.value
    const response = await api.getRecords(difficulty, 20)
    records.value = response.records
  } catch (err: any) {
    error.value = 'Ошибка загрузки рекордов'
  } finally {
    isLoading.value = false
  }
}

watch(selectedDifficulty, loadRecords)
onMounted(loadRecords)
</script>

<style scoped lang="scss">
.records {
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

  &__filters {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    justify-content: center;
  }

  &__filter-btn {
    padding: 8px 16px;
    background: var(--ms-menu-btn);
    color: var(--ms-text);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--ms-menu-btn-hover);
    }

    &--active {
      background: var(--ms-start-btn);
      color: var(--ms-start-btn-text);
    }
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

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: var(--ms-menu-form-bg);
    border-radius: 8px;
  }

  &__rank {
    font-size: 18px;
    font-weight: 700;
    color: var(--ms-num-1);
    min-width: 30px;
  }

  &__info {
    flex: 1;
  }

  &__username {
    font-weight: 600;
    color: var(--ms-text);
  }

  &__meta {
    font-size: 12px;
    color: var(--ms-text-secondary);
  }

  &__time {
    font-size: 18px;
    font-weight: 700;
    color: var(--ms-text);
  }
}
</style>
