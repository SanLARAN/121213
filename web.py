"""Витрина UNDR — превью маркета (и демо без Telegram)."""

from __future__ import annotations

import os

from flask import Flask, jsonify, render_template_string, request

from catalog import BRAND, CATEGORIES, PRODUCTS, TAGLINE, by_category, format_price, get_product

app = Flask(__name__)

HTML = r"""
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>UNDR — твоя база</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0b0c;
      --fg: #f4efe6;
      --muted: #9a9488;
      --accent: #c8ff4d;
      --pink: #ff6b9a;
      --card: #151516;
      --line: #262626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: var(--bg); color: var(--fg); font-family: Manrope, system-ui, sans-serif; }
    a { color: inherit; text-decoration: none; }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 22px 6vw; border-bottom: 1px solid var(--line);
      position: sticky; top: 0; background: rgba(11,11,12,.86); backdrop-filter: blur(12px); z-index: 5;
    }
    .logo { font-family: Syne, sans-serif; font-weight: 800; letter-spacing: .18em; font-size: 20px; }
    .logo span { color: var(--accent); }
    nav { display: flex; gap: 18px; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
    nav a.active, nav a:hover { color: var(--fg); }
    .hero { padding: 10vh 6vw 8vh; display: grid; grid-template-columns: 1.2fr .8fr; gap: 48px; align-items: end; }
    h1 { font-family: Syne, sans-serif; font-size: clamp(48px, 8vw, 96px); line-height: .88; letter-spacing: -.04em; }
    h1 em { font-style: normal; color: var(--accent); }
    .lead { color: var(--muted); max-width: 420px; font-size: 16px; line-height: 1.55; margin-top: 22px; }
    .badge { display: inline-block; border: 1px solid var(--line); padding: 6px 10px; border-radius: 999px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
    .grid { padding: 0 6vw 12vh; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
    .card {
      background: var(--card); border: 1px solid var(--line); border-radius: 18px; overflow: hidden;
      display: flex; flex-direction: column; min-height: 340px;
    }
    .swatch {
      height: 180px; display: grid; place-items: center; font-size: 64px;
      background:
        radial-gradient(circle at 30% 20%, rgba(200,255,77,.18), transparent 40%),
        radial-gradient(circle at 80% 80%, rgba(255,107,154,.16), transparent 42%),
        #111;
    }
    .meta { padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .name { font-family: Syne, sans-serif; font-weight: 700; font-size: 18px; }
    .tag { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--pink); }
    .desc { color: var(--muted); font-size: 13px; line-height: 1.45; flex: 1; }
    .price { font-weight: 700; }
    .old { color: var(--muted); text-decoration: line-through; font-weight: 400; font-size: 13px; margin-left: 6px; }
    .buy {
      margin-top: 8px; width: 100%; border: 0; border-radius: 999px; padding: 10px 14px;
      background: var(--accent); color: #111; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .buy:hover { filter: brightness(1.05); }
    footer { padding: 28px 6vw 48px; color: var(--muted); font-size: 13px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .toast {
      position: fixed; bottom: 24px; right: 24px; background: var(--accent); color: #111;
      padding: 12px 16px; border-radius: 12px; font-weight: 700; display: none;
    }
    @media (max-width: 800px) {
      .hero { grid-template-columns: 1fr; padding-top: 7vh; }
      nav { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">UN<span>DR</span></div>
    <nav>
      <a href="/?cat=all" class="{{ 'active' if cat=='all' else '' }}">весь дроп</a>
      <a href="/?cat=men" class="{{ 'active' if cat=='men' else '' }}">для него</a>
      <a href="/?cat=women" class="{{ 'active' if cat=='women' else '' }}">для неё</a>
      <a href="/?cat=unisex" class="{{ 'active' if cat=='unisex' else '' }}">unisex</a>
      <a href="/?cat=limited" class="{{ 'active' if cat=='limited' else '' }}">limited</a>
    </nav>
  </header>
  <section class="hero">
    <div>
      <div class="badge">telegram shop · drop 08</div>
      <h1>бельё,<br>которое<br><em>не орёт</em></h1>
    </div>
    <p class="lead">{{ tagline }}. молодёжный маркет трусов: модал, сетка, паки. закажи в боте — доставка 2–5 дней.</p>
  </section>
  <section class="grid">
    {% for p in products %}
    <article class="card">
      <div class="swatch">{{ p.emoji }}</div>
      <div class="meta">
        <div class="row">
          <div class="name">{{ p.name }}</div>
          <div class="tag">{{ p.tag }}</div>
        </div>
        <div class="desc">{{ p.desc }}</div>
        <div>
          <span class="price">{{ p.price_fmt }}</span>
          {% if p.old_fmt %}<span class="old">{{ p.old_fmt }}</span>{% endif %}
        </div>
        <button class="buy" onclick="toast('{{ p.name }}')">в корзину бота</button>
      </div>
    </article>
    {% endfor %}
  </section>
  <footer>
    <div>UNDR © 2026 · {{ brand }}</div>
    <div>бот: положи BOT_TOKEN в .env и запусти <code>python bot.py</code></div>
  </footer>
  <div class="toast" id="t">добавлено в настроение</div>
  <script>
    function toast(name) {
      const el = document.getElementById('t');
      el.textContent = name + ' — бери в Telegram-боте';
      el.style.display = 'block';
      setTimeout(() => el.style.display = 'none', 1800);
    }
  </script>
</body>
</html>
"""


@app.get("/")
def index():
    cat = request.args.get("cat", "all")
    if cat not in CATEGORIES:
        cat = "all"
    products = []
    for p in by_category(cat):
        p["price_fmt"] = format_price(p["price"])
        p["old_fmt"] = format_price(p["old_price"]) if p.get("old_price") else None
        products.append(p)
    return render_template_string(
        HTML, products=products, cat=cat, brand=BRAND, tagline=TAGLINE
    )


@app.get("/api/products")
def api():
    return jsonify(PRODUCTS)


def main():
    port = int(os.getenv("PORT", "8080"))
    host = os.getenv("HOST", "0.0.0.0")
    app.run(host=host, port=port, debug=False)


if __name__ == "__main__":
    main()
