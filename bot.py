#!/usr/bin/env python3
"""UNDR — Telegram-бот маркета трусов."""

from __future__ import annotations

import logging
import os
from typing import Dict, List

from dotenv import load_dotenv
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
)
from telegram.constants import ParseMode
from telegram.error import NetworkError, TimedOut
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)
from telegram.request import HTTPXRequest

from catalog import BRAND, CATEGORIES, PRODUCTS, TAGLINE, by_category, format_price, get_product

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("undr")

# user_id -> list of {id, size, color, qty}
Carts: Dict[int, List[dict]] = {}


def cart_of(uid: int) -> List[dict]:
    return Carts.setdefault(uid, [])


def cart_total(uid: int) -> int:
    total = 0
    for item in cart_of(uid):
        p = get_product(item["id"])
        if p:
            total += p["price"] * item["qty"]
    return total


def cart_count(uid: int) -> int:
    return sum(i["qty"] for i in cart_of(uid))


def main_kb(uid: int) -> InlineKeyboardMarkup:
    n = cart_count(uid)
    cart_label = f"корзина ({n})" if n else "корзина"
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("каталог", callback_data="cat:all")],
            [
                InlineKeyboardButton("для него", callback_data="cat:men"),
                InlineKeyboardButton("для неё", callback_data="cat:women"),
            ],
            [
                InlineKeyboardButton("unisex", callback_data="cat:unisex"),
                InlineKeyboardButton("limited", callback_data="cat:limited"),
            ],
            [
                InlineKeyboardButton(cart_label, callback_data="cart"),
                InlineKeyboardButton("о бренде", callback_data="about"),
            ],
        ]
    )


def catalog_kb(cat: str, uid: int) -> InlineKeyboardMarkup:
    rows = []
    for p in by_category(cat):
        label = f"{p['emoji']} {p['name']} · {format_price(p['price'])}"
        rows.append([InlineKeyboardButton(label, callback_data=f"p:{p['id']}")])
    rows.append(
        [
            InlineKeyboardButton("← меню", callback_data="home"),
            InlineKeyboardButton(f"корзина ({cart_count(uid)})", callback_data="cart"),
        ]
    )
    return InlineKeyboardMarkup(rows)


def product_kb(p: dict) -> InlineKeyboardMarkup:
    size_row = [
        InlineKeyboardButton(s, callback_data=f"sz:{p['id']}:{s}") for s in p["sizes"]
    ]
    color_row = [
        InlineKeyboardButton(c, callback_data=f"cl:{p['id']}:{c}") for c in p["colors"]
    ]
    return InlineKeyboardMarkup(
        [
            size_row,
            color_row,
            [InlineKeyboardButton("в корзину  +", callback_data=f"add:{p['id']}")],
            [
                InlineKeyboardButton("← каталог", callback_data="cat:all"),
                InlineKeyboardButton("корзина", callback_data="cart"),
            ],
        ]
    )


def cart_kb(uid: int) -> InlineKeyboardMarkup:
    rows = []
    for i, item in enumerate(cart_of(uid)):
        p = get_product(item["id"])
        name = p["name"] if p else item["id"]
        rows.append(
            [
                InlineKeyboardButton("−", callback_data=f"qty:{i}:-1"),
                InlineKeyboardButton(f"{name} ×{item['qty']}", callback_data="noop"),
                InlineKeyboardButton("+", callback_data=f"qty:{i}:1"),
                InlineKeyboardButton("✕", callback_data=f"rm:{i}"),
            ]
        )
    if cart_of(uid):
        rows.append([InlineKeyboardButton("оформить заказ", callback_data="checkout")])
        rows.append([InlineKeyboardButton("очистить", callback_data="clear")])
    rows.append([InlineKeyboardButton("← в каталог", callback_data="cat:all")])
    return InlineKeyboardMarkup(rows)


def product_text(p: dict, pick: dict | None = None) -> str:
    pick = pick or {}
    sale = ""
    if p.get("old_price"):
        sale = f"  <s>{format_price(p['old_price'])}</s>"
    size = pick.get("size") or "—"
    color = pick.get("color") or "—"
    return (
        f"{p['emoji']} <b>{p['name']}</b>  ·  {p['tag']}\n"
        f"{format_price(p['price'])}{sale}\n\n"
        f"{p['desc']}\n\n"
        f"ткань: {p['fabric']}\n"
        f"размер: <b>{size}</b>   цвет: <b>{color}</b>\n\n"
        f"<i>выбери размер и цвет, потом жми «в корзину»</i>"
    )


def home_text() -> str:
    return (
        f"<b>{BRAND}</b>\n"
        f"{TAGLINE}\n\n"
        "молодёжный маркет нижнего белья.\n"
        "без кринжа, без бабушкиных принтов, без «sexy» в 2012.\n\n"
        "дроп: боксеры · брифы · бразильяна · mesh · паки\n"
        "доставка по рф · обмен 14 дней · трекинг в боте\n\n"
        "куда идём?"
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    context.user_data.setdefault("pick", {})
    if update.message:
        await update.message.reply_text(
            home_text(),
            parse_mode=ParseMode.HTML,
            reply_markup=main_kb(uid),
        )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "/start — витрина\n/catalog — весь дроп\n/cart — корзина\n/help — это сообщение"
    )


async def catalog_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    await update.message.reply_text(
        "<b>весь дроп</b>\nвыбирай пару.",
        parse_mode=ParseMode.HTML,
        reply_markup=catalog_kb("all", uid),
    )


async def cart_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        render_cart(update.effective_user.id),
        parse_mode=ParseMode.HTML,
        reply_markup=cart_kb(update.effective_user.id),
    )


def render_cart(uid: int) -> str:
    items = cart_of(uid)
    if not items:
        return "корзина пустая.\nзайди в каталог — первая пара ждёт."
    lines = ["<b>корзина</b>\n"]
    for item in items:
        p = get_product(item["id"])
        if not p:
            continue
        lines.append(
            f"{p['emoji']} {p['name']}  {item['color']} / {item['size']}  ×{item['qty']}\n"
            f"   {format_price(p['price'] * item['qty'])}"
        )
    lines.append(f"\n<b>итого {format_price(cart_total(uid))}</b>")
    return "\n".join(lines)


async def on_cb(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    q = update.callback_query
    await q.answer()
    uid = q.from_user.id
    data = q.data or ""
    pick = context.user_data.setdefault("pick", {})

    if data == "home":
        await q.edit_message_text(home_text(), parse_mode=ParseMode.HTML, reply_markup=main_kb(uid))
        return

    if data == "about":
        await q.edit_message_text(
            f"<b>{BRAND}</b> — бельё как базовая вещь гардероба, не как стыд.\n\n"
            "шьём малыми партиями. ткани — модал, бамбук, органик.\n"
            "дизайн — минимум графики, максимум посадки.\n\n"
            "доставка 2–5 дней по городам-миллионникам, сдэк по всей стране.\n"
            "оплата картой / сбп при получении или в боте.\n\n"
            "вопросы — пиши сюда обычным сообщением, живой саппорт.",
            parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("← меню", callback_data="home")]]
            ),
        )
        return

    if data.startswith("cat:"):
        cat = data.split(":", 1)[1]
        title = CATEGORIES.get(cat, cat)
        await q.edit_message_text(
            f"<b>{title}</b>\n{len(by_category(cat))} моделей в дропе.",
            parse_mode=ParseMode.HTML,
            reply_markup=catalog_kb(cat, uid),
        )
        return

    if data.startswith("p:"):
        pid = data.split(":", 1)[1]
        p = get_product(pid)
        if not p:
            await q.answer("нет в наличии", show_alert=True)
            return
        pick["id"] = pid
        pick.setdefault("size", p["sizes"][0])
        pick.setdefault("color", p["colors"][0])
        if pick.get("id") != pid:
            pick["size"] = p["sizes"][0]
            pick["color"] = p["colors"][0]
        await q.edit_message_text(
            product_text(p, pick if pick.get("id") == pid else None),
            parse_mode=ParseMode.HTML,
            reply_markup=product_kb(p),
        )
        return

    if data.startswith("sz:"):
        _, pid, size = data.split(":", 2)
        pick["id"] = pid
        pick["size"] = size
        p = get_product(pid)
        await q.edit_message_text(
            product_text(p, pick), parse_mode=ParseMode.HTML, reply_markup=product_kb(p)
        )
        return

    if data.startswith("cl:"):
        _, pid, color = data.split(":", 2)
        pick["id"] = pid
        pick["color"] = color
        p = get_product(pid)
        await q.edit_message_text(
            product_text(p, pick), parse_mode=ParseMode.HTML, reply_markup=product_kb(p)
        )
        return

    if data.startswith("add:"):
        pid = data.split(":", 1)[1]
        p = get_product(pid)
        size = pick.get("size") if pick.get("id") == pid else p["sizes"][0]
        color = pick.get("color") if pick.get("id") == pid else p["colors"][0]
        found = False
        for item in cart_of(uid):
            if item["id"] == pid and item["size"] == size and item["color"] == color:
                item["qty"] += 1
                found = True
                break
        if not found:
            cart_of(uid).append({"id": pid, "size": size, "color": color, "qty": 1})
        await q.answer(f"{p['name']} {size}/{color} в корзине")
        await q.edit_message_text(
            render_cart(uid), parse_mode=ParseMode.HTML, reply_markup=cart_kb(uid)
        )
        return

    if data == "cart":
        await q.edit_message_text(
            render_cart(uid), parse_mode=ParseMode.HTML, reply_markup=cart_kb(uid)
        )
        return

    if data.startswith("qty:"):
        _, idx, delta = data.split(":")
        idx, delta = int(idx), int(delta)
        items = cart_of(uid)
        if 0 <= idx < len(items):
            items[idx]["qty"] += delta
            if items[idx]["qty"] <= 0:
                items.pop(idx)
        await q.edit_message_text(
            render_cart(uid), parse_mode=ParseMode.HTML, reply_markup=cart_kb(uid)
        )
        return

    if data.startswith("rm:"):
        idx = int(data.split(":")[1])
        items = cart_of(uid)
        if 0 <= idx < len(items):
            items.pop(idx)
        await q.edit_message_text(
            render_cart(uid), parse_mode=ParseMode.HTML, reply_markup=cart_kb(uid)
        )
        return

    if data == "clear":
        Carts[uid] = []
        await q.edit_message_text(
            render_cart(uid), parse_mode=ParseMode.HTML, reply_markup=cart_kb(uid)
        )
        return

    if data == "checkout":
        if not cart_of(uid):
            await q.answer("корзина пустая", show_alert=True)
            return
        context.user_data["awaiting"] = "name"
        await q.edit_message_text(
            f"оформление · {format_price(cart_total(uid))}\n\n"
            "как к тебе обращаться? напиши имя следующим сообщением.",
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("отмена", callback_data="cart")]]
            ),
        )
        return

    if data == "noop":
        return


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    step = context.user_data.get("awaiting")
    text = (update.message.text or "").strip()

    if step == "name":
        context.user_data["order_name"] = text
        context.user_data["awaiting"] = "phone"
        await update.message.reply_text("телефон для курьера / сдэк (можно +7…)")
        return

    if step == "phone":
        context.user_data["order_phone"] = text
        context.user_data["awaiting"] = "address"
        await update.message.reply_text("город и адрес или пвз сдэк.")
        return

    if step == "address":
        context.user_data["order_addr"] = text
        context.user_data["awaiting"] = None
        order_id = f"UNDR-{uid % 10000:04d}-{cart_count(uid):02d}"
        summary = (
            f"<b>заказ {order_id} принят</b>\n\n"
            f"{render_cart(uid)}\n\n"
            f"{context.user_data.get('order_name')}\n"
            f"{context.user_data.get('order_phone')}\n"
            f"{context.user_data.get('order_addr')}\n\n"
            "напишем в течение часа с треком и слотом.\n"
            "оплата при получении или сбп — как удобнее."
        )
        admin = os.getenv("ADMIN_CHAT_ID")
        if admin:
            try:
                await context.bot.send_message(int(admin), summary, parse_mode=ParseMode.HTML)
            except Exception as exc:  # noqa: BLE001
                log.warning("admin notify failed: %s", exc)
        Carts[uid] = []
        await update.message.reply_text(
            summary, parse_mode=ParseMode.HTML, reply_markup=main_kb(uid)
        )
        return

    await update.message.reply_text(
        "не распарсил. жми кнопки меню или /start",
        reply_markup=main_kb(uid),
    )


def _proxy() -> str | None:
    for key in ("TELEGRAM_PROXY", "HTTPS_PROXY", "HTTP_PROXY", "ALL_PROXY"):
        val = (os.getenv(key) or "").strip()
        if val:
            return val
    return None


def main() -> None:
    token = os.getenv("BOT_TOKEN")
    if not token or token == "your_telegram_bot_token_here":
        raise SystemExit(
            "Нет BOT_TOKEN. Создай бота у @BotFather, положи токен в .env"
        )

    proxy = _proxy()
    request = HTTPXRequest(
        connect_timeout=40.0,
        read_timeout=40.0,
        write_timeout=40.0,
        pool_timeout=40.0,
        proxy=proxy,
    )
    if proxy:
        log.info("прокси: %s", proxy.split("@")[-1])
    else:
        log.info("прокси нет — если Timed out, включи VPN или TELEGRAM_PROXY в .env")

    builder = Application.builder().token(token).request(request)
    get_updates = HTTPXRequest(
        connect_timeout=40.0,
        read_timeout=40.0,
        write_timeout=40.0,
        pool_timeout=40.0,
        proxy=proxy,
    )
    builder = builder.get_updates_request(get_updates)
    app = builder.build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("catalog", catalog_cmd))
    app.add_handler(CommandHandler("cart", cart_cmd))
    app.add_handler(CallbackQueryHandler(on_cb))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    log.info("UNDR bot polling…")
    try:
        app.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)
    except (TimedOut, NetworkError) as exc:
        raise SystemExit(
            "Telegram API недоступен (таймаут).\n"
            "Из РФ обычно нужен VPN на весь ПК или локальный прокси.\n"
            "В .env добавь, например:\n"
            "  TELEGRAM_PROXY=socks5://127.0.0.1:10808\n"
            "или http://127.0.0.1:7890  (порт смотри в Clash / v2rayN / Hiddify)\n"
            f"детали: {exc}"
        ) from exc


if __name__ == "__main__":
    main()
