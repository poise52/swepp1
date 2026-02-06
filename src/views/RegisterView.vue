<template>
  <MainLayout>
    <div class="auth-form">
      <h2 class="auth-form__title">Регистрация</h2>
      <form @submit.prevent="handleSubmit">
        <div class="auth-form__field">
          <label>Имя пользователя:</label>
          <input
            type="text"
            v-model="form.username"
            required
            placeholder="username"
          />
        </div>
        <div class="auth-form__field">
          <label>Email:</label>
          <input
            type="email"
            v-model="form.email"
            required
            placeholder="example@mail.com"
          />
        </div>
        <div class="auth-form__field">
          <label>Пароль:</label>
          <input
            type="password"
            v-model="form.password"
            required
            placeholder="••••••••"
          />
        </div>
        <div v-if="error" class="auth-form__error">{{ error }}</div>
        <button type="submit" class="auth-form__btn" :disabled="isLoading">
          {{ isLoading ? 'Загрузка...' : 'Зарегистрироваться' }}
        </button>
      </form>
      <div class="auth-form__footer">
        Уже есть аккаунт? <router-link to="/login">Войти</router-link>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import MainLayout from '@/layouts/MainLayout.vue'

const router = useRouter()
const store = useStore()

const form = ref({
  username: '',
  email: '',
  password: ''
})

const error = ref('')
const isLoading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    await store.dispatch('register', form.value)
    router.push('/')
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Ошибка регистрации'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.auth-form {
  background: var(--ms-menu-bg);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 24px var(--ms-shadow);
  width: 400px;

  &__title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
    color: var(--ms-text);
  }

  &__field {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--ms-text);
      font-size: 14px;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--ms-menu-input-border);
      border-radius: 8px;
      background: var(--ms-menu-input-bg);
      color: var(--ms-text);
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;

      &:focus {
        outline: none;
        background: var(--ms-menu-input-focus);
        border-color: var(--ms-num-1);
      }
    }
  }

  &__error {
    color: var(--ms-num-3);
    font-size: 14px;
    margin-bottom: 16px;
    text-align: center;
  }

  &__btn {
    width: 100%;
    padding: 12px;
    background: var(--ms-start-btn);
    color: var(--ms-start-btn-text);
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;

    &:hover:not(:disabled) {
      background: var(--ms-start-btn-hover);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &__footer {
    margin-top: 16px;
    text-align: center;
    font-size: 14px;
    color: var(--ms-text-secondary);

    a {
      color: var(--ms-num-1);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
