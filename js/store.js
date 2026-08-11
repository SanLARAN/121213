const Store = (() => {
  const KEYS = {
    users: "aurum_users",
    session: "aurum_session",
    products: "aurum_products",
    orders: "aurum_orders",
    cart: "aurum_cart",
  };

  const SEED_PRODUCTS = [
    { id: "p1", title: "Часы Aurora", price: 18900, category: "Аксессуары", stock: 12, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80", desc: "Минималистичный циферблат и сапфировое стекло." },
    { id: "p2", title: "Наушники Nocturne", price: 12400, category: "Техника", stock: 20, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80", desc: "Мягкая посадка и глубокий бас." },
    { id: "p3", title: "Сумка Voyage", price: 15600, category: "Сумки", stock: 8, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80", desc: "Кожа растительного дубления, латунная фурнитура." },
    { id: "p4", title: "Кроссовки Sol", price: 9800, category: "Обувь", stock: 15, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80", desc: "Лёгкая подошва и дышащий верх." },
    { id: "p5", title: "Парфюм Ember", price: 7200, category: "Красота", stock: 25, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80", desc: "Тёплые древесные ноты и лёгкий цитрус." },
    { id: "p6", title: "Лампа Halo", price: 5400, category: "Дом", stock: 10, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80", desc: "Тёплый свет для вечернего стола." },
  ];

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function seed() {
    if (!localStorage.getItem(KEYS.products)) write(KEYS.products, SEED_PRODUCTS);
    const users = read(KEYS.users, []);
    if (!users.find((u) => u.role === "admin")) {
      users.push({
        id: "admin",
        name: "Администратор",
        email: "admin@aurum.shop",
        password: "admin123",
        role: "admin",
        createdAt: Date.now(),
      });
      write(KEYS.users, users);
    }
    if (!localStorage.getItem(KEYS.orders)) write(KEYS.orders, []);
    if (!localStorage.getItem(KEYS.cart)) write(KEYS.cart, []);
  }

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  const api = {
    seed,
    products() { return read(KEYS.products, []); },
    saveProducts(list) { write(KEYS.products, list); },
    product(id) { return api.products().find((p) => p.id === id); },
    upsertProduct(p) {
      const list = api.products();
      if (!p.id) p.id = uid("p");
      const i = list.findIndex((x) => x.id === p.id);
      if (i >= 0) list[i] = { ...list[i], ...p };
      else list.unshift(p);
      api.saveProducts(list);
      return p;
    },
    deleteProduct(id) {
      api.saveProducts(api.products().filter((p) => p.id !== id));
    },
    users() { return read(KEYS.users, []); },
    session() { return read(KEYS.session, null); },
    currentUser() {
      const s = api.session();
      if (!s) return null;
      return api.users().find((u) => u.id === s.userId) || null;
    },
    register({ name, email, password }) {
      const users = api.users();
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("Такой email уже зарегистрирован");
      }
      const user = { id: uid("u"), name, email, password, role: "user", createdAt: Date.now() };
      users.push(user);
      write(KEYS.users, users);
      write(KEYS.session, { userId: user.id });
      return user;
    },
    login(email, password) {
      const user = api.users().find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!user) throw new Error("Неверный email или пароль");
      write(KEYS.session, { userId: user.id });
      return user;
    },
    logout() { localStorage.removeItem(KEYS.session); },
    cart() { return read(KEYS.cart, []); },
    setCart(items) { write(KEYS.cart, items); },
    addToCart(productId, qty = 1) {
      const items = api.cart();
      const found = items.find((i) => i.productId === productId);
      if (found) found.qty += qty;
      else items.push({ productId, qty });
      api.setCart(items);
    },
    orders() { return read(KEYS.orders, []); },
    placeOrder({ name, phone, address }) {
      const user = api.currentUser();
      if (!user) throw new Error("Войдите, чтобы оформить заказ");
      const cart = api.cart();
      if (!cart.length) throw new Error("Корзина пуста");
      const items = cart.map((c) => {
        const p = api.product(c.productId);
        return { ...c, title: p.title, price: p.price, image: p.image };
      });
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const order = {
        id: uid("o"),
        userId: user.id,
        name, phone, address,
        items, total,
        status: "новый",
        createdAt: Date.now(),
      };
      const orders = api.orders();
      orders.unshift(order);
      write(KEYS.orders, orders);
      api.setCart([]);
      const products = api.products();
      items.forEach((i) => {
        const p = products.find((x) => x.id === i.productId);
        if (p) p.stock = Math.max(0, p.stock - i.qty);
      });
      api.saveProducts(products);
      return order;
    },
    setOrderStatus(id, status) {
      const orders = api.orders();
      const o = orders.find((x) => x.id === id);
      if (o) o.status = status;
      write(KEYS.orders, orders);
    },
    money(n) {
      return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);
    },
  };

  seed();
  return api;
})();
