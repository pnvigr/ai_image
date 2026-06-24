# ChartSense AI

Образовательный дипломный проект: **как ИИ анализирует скриншоты трейдинговых графиков**.

Пользователь загружает скриншот графика → бэкенд отправляет его в vision-модель через
[OpenRouter](https://openrouter.ai) → модель возвращает структурированный «прогноз»
(пара, направление, экспирация, уверенность, описание), который красиво показывается на фронте.

> ⚠️ **Главный тезис работы:** ИИ **не предсказывает** рынок. Любой «прогноз» — это разбор
> картинки, а не гарантия. Реальный винрейт определяется рынком и условиями платформы, а не
> «силой» модели. Дисклеймер встроен в интерфейс намеренно.

## Стек

- **Монорепо:** pnpm workspaces + TypeScript
- **`apps/api`** — Node.js + Express + MongoDB (Mongoose) + OpenRouter
- **`apps/web`** — React + Vite + Tailwind CSS
- **`packages/shared`** — общие типы и Zod-схемы (единый формат ответа для фронта и бэка)
- **Деплой:** Railway (Фаза 6)

## Быстрый старт

```bash
# 1. Установить зависимости (Node >= 20, pnpm >= 9)
pnpm install

# 2. (опционально) задать переменные окружения
cp apps/api/.env.example apps/api/.env
#   без MONGODB_URI       → история отключена, остальное работает
#   без OPENROUTER_API_KEY → API отвечает mock-ответами (demo-режим работает из коробки)

# 3. Запустить фронт + бэк вместе
pnpm dev
```

- Фронтенд: http://localhost:5173
- API: http://localhost:4000 · health-check: http://localhost:4000/api/health

В деве Vite проксирует `/api` на бэкенд, поэтому фронт работает без настройки.

## Скрипты

| Команда | Что делает |
|---|---|
| `pnpm dev` | Запускает `shared` (watch), `api` и `web` параллельно |
| `pnpm dev:api` / `pnpm dev:web` | Запуск по отдельности |
| `pnpm build` | Сборка всех пакетов (в топологическом порядке) |
| `pnpm typecheck` | Проверка типов во всём монорепо |
| `pnpm start` | Прод-запуск API из собранного `dist` |

## OpenRouter

1. Получи ключ на https://openrouter.ai/keys
2. Положи в `apps/api/.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_FREE_MODEL=meta-llama/llama-3.2-11b-vision-instruct:free
   ```
3. Бесплатные vision-модели иногда меняются/упираются в лимиты — актуальный список
   ищи на https://openrouter.ai/models?modality=text+image (фильтр «free»). Модель меняется
   одной переменной окружения, код трогать не нужно.

Без ключа API возвращает mock-ответы — интерфейс полностью кликабелен для демо.

## Деплой на Railway

Проект — pnpm-монорепо. Проще всего поднять **одним сервисом**: API отдаёт и REST, и
собранный фронт (SPA) с одного домена — без CORS и без отдельного URL для фронта.

### Вариант 1 — один сервис (рекомендуется)

1. Создай проект на Railway из этого репозитория (в корне есть `railway.json`).
2. Добавь базу: **New → Database → MongoDB**.
3. В сервисе приложения задай переменные окружения:
   ```
   SERVE_WEB=true
   MONGODB_URI=${{MongoDB.MONGO_URL}}     # ссылка на переменную базы Railway
   JWT_SECRET=<длинная случайная строка>
   OPENROUTER_API_KEY=<ключ; пусто = demo/mock>
   ADMIN_EMAIL=<твой email — станет админом при входе>
   SUPPORT_CONTACT=<твой контакт для зачисления токенов>
   # опционально: FREE_DAILY_LIMIT, PAID_ANALYSIS_COST, OPENROUTER_FREE_MODEL, OPENROUTER_TEXT_MODEL
   ```
   `VITE_API_URL` оставь пустым — фронт ходит на тот же домен (`/api`).
4. Build Command: `pnpm build` · Start Command: `pnpm start` (уже в `railway.json`).
5. Открой публичный домен сервиса — это приложение целиком.

> `VITE_API_URL` инлайнится при сборке фронта. Для варианта 1 он пустой,
> поэтому фронт использует относительный `/api` — что и нужно.

### Вариант 2 — два сервиса (api и web раздельно)

Два сервиса из одного репозитория (Root Directory у обоих — корень):

- **API** — Build: `pnpm run build:api` · Start: `pnpm run start:api`
  Переменные: `MONGODB_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `ADMIN_EMAIL`,
  `SUPPORT_CONTACT`, `CORS_ORIGIN=<публичный URL web-сервиса>`.
- **WEB** — Build: `pnpm run build:web` · Start: `pnpm run start:web`
  Переменная: `VITE_API_URL=<публичный URL api-сервиса>` (нужна на этапе сборки).

## Дорожная карта

- [x] **Фаза 1** — каркас монорепо + ядро: загрузка скриншота → OpenRouter → карточка-прогноз
- [x] **Фаза 2** — аутентификация (JWT)
- [x] **Фаза 3** — история анализов + ручная отметка «зашёл / результат / payout»
- [x] **Фаза 4** — токены + платная модель + админка
- [x] **Фаза 5** — аналитика сделок и рекомендации инструментов
- [x] **Фаза 6** — деплой на Railway
