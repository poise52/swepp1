<template>
  <MainLayout>
    <div class="help">
      <h2 class="help__title">Справка</h2>

      <div class="help__section">
        <h3 class="help__subtitle">Правила игры</h3>
        <p>Цель игры — открыть все клетки поля, не содержащие мины.</p>
        <ul>
          <li>Левый клик — открыть клетку</li>
          <li>Правый клик — поставить флаг/вопрос</li>
          <li>Клик по цифре (при включенном "Разоружение") — открыть соседей если флагов достаточно</li>
        </ul>
      </div>

      <div class="help__section">
        <h3 class="help__subtitle">Создание поля</h3>
        <p><strong>Безопасный старт:</strong> первый клик гарантированно не попадет на мину</p>
        <p><strong>Случайное:</strong> мины размещаются полностью случайно</p>
      </div>

      <div class="help__section">
        <h3 class="help__subtitle">Опции</h3>
        <p><strong>Знаки вопроса:</strong> позволяет ставить ? на клетки (флаг → вопрос → пусто)</p>
        <p><strong>Разоружение (chord):</strong> клик на открытую цифру открывает всех соседей, если флагов достаточно</p>
      </div>

      <div class="help__section">
        <h3 class="help__subtitle">Seed</h3>
        <p>Позволяет воспроизвести точно такое же поле. Одинаковый seed при одинаковых параметрах создает идентичное поле.</p>
      </div>

      <div class="help__section">
        <h3 class="help__subtitle">Горячие клавиши</h3>
        <ul>
          <li>Кнопка "🙂" — перезапустить игру (тот же seed)</li>
          <li>Кнопка "🔄" — новая игра (новый seed)</li>
          <li>Кнопка "←" — вернуться в меню</li>
        </ul>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/layouts/MainLayout.vue'
</script>

<style scoped lang="scss">
.help {
  background: var(--ms-menu-bg);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 24px var(--ms-shadow);
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  color: var(--ms-text);

  &__title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
  }

  &__section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__subtitle {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--ms-text);
  }

  p {
    margin-bottom: 8px;
    line-height: 1.6;
    color: var(--ms-text-secondary);
  }

  ul {
    margin: 8px 0;
    padding-left: 24px;
    color: var(--ms-text-secondary);
  }

  li {
    margin-bottom: 6px;
    line-height: 1.6;
  }

  strong {
    color: var(--ms-text);
    font-weight: 600;
  }
}
</style>
