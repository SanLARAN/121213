const app = document.getElementById("app");
const toastEl = document.getElementById("toast");

function toast(msg) {
  toastEl.hidden = false;
  toastEl.textContent = msg;
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => (toastEl.hidden = true), 2400);
}

function updateChrome() {
  const count = Store.cart().reduce((s, i) => s + i.qty, 0);
  document.getElementById("cartCount").textContent = count;
  const user = Store.currentUser();
  document.getElementById("accountLink").textContent = user ? user.name : "Войти";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function productCard(p) {
  return `<article class="card">
    <a href="#/product/${p.id}"><img src="${esc(p.image)}" alt="${esc(p.title)}" /></a>
    <div class="card-body">
      <div class="tag">${esc(p.category)}</div>
      <h3><a href="#/product/${p.id}">${esc(p.title)}</a></h3>
      <div class="row" style="justify-content:space-between;align-items:center">
        <span class="price">${Store.money(p.price)}</span>
        <button class="btn btn-gold" data-add="${p.id}">В корзину</button>
      </div>
    </div>
  </article>`;
}

function viewHome(filter = "") {
  let products = Store.products();
  const q = filter.trim().toLowerCase();
  if (q) products = products.filter((p) => (p.title + p.category + p.desc).toLowerCase().includes(q));
  app.innerHTML = `
    <section class="hero">
      <div>
        <p class="tag">Сезон 2026</p>
        <h1>Вещи, которые остаются с вами.</h1>
        <p>AURUM — витрина избранных предметов: техника, аксессуары и дом. Регистрация, корзина и админка работают прямо в браузере.</p>
        <div class="row" style="margin-top:18px">
          <a class="btn btn-gold" href="#/catalog">Смотреть каталог</a>
          <a class="btn" href="#/account">Личный кабинет</a>
        </div>
      </div>
      <div class="hero-visual"></div>
    </section>
    <div class="section-head"><h2>${q ? "Результаты" : "Витрина"}</h2><span class="muted">${products.length} позиций</span></div>
    <div class="grid">${products.map(productCard).join("") || "<p class='muted'>Ничего не найдено</p>"}</div>
  `;
}

function viewProduct(id) {
  const p = Store.product(id);
  if (!p) { app.innerHTML = "<p>Товар не найден</p>"; return; }
  app.innerHTML = `
    <section class="product-page">
      <img src="${esc(p.image)}" alt="${esc(p.title)}" />
      <div>
        <div class="tag">${esc(p.category)}</div>
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:48px;margin:8px 0">${esc(p.title)}</h1>
        <p class="price" style="font-size:24px">${Store.money(p.price)}</p>
        <p class="muted">${esc(p.desc)}</p>
        <p>В наличии: ${p.stock}</p>
        <button class="btn btn-gold" data-add="${p.id}">Добавить в корзину</button>
      </div>
    </section>
  `;
}

function viewCart() {
  const items = Store.cart().map((c) => ({ ...c, p: Store.product(c.productId) })).filter((x) => x.p);
  const total = items.reduce((s, i) => s + i.p.price * i.qty, 0);
  const user = Store.currentUser();
  app.innerHTML = `
    <h1>Корзина</h1>
    ${items.length ? `
      <div class="layout">
        <div class="panel">
          <table class="table">
            <thead><tr><th>Товар</th><th>Кол-во</th><th>Сумма</th><th></th></tr></thead>
            <tbody>
              ${items.map((i) => `<tr>
                <td>${esc(i.p.title)}</td>
                <td class="qty">
                  <button class="icon-btn" data-qty="${i.productId}" data-d="-1">−</button>
                  ${i.qty}
                  <button class="icon-btn" data-qty="${i.productId}" data-d="1">+</button>
                </td>
                <td>${Store.money(i.p.price * i.qty)}</td>
                <td><button class="btn btn-ghost" data-remove="${i.productId}">Удалить</button></td>
              </tr>`).join("")}
            </tbody>
          </table>
          <p><strong>Итого: ${Store.money(total)}</strong></p>
        </div>
        <form class="panel form" id="checkoutForm">
          <h3>Оформление</h3>
          ${user ? "" : "<p class='muted'>Сначала <a href='#/account'>войдите</a> в аккаунт.</p>"}
          <label>Имя</label><input name="name" required value="${esc(user?.name || "")}" />
          <label>Телефон</label><input name="phone" required placeholder="+7…" />
          <label>Адрес</label><textarea name="address" required rows="3"></textarea>
          <button class="btn btn-gold" ${user ? "" : "disabled"}>Подтвердить заказ</button>
        </form>
      </div>` : "<p class='muted'>Корзина пуста. <a href='#/catalog'>В каталог</a></p>"}
  `;
  const form = document.getElementById("checkoutForm");
  if (form) form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const order = Store.placeOrder({ name: fd.get("name"), phone: fd.get("phone"), address: fd.get("address") });
      toast("Заказ " + order.id + " оформлен");
      location.hash = "#/account";
    } catch (err) { toast(err.message); }
  };
}

function viewAccount() {
  const user = Store.currentUser();
  if (!user) {
    app.innerHTML = `
      <div class="layout">
        <form class="panel form" id="loginForm">
          <h2>Вход</h2>
          <label>Email</label><input name="email" type="email" required />
          <label>Пароль</label><input name="password" type="password" required />
          <button class="btn btn-gold">Войти</button>
          <p class="muted">Админ: admin@aurum.shop / admin123</p>
        </form>
        <form class="panel form" id="regForm">
          <h2>Регистрация</h2>
          <label>Имя</label><input name="name" required />
          <label>Email</label><input name="email" type="email" required />
          <label>Пароль</label><input name="password" type="password" required minlength="4" />
          <button class="btn">Создать аккаунт</button>
        </form>
      </div>`;
    document.getElementById("loginForm").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try { Store.login(fd.get("email"), fd.get("password")); toast("Добро пожаловать"); route(); }
      catch (err) { toast(err.message); }
    };
    document.getElementById("regForm").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try { Store.register({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password") }); toast("Аккаунт создан"); route(); }
      catch (err) { toast(err.message); }
    };
    return;
  }
  const orders = Store.orders().filter((o) => o.userId === user.id);
  app.innerHTML = `
    <div class="section-head">
      <h1>Привет, ${esc(user.name)}</h1>
      <div class="row">
        ${user.role === "admin" ? '<a class="btn btn-gold" href="#/admin">Админка</a>' : ""}
        <button class="btn" id="logoutBtn">Выйти</button>
      </div>
    </div>
    <p class="muted">${esc(user.email)} · роль: ${user.role}</p>
    <h2>Мои заказы</h2>
    ${orders.length ? `<table class="table"><thead><tr><th>ID</th><th>Сумма</th><th>Статус</th><th>Состав</th></tr></thead><tbody>
      ${orders.map((o) => `<tr>
        <td>${o.id}</td><td>${Store.money(o.total)}</td><td>${esc(o.status)}</td>
        <td>${o.items.map((i) => esc(i.title) + " ×" + i.qty).join(", ")}</td>
      </tr>`).join("")}
    </tbody></table>` : "<p class='muted'>Пока нет заказов</p>"}
  `;
  document.getElementById("logoutBtn").onclick = () => { Store.logout(); toast("Вы вышли"); route(); };
}

function viewAbout() {
  app.innerHTML = `
    <h1>О магазине</h1>
    <p class="muted">AURUM — демонстрационный магазин для GitHub Pages. Аккаунты, корзина и заказы хранятся в вашем браузере (localStorage). Админ может менять витрину и статусы заказов.</p>
  `;
}

function viewAdmin() {
  const user = Store.currentUser();
  if (!user || user.role !== "admin") {
    app.innerHTML = `<div class="panel"><h2>Только для администратора</h2><p>Войдите как admin@aurum.shop / admin123</p><a class="btn btn-gold" href="#/account">Ко входу</a></div>`;
    return;
  }
  const products = Store.products();
  const orders = Store.orders();
  const users = Store.users();
  app.innerHTML = `
    <h1>Админка</h1>
    <div class="layout">
      <div>
        <div class="panel">
          <h3>Товары</h3>
          <table class="table">
            <thead><tr><th>Название</th><th>Цена</th><th>Склад</th><th></th></tr></thead>
            <tbody>
              ${products.map((p) => `<tr>
                <td>${esc(p.title)}</td><td>${Store.money(p.price)}</td><td>${p.stock}</td>
                <td><button class="btn btn-ghost" data-edit="${p.id}">Изменить</button>
                    <button class="btn btn-danger" data-del="${p.id}">Удалить</button></td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="panel" style="margin-top:16px">
          <h3>Заказы (${orders.length})</h3>
          <table class="table">
            <thead><tr><th>ID</th><th>Клиент</th><th>Сумма</th><th>Статус</th></tr></thead>
            <tbody>
              ${orders.map((o) => `<tr>
                <td>${o.id}<br><span class="muted">${esc(o.address)}</span></td>
                <td>${esc(o.name)}<br><span class="muted">${esc(o.phone)}</span></td>
                <td>${Store.money(o.total)}</td>
                <td>
                  <select data-status="${o.id}">
                    ${["новый","в сборке","отправлен","доставлен","отменён"].map((s) => `<option ${s===o.status?"selected":""}>${s}</option>`).join("")}
                  </select>
                </td>
              </tr>`).join("") || "<tr><td colspan='4'>Заказов нет</td></tr>"}
            </tbody>
          </table>
        </div>
        <div class="panel" style="margin-top:16px">
          <h3>Пользователи (${users.length})</h3>
          <ul>${users.map((u) => `<li>${esc(u.name)} — ${esc(u.email)} (${u.role})</li>`).join("")}</ul>
        </div>
      </div>
      <form class="panel form" id="prodForm">
        <h3 id="formTitle">Новый товар</h3>
        <input type="hidden" name="id" />
        <label>Название</label><input name="title" required />
        <label>Цена, ₽</label><input name="price" type="number" min="0" required />
        <label>Категория</label><input name="category" required />
        <label>Склад</label><input name="stock" type="number" min="0" required />
        <label>Картинка (URL)</label><input name="image" required placeholder="https://…" />
        <label>Описание</label><textarea name="desc" rows="4"></textarea>
        <button class="btn btn-gold">Сохранить</button>
        <button type="button" class="btn" id="resetForm">Сбросить</button>
      </form>
    </div>
  `;
  const form = document.getElementById("prodForm");
  const fill = (p) => {
    form.id.value = p?.id || "";
    form.title.value = p?.title || "";
    form.price.value = p?.price || "";
    form.category.value = p?.category || "";
    form.stock.value = p?.stock ?? 1;
    form.image.value = p?.image || "";
    form.desc.value = p?.desc || "";
    document.getElementById("formTitle").textContent = p ? "Редактирование" : "Новый товар";
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    Store.upsertProduct({
      id: form.id.value || undefined,
      title: form.title.value,
      price: Number(form.price.value),
      category: form.category.value,
      stock: Number(form.stock.value),
      image: form.image.value,
      desc: form.desc.value,
    });
    toast("Товар сохранён");
    viewAdmin();
  };
  document.getElementById("resetForm").onclick = () => fill(null);
  app.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => fill(Store.product(b.dataset.edit)));
  app.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
    if (confirm("Удалить товар?")) { Store.deleteProduct(b.dataset.del); viewAdmin(); }
  });
  app.querySelectorAll("[data-status]").forEach((s) => s.onchange = () => {
    Store.setOrderStatus(s.dataset.status, s.value);
    toast("Статус обновлён");
  });
}

function route() {
  updateChrome();
  const hash = location.hash || "#/";
  const [, path, id] = hash.replace(/^#/, "").split("/");
  if (!path) return viewHome(document.getElementById("searchInput")?.value || "");
  if (path === "catalog") return viewHome(document.getElementById("searchInput")?.value || "");
  if (path === "product") return viewProduct(id);
  if (path === "cart") return viewCart();
  if (path === "account") return viewAccount();
  if (path === "about") return viewAbout();
  if (path === "admin") return viewAdmin();
  viewHome();
}

document.body.addEventListener("click", (e) => {
  const add = e.target.closest("[data-add]");
  if (add) {
    Store.addToCart(add.dataset.add, 1);
    updateChrome();
    toast("Добавлено в корзину");
  }
  const rm = e.target.closest("[data-remove]");
  if (rm) {
    Store.setCart(Store.cart().filter((i) => i.productId !== rm.dataset.remove));
    viewCart(); updateChrome();
  }
  const q = e.target.closest("[data-qty]");
  if (q) {
    const d = Number(q.dataset.d);
    const cart = Store.cart();
    const item = cart.find((i) => i.productId === q.dataset.qty);
    if (item) item.qty = Math.max(1, item.qty + d);
    Store.setCart(cart);
    viewCart(); updateChrome();
  }
});

document.getElementById("searchToggle").onclick = () => {
  const bar = document.getElementById("searchBar");
  bar.hidden = !bar.hidden;
  if (!bar.hidden) document.getElementById("searchInput").focus();
};
document.getElementById("searchInput").addEventListener("input", () => {
  const hash = location.hash || "#/";
  if (hash === "#/" || hash === "#/catalog") viewHome(document.getElementById("searchInput").value);
});
document.querySelector("[data-open=nav]").onclick = () => document.getElementById("nav").classList.toggle("open");
window.addEventListener("hashchange", route);
route();
