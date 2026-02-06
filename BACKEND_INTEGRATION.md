# Интеграция с бэкендом

## Структура проекта

```
src/
├── components/          # Vue компоненты
│   └── minesweeper/    # Компоненты игры
├── views/              # Страницы приложения
│   ├── GameView.vue
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   ├── RecordsView.vue
│   ├── HelpView.vue
│   └── ProfileView.vue
├── layouts/            # Layouts приложения
│   └── MainLayout.vue
├── composables/        # Composables (логика)
│   ├── useMinesweeper.ts
│   ├── useSettings.ts
│   └── useTheme.ts
├── services/           # API сервисы
│   └── api.ts
├── store/              # Vuex store
│   └── index.ts
├── router/             # Vue Router
│   └── index.ts
└── types/              # TypeScript типы
    └── api.ts
```

## API Endpoints

Бэкенд должен реализовать следующие endpoints:

### Аутентификация

**POST /api/auth/register**
```typescript
Request: { username: string, email: string, password: string }
Response: { user: User, token: string }
```

**POST /api/auth/login**
```typescript
Request: { email: string, password: string }
Response: { user: User, token: string }
```

**POST /api/auth/logout**
```typescript
Response: void
```

**GET /api/auth/me**
```typescript
Response: User
```

### Рекорды

**POST /api/records**
```typescript
Request: {
  difficulty: string
  rows: number
  cols: number
  mines: number
  time: number
  seed: number
  won: boolean
}
Response: GameRecord
```

**GET /api/records**
```typescript
Query: { difficulty?: string, limit?: number }
Response: { records: GameRecord[], total: number }
```

**GET /api/records/user/:userId**
```typescript
Query: { limit?: number }
Response: { records: GameRecord[], total: number }
```

## Настройка

1. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

2. Укажите URL бэкенда:
```
VITE_API_URL=http://localhost:3000/api
```

## Аутентификация

- Токен сохраняется в `localStorage` с ключом `auth_token`
- Все API запросы автоматически добавляют `Authorization: Bearer <token>`
- При 401 ошибке токен удаляется и происходит редирект на `/login`

## Vuex Store

### State
```typescript
{
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
```

### Actions
- `login(email, password)` - вход
- `register(username, email, password)` - регистрация
- `logout()` - выход
- `fetchCurrentUser()` - получить текущего пользователя

### Getters
- `isAuthenticated` - залогинен ли пользователь
- `currentUser` - текущий пользователь
- `isLoading` - загрузка

## Routes

- `/` - главная страница (игра)
- `/login` - вход (только для гостей)
- `/register` - регистрация (только для гостей)
- `/records` - таблица рекордов (доступно всем)
- `/help` - справка (доступно всем)
- `/profile` - профиль (требует авторизации)

## Защита роутов

В `router/index.ts` настроена защита:
- `meta.requiresAuth: true` - требует авторизации
- `meta.guestOnly: true` - только для гостей

## Интеграция сохранения рекордов

После окончания игры можно сохранить рекорд:

```typescript
import { api } from '@/services/api'
import { useStore } from 'vuex'

const store = useStore()
const isAuthenticated = computed(() => store.getters.isAuthenticated)

// После окончания игры
if (isAuthenticated.value && gameStatus.value === 'won') {
  await api.saveGameRecord({
    difficulty: 'Новичок',
    rows: 9,
    cols: 9,
    mines: 10,
    time: 45,
    seed: 123456,
    won: true
  })
}
```

## Что нужно реализовать в бэкенде

1. **Сервер Node.js** (Express, Fastify, NestJS)
2. **База данных** (PostgreSQL, MongoDB, MySQL)
3. **JWT аутентификация**
4. **Таблицы**:
   - `users` (id, username, email, password_hash, created_at)
   - `records` (id, user_id, difficulty, rows, cols, mines, time, seed, won, created_at)
5. **Валидация** (email, password, game parameters)
6. **CORS** для фронтенда
7. **Rate limiting** для защиты от спама
