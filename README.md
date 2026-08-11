# UNDR — телеграм-маркет трусов

Стильный молодёжный шоп нижнего белья в Telegram + веб-витрина.

## Что внутри

- каталог: он / она / unisex / limited
- карточки с размером и цветом
- корзина, плюс/минус, оформление заказа
- уведомление админу (`ADMIN_CHAT_ID`)
- веб-превью витрины

## Запуск бота

1. Напиши [@BotFather](https://t.me/BotFather) → `/newbot` → скопируй токен.
2. Скопируй `.env.example` в `.env` и вставь токен:

```bash
cp .env.example .env
# BOT_TOKEN=123456:ABC...
# ADMIN_CHAT_ID=твой_telegram_id   # необязательно
```

3. Установи зависимости и стартуй.

### Windows (PowerShell)

Не копируй ссылки из чата. Файл называется просто `bot.py`.

```powershell
cd C:\Users\lol\121213
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env
notepad .env
python bot.py
```

Если `Activate.ps1` ругается на политику:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Либо просто дважды кликни **`start.bat`** в папке проекта.

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python bot.py
```

4. Открой бота в Telegram → `/start`.

### Если `Timed out` / `ConnectTimeout`

Из России `api.telegram.org` часто режется. Бот должен ходить в API **через VPN или локальный прокси**.

1. Включи VPN на весь Windows **или** клиент (Hiddify / Clash / v2rayN) с локальным портом.
2. В `.env` добавь порт из клиента, например:

```
TELEGRAM_PROXY=socks5://127.0.0.1:10808
```

или

```
TELEGRAM_PROXY=http://127.0.0.1:7890
```

3. Снова: `python -m pip install -r requirements.txt` и `python bot.py`.

Проверка в PowerShell (должен ответить не таймаутом):

```powershell
curl.exe -I --max-time 15 https://api.telegram.org
```

## Веб-витрина

```bash
python web.py
```

Откроется на порту `8080`.

## Команды бота

| команда    | что делает     |
|------------|----------------|
| `/start`   | витрина / меню |
| `/catalog` | весь дроп      |
| `/cart`    | корзина        |
| `/help`    | справка        |

Бренд: **UNDR** — *твоя база. без лишнего.*
