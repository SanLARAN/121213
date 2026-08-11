"""Каталог UNDR — стильный молодёжный маркет трусов."""

from copy import deepcopy

BRAND = "UNDR"
TAGLINE = "твоя база. без лишнего."
CURRENCY = "₽"

CATEGORIES = {
    "all": "весь дроп",
    "men": "для него",
    "women": "для неё",
    "unisex": "unisex",
    "limited": "limited",
}

PRODUCTS = [
    {
        "id": "u01",
        "name": "VOID black",
        "price": 1490,
        "old_price": 1890,
        "cats": ["men", "unisex"],
        "emoji": "⬛",
        "tag": "хит",
        "desc": "Классические боксеры из микромодала. Чёрный как ночь, посадка mid, резинка 4 см без лого-крика.",
        "fabric": "микромодал 92% / эластан 8%",
        "colors": ["void", "graphite"],
        "sizes": ["S", "M", "L", "XL"],
    },
    {
        "id": "u02",
        "name": "NEON lime",
        "price": 1690,
        "old_price": None,
        "cats": ["unisex", "limited"],
        "emoji": "🟩",
        "tag": "new",
        "desc": "Лаймовый slimer. Хочешь, чтобы бельё было громче аутфита — вот оно.",
        "fabric": "бамбук 70% / хлопок 25% / эластан 5%",
        "colors": ["lime", "acid"],
        "sizes": ["XS", "S", "M", "L"],
    },
    {
        "id": "u03",
        "name": "SOFT blush",
        "price": 1590,
        "old_price": 1790,
        "cats": ["women"],
        "emoji": "🩷",
        "tag": "soft",
        "desc": "Бесшовные бразильяна blush. Почти вторая кожа, без меток на теле.",
        "fabric": "нейлон 80% / эластан 20%",
        "colors": ["blush", "nude", "cherry"],
        "sizes": ["XS", "S", "M", "L"],
    },
    {
        "id": "u04",
        "name": "GRID mesh",
        "price": 1890,
        "old_price": None,
        "cats": ["men", "limited"],
        "emoji": "🕸️",
        "tag": "club",
        "desc": "Сетка + плотная резинка. Для тех, кто не прячет, а показывает.",
        "fabric": "полиамид 88% / эластан 12%",
        "colors": ["black mesh", "wine"],
        "sizes": ["S", "M", "L"],
    },
    {
        "id": "u05",
        "name": "CLOUD cotton",
        "price": 1290,
        "old_price": None,
        "cats": ["unisex"],
        "emoji": "☁️",
        "tag": "daily",
        "desc": "Органический хлопок, свободный крой. На весь день — и ещё на ночь.",
        "fabric": "органик хлопок 95% / эластан 5%",
        "colors": ["cloud", "sand", "ink"],
        "sizes": ["S", "M", "L", "XL"],
    },
    {
        "id": "u06",
        "name": "CHERRY brief",
        "price": 1390,
        "old_price": 1590,
        "cats": ["women"],
        "emoji": "🍒",
        "tag": "sale",
        "desc": "Классические брифы вишня. Высокая посадка, аккуратный вырез.",
        "fabric": "хлопок 90% / эластан 10%",
        "colors": ["cherry", "black"],
        "sizes": ["XS", "S", "M", "L", "XL"],
    },
    {
        "id": "u07",
        "name": "ICE brief",
        "price": 1490,
        "old_price": None,
        "cats": ["men"],
        "emoji": "🧊",
        "tag": "cool",
        "desc": "Слипы ice-blue. Тонкая ткань, быстрая сушка, спорт и город.",
        "fabric": "полиэстер 78% / эластан 22%",
        "colors": ["ice", "navy"],
        "sizes": ["S", "M", "L", "XL"],
    },
    {
        "id": "u08",
        "name": "MOON thong",
        "price": 1190,
        "old_price": None,
        "cats": ["women", "limited"],
        "emoji": "🌙",
        "tag": "night",
        "desc": "Тонг moon. Минимум ткани, максимум настроения.",
        "fabric": "микрофибра 85% / эластан 15%",
        "colors": ["moon", "black"],
        "sizes": ["XS", "S", "M"],
    },
    {
        "id": "u09",
        "name": "PACK 3× VOID",
        "price": 3990,
        "old_price": 4470,
        "cats": ["men", "unisex"],
        "emoji": "📦",
        "tag": "pack",
        "desc": "Три пары VOID. Один цвет, ноль решений по утрам.",
        "fabric": "микромодал 92% / эластан 8%",
        "colors": ["void"],
        "sizes": ["S", "M", "L", "XL"],
    },
]


def get_product(pid: str):
    for p in PRODUCTS:
        if p["id"] == pid:
            return deepcopy(p)
    return None


def by_category(cat: str):
    if cat == "all":
        return [deepcopy(p) for p in PRODUCTS]
    return [deepcopy(p) for p in PRODUCTS if cat in p["cats"]]


def format_price(n: int) -> str:
    return f"{n:,}".replace(",", " ") + f" {CURRENCY}"
