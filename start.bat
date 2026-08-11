@echo off
chcp 65001 >nul
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo Python не найден. Поставь с https://www.python.org/downloads/
  echo При установке включи галочку "Add python.exe to PATH".
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Создаю виртуальное окружение...
  python -m venv .venv
)

echo Ставлю зависимости...
".venv\Scripts\python.exe" -m pip install -q -r requirements.txt
if errorlevel 1 (
  echo Не удалось поставить пакеты.
  pause
  exit /b 1
)

if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo.
  echo Создан файл .env — открой его блокнотом и вставь BOT_TOKEN от @BotFather
  echo Потом запусти start.bat ещё раз.
  notepad ".env"
  pause
  exit /b 0
)

echo Запускаю UNDR бота...
".venv\Scripts\python.exe" bot.py
pause
