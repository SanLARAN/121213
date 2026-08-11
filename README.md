# AURUM — магазин на GitHub Pages

Статический интернет-магазин: витрина, аккаунты, корзина, заказы и админка.

Сайт: https://sanlaran.github.io/121213/

## Как пользоваться

- Регистрация и вход в разделе **Аккаунт**
- Админ: `admin@aurum.shop` / `admin123`
- Админка: `#/admin` — товары, заказы, пользователи

Данные живут в `localStorage` браузера (GitHub Pages не даёт свой сервер и базу).

## Деплой

Workflow `.github/workflows/pages.yml` публикует сайт на GitHub Pages.
В репозитории: Settings → Pages → Source: **GitHub Actions**.
