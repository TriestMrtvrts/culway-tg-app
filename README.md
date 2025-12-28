# culway-tg-app
MVP project for self guided tour
Culway

Culway — MVP-проект, состоящий из Telegram-бота и Web-приложения.
Проект используется как экспериментальная платформа для прототипирования
и тестирования идей. Находится в стадии активной разработки.


СТРУКТУРА ПРОЕКТА

culway/

|-- culway-tg-bot/

|   |-- bot.py

|   |-- old_app.tsx

|   |-- old_app_v2.tsx

|   |-- old_app_v3.tsx

|   |-- old_app_v4.tsx

|   |-- old_app_v5.tsx

|   |-- old_app_v6.tsx

|   |-- old_app_v7.tsx

|   |-- old_app_v8.tsx

|   `-- v9.tsx (актуалочка)

|

|-- culway-webapp/

|   |-- src/

|   |-- public/

|   |-- index.html

|   |-- package.json

|   |-- package-lock.json

|   |-- vite.config.ts

|   `-- tailwind.config.js

|

`-- README.txt


TELEGRAM BOT (culway-tg-bot)

Telegram-бот представляет собой backend-часть проекта.

ТЕКУЩИЕ ВОЗМОЖНОСТИ:
- обработка команд
- эксперименты с логикой бота
- сохранение нескольких версий реализации для анализа и сравнения

ЗАПУСК:
1) перейти в папку culway-tg-bot
2) установить зависимости (если требуется)
3) запустить командой:
   python bot.py

Для работы бота требуется настроенный Telegram Bot Token
(через переменные окружения).


WEB APPLICATION (culway-webapp)

Web-приложение реализовано с использованием современного frontend-стека.

ИСПОЛЬЗУЕМЫЕ ТЕХНОЛОГИИ:
- React
- TypeScript
- Vite
- Tailwind CSS
- ESLint

УСТАНОВКА И ЗАПУСК:
1) перейти в папку culway-webapp
2) установить зависимости:
   npm install
3) запустить dev-сервер:
   npm run dev

После запуска приложение будет доступно по адресу:
http://localhost:5173


СТАТУС ПРОЕКТА

- MVP реализован
- проект находится в активной разработке
- код может содержать временные и экспериментальные решения


ПРИМЕЧАНИЯ

- репозиторий использует monorepo-структуру
- старые версии файлов сохранены намеренно
- файлы .env не коммитятся в репозиторий
