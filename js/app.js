(function () {
  const DATA = window.CANTEEN_DATA;
  const app = document.getElementById("app");
  const FAV_KEY = "shiguang.favorites";
  const MEAL_KEY = "shiguang.meal";
  const REVIEW_KEY = "shiguang.reviews";
  const EAT_KEY = "shiguang.eaten";
  const MEALS = ["auto", "breakfast", "lunch", "tea", "dinner", "late"];
  const TASTE = { mild: "清淡", medium: "微辣", hot: "重口" };
  const VIEWS = {
    today: "今天吃什么",
    explore: "找菜",
    windows: "窗口口碑",
    saved: "我的"
  };

  const state = {
    view: "today",
    query: "",
    canteenId: "all",
    taste: "all",
    budget: "all",
    onlyNew: false,
    hideRisky: true,
    sort: "rating",
    windowSort: "rating",
    meal: "auto",
    pickIndex: 0,
    panel: null,
    draftScore: 0,
    draftText: "",
    draftError: ""
  };

  let reviews = {};
  let eaten = [];

  let restoreSearch = false;
  let composing = false;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function loadFavs() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return new Set(Array.isArray(raw) ? raw : []);
    } catch (err) {
      return new Set();
    }
  }

  function loadMeal() {
    try {
      const raw = localStorage.getItem(MEAL_KEY);
      if (MEALS.indexOf(raw) !== -1) return raw;
    } catch (err) {
      /* 读不到时跟当前时间走。 */
    }
    return "auto";
  }

  const favorites = loadFavs();
  state.meal = loadMeal();

  function saveFavs() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favorites)));
    } catch (err) {
      /* 隐私模式等场景下忽略写入失败，页面仍可浏览。 */
    }
  }

  function saveMeal() {
    try {
      localStorage.setItem(MEAL_KEY, state.meal);
    } catch (err) {
      /* 写不进去就只在本次浏览里生效。 */
    }
  }

  function byId(list, id) {
    return list.find(function (item) { return item.id === id; });
  }

  function windowById(id) { return byId(DATA.windows, id); }
  function canteenById(id) { return byId(DATA.canteens, id); }
  function dishById(id) { return byId(DATA.dishes, id); }

  function loadReviews() {
    const out = {};
    try {
      const raw = JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}");
      if (!raw || typeof raw !== "object") return out;
      Object.keys(raw).forEach(function (id) {
        const item = raw[id];
        const score = Math.round(Number(item && item.score));
        const text = String(item && item.text || "").trim().slice(0, 60);
        if (!dishById(id) || score < 1 || score > 5 || text.length < 2) return;
        out[id] = { score: score, text: text, at: Number(item.at) || Date.now() };
      });
    } catch (err) {
      /* 读坏了就当还没写过评价。 */
    }
    return out;
  }

  function saveReviews() {
    try {
      localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
    } catch (err) {
      /* 写不进去就只留在这次浏览里。 */
    }
  }

  function userReview(id) {
    return reviews[id] || null;
  }

  function whenLabel(at) {
    const diff = Date.now() - Number(at || 0);
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    const day = new Date(at);
    const now = new Date();
    if (day.toDateString() === now.toDateString()) return "今天";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (day.toDateString() === yesterday.toDateString()) return "昨天";
    return (day.getMonth() + 1) + "月" + day.getDate() + "日";
  }

  function beginDraft(id) {
    const mine = userReview(id);
    state.draftScore = mine ? mine.score : 0;
    state.draftText = mine ? mine.text : "";
    state.draftError = "";
  }

  function loadEaten() {
    const out = [];
    try {
      const raw = JSON.parse(localStorage.getItem(EAT_KEY) || "[]");
      if (!Array.isArray(raw)) return out;
      raw.forEach(function (item) {
        const id = item && item.id;
        const at = Number(item && item.at);
        const meal = item && item.meal;
        if (!dishById(id) || !at) return;
        out.push({
          id: id,
          at: at,
          meal: ["breakfast", "lunch", "tea", "dinner", "late"].indexOf(meal) === -1 ? "lunch" : meal
        });
      });
    } catch (err) {
      /* 读坏了就当还没记过这顿。 */
    }
    return out.slice(0, 40);
  }

  function saveEaten() {
    try {
      localStorage.setItem(EAT_KEY, JSON.stringify(eaten));
    } catch (err) {
      /* 写不进去就只留在这次浏览里。 */
    }
  }

  function eatenRecent(id) {
    const hit = eaten.find(function (item) { return item.id === id; });
    return Boolean(hit && Date.now() - hit.at < 48 * 60 * 60 * 1000);
  }

  function markEaten(id) {
    if (!dishById(id)) return;
    eaten = eaten.filter(function (item) { return item.id !== id; });
    eaten.unshift({ id: id, at: Date.now(), meal: activeMeal() });
    eaten = eaten.slice(0, 40);
    saveEaten();
  }

  reviews = loadReviews();
  eaten = loadEaten();

  function mealNow() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return "breakfast";
    if (hour >= 9 && hour < 14) return "lunch";
    if (hour >= 14 && hour < 17) return "tea";
    if (hour >= 17 && hour < 21) return "dinner";
    return "late";
  }

  function mealMeta(meal) {
    const map = {
      breakfast: ["早餐", "赶早课，先吃热的。"],
      lunch: ["午餐", "课间时间紧，优先少排队的高分窗口。"],
      tea: ["下午", "垫一口就好，不用吃成正餐。"],
      dinner: ["晚餐", "晚上适合吃热乎、评价稳的。"],
      late: ["夜宵", "还开着的窗口不多，差评档口先跳过。"]
    };
    return { label: map[meal][0], hint: map[meal][1] };
  }

  function activeMeal() {
    return state.meal === "auto" ? mealNow() : state.meal;
  }

  function waitMinutes(stall) {
    const match = String(stall.wait).match(/(\d+)/);
    return match ? Number(match[1]) : 10;
  }

  function waitWeight(meal) {
    if (meal === "lunch") return 0.55;
    if (meal === "breakfast") return 0.35;
    if (meal === "dinner") return 0.22;
    return 0.18;
  }

  function dishScore(dish, meal) {
    const stall = windowById(dish.windowId);
    const familiarity = Math.min(dish.reviewCount, 400) / 80;
    let score = dish.rating * 10 + familiarity - waitMinutes(stall) * waitWeight(meal);
    const mine = userReview(dish.id);
    if (mine && mine.score >= 4) score += 6;
    else if (mine && mine.score === 3) score += 1;
    return score;
  }

  function median(nums) {
    if (!nums.length) return 0;
    const copy = nums.slice().sort(function (a, b) { return a - b; });
    const mid = Math.floor(copy.length / 2);
    return copy.length % 2 ? copy[mid] : (copy[mid - 1] + copy[mid]) / 2;
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 5) return "还没睡";
    if (hour < 11) return "早上好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  }

  function clock() {
    return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }

  function isRisky(dish) {
    const stall = windowById(dish.windowId);
    return Boolean(stall && stall.warning) || dish.rating < 3.2;
  }

  function place(dish) {
    const stall = windowById(dish.windowId);
    const canteen = canteenById(stall.canteenId);
    return { stall: stall, canteen: canteen };
  }

  function matchesCanteen(dish) {
    if (state.canteenId === "all") return true;
    return place(dish).stall.canteenId === state.canteenId;
  }

  function matchesTasteBudget(dish) {
    if (state.taste !== "all" && dish.taste !== state.taste) return false;
    if (state.budget !== "all" && dish.price > Number(state.budget)) return false;
    return true;
  }

  function todayList() {
    const meal = activeMeal();
    return DATA.dishes.filter(function (dish) {
      const mine = userReview(dish.id);
      if (mine && mine.score <= 2) return false;
      if (eatenRecent(dish.id)) return false;
      return dish.meals.indexOf(meal) !== -1 && matchesCanteen(dish) && matchesTasteBudget(dish) && !isRisky(dish);
    }).sort(function (a, b) {
      return dishScore(b, meal) - dishScore(a, meal);
    });
  }

  function reasonsFor(dish, list) {
    const where = place(dish);
    const wait = waitMinutes(where.stall);
    const typical = median(list.map(function (item) { return waitMinutes(place(item).stall); }));
    let queue = "大约排 " + where.stall.wait;
    if (list.length > 1 && wait < typical) queue += "，比这一餐多数窗口快";
    else if (list.length > 1 && wait > typical) queue += "，队比中位更长，但分数和口味更合适";
    else if (list.length > 1) queue += "，和这一餐的中位排队一样";
    const bits = [];
    if (dish.isNew) bits.push("新品");
    bits.push(TASTE[dish.taste], "¥" + dish.price, dish.reviewCount + " 人评过");
    return [
      where.stall.name + " " + where.stall.rating.toFixed(1) + " 分，近期没有集中差评",
      queue,
      bits.join(" · ")
    ];
  }

  function pickToday() {
    const list = todayList();
    if (!list.length) return { primary: null, alts: [], total: 0 };
    const primary = list[state.pickIndex % list.length];
    const rest = list.filter(function (dish) { return dish.id !== primary.id; });
    const alts = [];
    const used = new Set([place(primary).canteen.id]);
    rest.forEach(function (dish) {
      if (alts.length >= 2) return;
      const canteenId = place(dish).canteen.id;
      if (used.has(canteenId)) return;
      used.add(canteenId);
      alts.push(dish);
    });
    rest.forEach(function (dish) {
      if (alts.length >= 2) return;
      if (alts.indexOf(dish) === -1) alts.push(dish);
    });
    return { primary: primary, alts: alts, total: list.length };
  }

  function exploreList() {
    const q = state.query.trim().toLowerCase();
    const list = DATA.dishes.filter(function (dish) {
      const where = place(dish);
      const hay = (dish.name + where.stall.name + where.canteen.name + dish.tags.join("")).toLowerCase();
      if (q && hay.indexOf(q) === -1) return false;
      if (!matchesCanteen(dish) || !matchesTasteBudget(dish)) return false;
      if (state.onlyNew && !dish.isNew) return false;
      if (state.hideRisky && isRisky(dish)) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (state.sort === "price") return a.price - b.price || b.rating - a.rating;
      if (state.sort === "wait") {
        return waitMinutes(windowById(a.windowId)) - waitMinutes(windowById(b.windowId)) || b.rating - a.rating;
      }
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    });
    return list;
  }

  function badge(dish) {
    const mine = userReview(dish.id);
    if (mine && mine.score <= 2) return { cls: "bad", text: "差评" };
    if (isRisky(dish)) return { cls: "bad", text: "踩雷" };
    if (dish.isNew) return { cls: "new", text: "新品" };
    if (dish.rating >= 4.5) return { cls: "safe", text: "稳" };
    return null;
  }

  function icon(name) {
    const paths = {
      star: '<path d="m12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.7 6.6 19.6l1-6.1L3.2 9.2l6.1-.9z"/>',
      pin: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.3"/>',
      clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.6l3 1.8"/>',
      search: '<circle cx="11" cy="11" r="6.2"/><path d="m16 16 4.2 4.2"/>',
      shop: '<path d="M4 10h16l-1.3 9H5.3z"/><path d="m3 10 2.4-6h13.2L21 10"/><path d="M9 14v5M15 14v5"/>',
      fire: '<path d="M12 3s.8 3.2-.2 5.2C10.6 9.6 9 10.2 9 12.2a3 3 0 0 0 6 0c0-2.2-1.2-3.4-1.2-5.4C13.8 5.2 14 3 12 3z"/>',
      leaf: '<path d="M12 21c-5.5-3.5-8-8.5-8-13a8 8 0 0 1 16 0c0 4.5-2.5 9.5-8 13z"/><path d="M12 20V9"/>',
      pepper: '<path d="M12 4c1 2 4 3 4 7a4 4 0 1 1-8 0c0-4 3-5 4-7z"/><path d="M12 4c2 1 3 0 4-1"/>',
      sun: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
      moon: '<path d="M16 3.5A8.2 8.2 0 1 0 20.5 16 6.5 6.5 0 0 1 16 3.5z"/>',
      cup: '<path d="M6 8h10v5a5 5 0 0 1-10 0z"/><path d="M16 9h2.2a2.3 2.3 0 0 1 0 4.6H16"/><path d="M8 20h8"/>',
      rice: '<path d="M5 10h14c0 6-3 10-7 10S5 16 5 10z"/><path d="M8 10c.6-3 2-4.5 4-4.5S15.4 7 16 10"/>',
      noodle: '<path d="M3 12c2.2-3 3.6-3 5.4 0s3.2 3 5.4 0 3.2-3 5.4 0"/><path d="M6 16h12"/><path d="M8 16c.6 3 2.2 4.5 4 4.5s3.4-1.5 4-4.5"/>',
      soup: '<path d="M5 11h14c0 6-3 9-7 9s-7-3-7-9z"/><path d="M9 6c.4 1.4-.4 2-0 3M12 5c.5 1.5-.5 2.2 0 3.4M15 6c.4 1.4-.4 2 0 3"/>',
      snack: '<path d="M8 10c0-3 1.6-5 4-5s4 2 4 5c2 0 3 1.4 3 3s-1.6 3-4 3H9c-2.4 0-4-1.4-4-3s1-3 3-3z"/>',
      drum: '<ellipse cx="12" cy="13" rx="8" ry="5"/><ellipse cx="12" cy="13" rx="3.4" ry="2"/>',
      refresh: '<path d="M20 12a8 8 0 1 1-2.2-5.5"/><path d="M20 4v5h-5"/>',
      heart: '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/>',
      list: '<path d="M8 7h12M8 12h12M8 17h12"/><path d="M4 7h.1M4 12h.1M4 17h.1"/>',
      warn: '<path d="M12 4 3 19h18z"/><path d="M12 10v4M12 16.5h.1"/>',
      home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      check: '<path d="M5 12.5 9.2 17 19 7"/>'
    };
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || "") + "</svg>";
  }

  function stars(score) {
    const full = Math.round(Number(score));
    let html = '<span class="stars" aria-hidden="true">';
    for (let i = 1; i <= 5; i += 1) html += icon("star").replace('class="ico"', 'class="ico star' + (i <= full ? " on" : "") + '"');
    return html + "</span>";
  }

  function highlight(text, query) {
    const source = String(text);
    const q = String(query || "").trim();
    if (!q) return esc(source);
    const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(pattern, "ig");
    let out = "";
    let last = 0;
    let match = re.exec(source);
    while (match) {
      out += esc(source.slice(last, match.index)) + "<mark>" + esc(match[0]) + "</mark>";
      last = match.index + match[0].length;
      if (!match[0]) break;
      match = re.exec(source);
    }
    return out + esc(source.slice(last));
  }

  function favButton(id) {
    const on = favorites.has(id);
    return '<button type="button" class="fav" data-action="toggle-fav" data-id="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? "取消收藏" : "收藏") + '">' + icon("heart") + "</button>";
  }

  function chip(action, value, current, label, iconName) {
    const on = String(current) === String(value);
    return '<button type="button" class="chip" data-action="' + action + '" data-value="' + esc(value) + '" aria-pressed="' + on + '">' + (iconName ? icon(iconName) : "") + esc(label) + "</button>";
  }

  function mealSwitch() {
    const labels = { auto: "现在", breakfast: "早餐", lunch: "午餐", tea: "下午", dinner: "晚餐", late: "夜宵" };
    const icons = { auto: "clock", breakfast: "sun", lunch: "rice", tea: "cup", dinner: "moon", late: "moon" };
    return '<div class="meal-switch" role="group" aria-label="选择餐段">' + MEALS.map(function (value) {
      return '<button type="button" class="meal" data-action="set-meal" data-value="' + value + '" aria-pressed="' + (state.meal === value) + '">' + icon(icons[value]) + labels[value] + "</button>";
    }).join("") + "</div>";
  }

  function canteenChips() {
    const items = [{ id: "all", name: "全部食堂" }].concat(DATA.canteens);
    return items.map(function (item) {
      return chip("set-canteen", item.id, state.canteenId, item.name);
    }).join("");
  }

  function preferenceChips() {
    return [
      canteenChips(),
      chip("set-taste", "all", state.taste, "不限"),
      chip("set-taste", "mild", state.taste, "清淡", "leaf"),
      chip("set-taste", "medium", state.taste, "微辣", "pepper"),
      chip("set-taste", "hot", state.taste, "重口", "fire"),
      chip("set-budget", "all", state.budget, "不限价"),
      chip("set-budget", "10", state.budget, "≤10"),
      chip("set-budget", "15", state.budget, "≤15"),
      chip("set-budget", "20", state.budget, "≤20")
    ].join("");
  }

  function dishCard(dish) {
    const where = place(dish);
    const mark = badge(dish);
    const q = state.view === "explore" ? state.query : "";
    return [
      '<article class="dish-card">',
      '<button type="button" class="card-hit" data-action="open-dish" data-id="' + esc(dish.id) + '">',
      '<div class="cover">',
      '<img src="img/' + esc(dish.id) + '.jpg" alt="">',
      mark ? '<span class="badge ' + mark.cls + '">' + mark.text + "</span>" : "",
      "</div>",
      '<div class="card-body">',
      "<h3>" + highlight(dish.name, q) + "</h3>",
      '<p class="score-line">' + stars(dish.rating) + "<b>" + dish.rating.toFixed(1) + "</b></p>",
      '<p class="meta">' + icon("pin") + highlight(where.canteen.name, q) + " " + icon("shop") + highlight(where.stall.name, q) + "</p>",
      '<div class="card-foot"><span class="price"><small>¥</small>' + dish.price + '</span><span class="wait">' + icon("clock") + esc(where.stall.wait) + "</span></div>",
      "</div></button>",
      favButton(dish.id),
      "</article>"
    ].join("");
  }

  function renderToday() {
    const mealKey = activeMeal();
    const meal = mealMeta(mealKey);
    const picked = pickToday();
    const fresh = DATA.dishes.filter(function (dish) {
      return dish.isNew && dish.meals.indexOf(mealKey) !== -1 && matchesCanteen(dish) && !eatenRecent(dish.id);
    });
    const risky = DATA.windows.filter(function (stall) {
      if (!stall.warning) return false;
      if (state.canteenId !== "all" && stall.canteenId !== state.canteenId) return false;
      return DATA.dishes.some(function (dish) {
        return dish.windowId === stall.id && dish.meals.indexOf(mealKey) !== -1;
      });
    });
    let decision = "";
    if (!picked.primary) {
      const settled = state.canteenId === "all" && state.taste === "all" && state.budget === "all" && DATA.dishes.some(function (dish) {
        return dish.meals.indexOf(mealKey) !== -1 && eatenRecent(dish.id);
      });
      decision = [
        '<section class="hero empty-hero">',
        icon(settled ? "check" : "search"),
        "<div><h2>" + meal.label + (settled ? "都吃过了" : "没有合适的") + "</h2>",
        settled ? "" : '<button type="button" class="btn btn-primary" data-action="reset-filters">清空筛选</button>',
        "</div></section>"
      ].join("");
    } else {
      const where = place(picked.primary);
      const dish = picked.primary;
      decision = [
        '<section class="hero">',
        '<div class="cover"><img src="img/' + esc(dish.id) + '.jpg" alt=""></div>',
        "<div class=\"hero-main\">",
        "<h2>" + esc(dish.name) + "</h2>",
        '<div class="facts">',
        "<span>" + icon("pin") + esc(where.canteen.name) + "</span>",
        "<span>" + icon("shop") + esc(where.stall.name) + "</span>",
        "<span>" + icon("clock") + esc(where.stall.wait) + "</span>",
        "<span>" + icon(dish.taste === "hot" ? "fire" : dish.taste === "mild" ? "leaf" : "pepper") + TASTE[dish.taste] + "</span>",
        "</div>",
        '<div class="btn-row">',
        '<button type="button" class="btn btn-primary" data-action="eat" data-id="' + esc(dish.id) + '">' + icon("check") + "就吃这个</button>",
        '<button type="button" class="btn" data-action="open-dish" data-id="' + esc(dish.id) + '">' + icon("list") + "评价</button>",
        '<button type="button" class="btn" data-action="shuffle"' + (picked.total < 2 ? " disabled" : "") + ">" + icon("refresh") + "换一个</button>",
        '<button type="button" class="btn" data-action="toggle-fav" data-id="' + esc(dish.id) + '">' + icon("heart") + (favorites.has(dish.id) ? "已收藏" : "收藏") + "</button>",
        "</div></div>",
        '<div class="score-block">' + stars(dish.rating) + "<strong>" + dish.rating.toFixed(1) + '</strong><span class="price"><small>¥</small>' + dish.price + "</span></div>",
        "</section>"
      ].join("");
    }
    const alts = picked.alts.length
      ? '<div class="section-title"><h2>其他选择</h2></div><div class="card-grid">' + picked.alts.map(dishCard).join("") + "</div>"
      : "";
    const freshBlock = fresh.length
      ? '<div class="section-title"><h2>新品</h2></div><div class="card-grid">' + fresh.map(dishCard).join("") + "</div>"
      : "";
    const riskBlock = risky.length
      ? '<div class="section-title"><h2>别去</h2></div><div class="window-list">' + risky.map(function (stall) {
        return windowButton(stall, true);
      }).join("") + "</div>"
      : "";
    return [
      '<div class="board">',
      mealSwitch(),
      '<div class="strip">' + preferenceChips() + "</div>",
      "</div>",
      decision,
      alts,
      freshBlock,
      riskBlock
    ].join("");
  }

  function renderExplore() {
    const list = exploreList();
    const sortRow = [
      chip("set-sort", "rating", state.sort, "口碑", "star"),
      chip("set-sort", "price", state.sort, "低价"),
      chip("set-sort", "wait", state.sort, "少排队", "clock"),
      '<button type="button" class="toggle" data-action="toggle-new" aria-pressed="' + state.onlyNew + '">' + icon("fire") + "新品</button>",
      '<button type="button" class="toggle" data-action="toggle-risky" aria-pressed="' + state.hideRisky + '">' + icon("warn") + "避开踩雷</button>"
    ].join("");
    return [
      '<div class="board">',
      '<div class="strip">' + preferenceChips() + sortRow + "</div>",
      '<div class="toolbar"><p class="count">' + list.length + " 道</p>",
      '<button type="button" class="btn" data-action="reset-filters">清空</button></div>',
      "</div>",
      list.length ? '<div class="card-grid">' + list.map(dishCard).join("") + "</div>" : '<div class="empty">' + icon("search") + "<p>没有这道菜</p>" + '<button type="button" class="btn btn-primary" data-action="reset-filters">清空筛选</button></div>'
    ].join("");
  }

  function windowButton(stall, bad) {
    const canteen = canteenById(stall.canteenId);
    const served = DATA.dishes.filter(function (dish) { return dish.windowId === stall.id; });
    const names = served.map(function (dish) {
      return '<span class="tag">' + esc(dish.name) + "</span>";
    }).join("");
    const thumb = served[0]
      ? '<img src="img/' + esc(served[0].id) + '.jpg" alt="">'
      : icon(bad ? "warn" : "shop");
    return [
      '<button type="button" class="window-card' + (bad ? " bad" : "") + '" data-action="open-window" data-id="' + esc(stall.id) + '">',
      '<span class="w-ico">' + thumb + "</span>",
      "<div class=\"w-main\">",
      '<div class="top"><strong>' + esc(stall.name) + '</strong><span class="score-pack">' + stars(stall.rating) + '<b class="rating">' + stall.rating.toFixed(1) + "</b></span></div>",
      '<div class="where"><span>' + icon("pin") + esc(canteen.name) + " " + esc(canteen.area) + "</span><span>" + icon("clock") + esc(stall.wait) + "</span></div>",
      bad ? '<p class="note">' + esc(stall.note) + "</p>" : "",
      '<div class="tag-row">' + names + "</div>",
      "</div></button>"
    ].join("");
  }

  function renderWindows() {
    const stalls = DATA.windows.filter(function (stall) {
      return state.canteenId === "all" || stall.canteenId === state.canteenId;
    });
    const bad = stalls.filter(function (stall) { return stall.warning; });
    const good = stalls.filter(function (stall) { return !stall.warning; }).sort(function (a, b) {
      if (state.windowSort === "wait") return waitMinutes(a) - waitMinutes(b) || b.rating - a.rating;
      return b.rating - a.rating;
    });
    const sortChips = chip("set-window-sort", "rating", state.windowSort, "口碑", "star") +
      chip("set-window-sort", "wait", state.windowSort, "少排队", "clock");
    return [
      '<div class="board"><div class="strip">' + canteenChips() + sortChips + "</div></div>",
      bad.length ? '<div class="section-title"><h2>别去</h2></div><div class="window-list">' + bad.map(function (stall) { return windowButton(stall, true); }).join("") + "</div>" : "",
      '<ol class="rank">' + good.map(function (stall) { return "<li>" + windowButton(stall, false) + "</li>"; }).join("") + "</ol>"
    ].join("");
  }

  function myReviewButton(entry) {
    const dish = entry.dish;
    return [
      '<button type="button" class="my-review" data-action="open-dish" data-id="' + esc(dish.id) + '">',
      '<img src="img/' + esc(dish.id) + '.jpg" alt="">',
      "<div><strong>" + esc(dish.name) + "</strong>",
      '<span class="score-line">' + stars(entry.score) + "<b>" + entry.score.toFixed(1) + "</b><em>" + esc(whenLabel(entry.at)) + "</em></span>",
      "<p>" + esc(entry.text) + "</p></div></button>"
    ].join("");
  }

  function eatenRow(entry) {
    const dish = entry.dish;
    return [
      '<div class="ate-row">',
      '<button type="button" class="my-review" data-action="open-dish" data-id="' + esc(dish.id) + '">',
      '<img src="img/' + esc(dish.id) + '.jpg" alt="">',
      "<div><strong>" + esc(dish.name) + "</strong>",
      '<span class="score-line"><em>' + esc(mealMeta(entry.meal).label) + " · " + esc(whenLabel(entry.at)) + "</em></span></div></button>",
      '<button type="button" class="btn" data-action="uneat" data-id="' + esc(dish.id) + '">撤销</button>',
      "</div>"
    ].join("");
  }

  function renderSaved() {
    const recent = eaten.map(function (item) {
      return { id: item.id, at: item.at, meal: item.meal, dish: dishById(item.id) };
    }).filter(function (entry) { return entry.dish; });
    const mine = Object.keys(reviews).map(function (id) {
      return { id: id, score: reviews[id].score, text: reviews[id].text, at: reviews[id].at, dish: dishById(id) };
    }).filter(function (entry) { return entry.dish; }).sort(function (a, b) { return b.at - a.at; });
    const list = DATA.dishes.filter(function (dish) { return favorites.has(dish.id); });
    if (!recent.length && !mine.length && !list.length) {
      return '<div class="empty">' + icon("heart") + "<p>还没有评价和收藏</p></div>";
    }
    return [
      recent.length ? '<div class="section-title"><h2>最近吃过</h2></div><div class="review-list">' + recent.map(eatenRow).join("") + "</div>" : "",
      mine.length ? '<div class="section-title"><h2>我的评价</h2></div><div class="review-list">' + mine.map(myReviewButton).join("") + "</div>" : "",
      list.length ? '<div class="section-title"><h2>收藏</h2></div><div class="card-grid">' + list.map(dishCard).join("") + "</div>" : ""
    ].join("");
  }

  function renderDrawer() {
    if (!state.panel) return "";
    if (state.panel.type === "dish") return dishDrawer(dishById(state.panel.id));
    return windowDrawer(windowById(state.panel.id));
  }

  function scorePicker(current) {
    let html = '<div class="score-pick" role="radiogroup" aria-label="打分">';
    for (let i = 1; i <= 5; i += 1) {
      html += '<button type="button" class="pick-star' + (i <= current ? " on" : "") + '" data-action="set-score" data-value="' + i + '" aria-label="' + i + '分" aria-pressed="' + (i === current) + '">' + icon("star") + "</button>";
    }
    return html + "</div>";
  }

  function reviewComposer(dish) {
    const mine = userReview(dish.id);
    return [
      '<div class="review-box">',
      scorePicker(state.draftScore),
      '<textarea id="review-text" maxlength="60" rows="2" placeholder="写一句">' + esc(state.draftText) + "</textarea>",
      state.draftError ? '<p class="err">' + esc(state.draftError) + "</p>" : "",
      '<div class="btn-row">',
      '<button type="button" class="btn btn-primary" data-action="save-review" data-id="' + esc(dish.id) + '">' + (mine ? "更新" : "发布") + "</button>",
      mine ? '<button type="button" class="btn" data-action="delete-review" data-id="' + esc(dish.id) + '">删除</button>' : "",
      "</div></div>"
    ].join("");
  }

  function dishDrawer(dish) {
    if (!dish) return "";
    const where = place(dish);
    const mine = userReview(dish.id);
    const crowd = dish.reviews.map(function (review) {
      return "<li><div class=\"review-top\"><strong>" + esc(review.user) + "</strong><span>" + stars(review.score) + esc(review.when) + "</span></div><p>" + esc(review.text) + "</p></li>";
    }).join("");
    const own = mine
      ? "<li class=\"mine\"><div class=\"review-top\"><strong>我</strong><span>" + stars(mine.score) + esc(whenLabel(mine.at)) + "</span></div><p>" + esc(mine.text) + "</p></li>"
      : "";
    return [
      '<div class="backdrop" data-action="close-panel"></div>',
      '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(dish.name) + '">',
      '<button type="button" class="drawer-close" data-action="close-panel" aria-label="关闭">' + icon("close") + "</button>",
      '<div class="cover drawer-cover"><img src="img/' + esc(dish.id) + '.jpg" alt=""></div>',
      "<h2>" + esc(dish.name) + "</h2>",
      '<div class="facts"><span>' + stars(dish.rating) + "<b>" + dish.rating.toFixed(1) + '</b></span><span class="price"><small>¥</small>' + dish.price + "</span><span>" + icon("pin") + esc(where.canteen.name) + "</span><span>" + icon("clock") + esc(where.stall.wait) + "</span></div>",
      '<p class="summary">' + esc(dish.summary) + "</p>",
      '<div class="tag-row">' + dish.tags.map(function (tag) { return '<span class="tag">' + esc(tag) + "</span>"; }).join("") + "</div>",
      '<div class="callout' + (where.stall.warning ? " bad" : "") + '">' + (where.stall.warning ? icon("warn") : icon("shop")) + esc(where.stall.note) + "</div>",
      '<div class="btn-row"><button type="button" class="btn btn-primary" data-action="toggle-fav" data-id="' + esc(dish.id) + '">' + icon("heart") + (favorites.has(dish.id) ? "已收藏" : "收藏") + '</button><button type="button" class="btn" data-action="open-window" data-id="' + esc(where.stall.id) + '">' + icon("shop") + "窗口</button></div>",
      '<div class="section-title"><h2>评价</h2></div>',
      reviewComposer(dish),
      '<ul class="reviews">' + own + crowd + "</ul>",
      "</aside>"
    ].join("");
  }

  function windowDrawer(stall) {
    if (!stall) return "";
    const canteen = canteenById(stall.canteenId);
    const dishes = DATA.dishes.filter(function (dish) { return dish.windowId === stall.id; });
    return [
      '<div class="backdrop" data-action="close-panel"></div>',
      '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(stall.name) + '">',
      '<button type="button" class="drawer-close" data-action="close-panel" aria-label="关闭">' + icon("close") + "</button>",
      "<h2>" + esc(stall.name) + "</h2>",
      '<div class="facts"><span>' + stars(stall.rating) + "<b>" + stall.rating.toFixed(1) + "</b></span><span>" + icon("pin") + esc(canteen.name) + "</span><span>" + icon("clock") + esc(stall.wait) + "</span><span>" + esc(canteen.hours) + "</span></div>",
      '<div class="callout' + (stall.warning ? " bad" : "") + '">' + (stall.warning ? icon("warn") : icon("shop")) + esc(stall.note) + "</div>",
      '<div class="section-title"><h2>在售</h2></div>',
      '<div class="card-grid">' + dishes.map(dishCard).join("") + "</div>",
      "</aside>"
    ].join("");
  }

  function navIcon(key) {
    const name = { today: "home", explore: "search", windows: "shop", saved: "heart" }[key];
    return icon(name).replace('class="ico"', 'class="nav-ico"');
  }

  function shell() {
    const nav = Object.keys(VIEWS).map(function (key) {
      const short = { today: "今天", explore: "找菜", windows: "窗口", saved: "我的" }[key];
      return '<button type="button" class="nav-btn" data-action="nav" data-nav="' + key + '">' + navIcon(key) + '<span class="long">' + VIEWS[key] + '</span><span class="short">' + short + "</span></button>";
    }).join("");
    return [
      '<div class="layout">',
      '<aside class="sidebar">',
      '<div class="brand"><span class="logo">食</span><span><strong>食光</strong><small>' + icon("pin") + esc(DATA.campus) + "</small></span></div>",
      '<label class="top-search">' + icon("search") + '<input id="top-q" type="search" placeholder="搜菜品、窗口、食堂" autocomplete="off"></label>',
      '<nav class="side-nav" aria-label="主导航">' + nav + "</nav>",
      "</aside>",
      '<main class="main" id="view"></main>',
      "</div>",
      '<nav class="tabbar" aria-label="主导航">' + nav + "</nav>",
      '<div id="drawer-root"></div>'
    ].join("");
  }

  const pages = {
    today: renderToday,
    explore: renderExplore,
    windows: renderWindows,
    saved: renderSaved
  };

  function render() {
    document.querySelectorAll("[data-nav]").forEach(function (btn) {
      const on = btn.dataset.nav === state.view;
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    document.getElementById("view").innerHTML = pages[state.view]();
    document.getElementById("drawer-root").innerHTML = renderDrawer();
    document.title = VIEWS[state.view] + " · 食光";
    const top = document.getElementById("top-q");
    if (top && document.activeElement !== top && top.value !== state.query) top.value = state.query;
    if (restoreSearch) {
      const input = document.getElementById("q");
      if (input) {
        input.focus();
        const pos = input.value.length;
        input.setSelectionRange(pos, pos);
      }
      restoreSearch = false;
    }
  }

  function resetFilters() {
    state.query = "";
    state.canteenId = "all";
    state.taste = "all";
    state.budget = "all";
    state.onlyNew = false;
    state.hideRisky = true;
    state.sort = "rating";
    state.windowSort = "rating";
    state.pickIndex = 0;
  }

  function onClick(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === "nav") {
      if (location.hash !== "#" + btn.dataset.nav) location.hash = btn.dataset.nav;
      return;
    }
    if (action === "open-dish") {
      state.panel = { type: "dish", id: id };
      beginDraft(id);
    }
    if (action === "set-score") {
      const score = Number(btn.dataset.value);
      if (score >= 1 && score <= 5) state.draftScore = score;
      state.draftError = "";
    }
    if (action === "save-review") {
      const field = document.getElementById("review-text");
      const text = String(field ? field.value : state.draftText).trim().slice(0, 60);
      state.draftText = text;
      if (state.draftScore < 1) state.draftError = "先打分";
      else if (text.length < 2) state.draftError = "再写一句";
      else if (dishById(id)) {
        reviews[id] = { score: state.draftScore, text: text, at: Date.now() };
        saveReviews();
        state.draftError = "";
        state.pickIndex = 0;
      }
    }
    if (action === "eat") {
      markEaten(id);
      state.pickIndex = 0;
    }
    if (action === "uneat") {
      eaten = eaten.filter(function (item) { return item.id !== id; });
      saveEaten();
      state.pickIndex = 0;
    }
    if (action === "delete-review") {
      delete reviews[id];
      saveReviews();
      beginDraft(id);
      state.pickIndex = 0;
    }
    if (action === "open-window") state.panel = { type: "window", id: id };
    if (action === "close-panel") state.panel = null;
    if (action === "toggle-fav") {
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      saveFavs();
    }
    if (action === "shuffle") state.pickIndex += 1;
    if (action === "set-canteen") { state.canteenId = btn.dataset.value; state.pickIndex = 0; }
    if (action === "set-taste") { state.taste = btn.dataset.value; state.pickIndex = 0; }
    if (action === "set-budget") { state.budget = btn.dataset.value; state.pickIndex = 0; }
    if (action === "set-window-sort") state.windowSort = btn.dataset.value === "wait" ? "wait" : "rating";
    if (action === "set-sort") state.sort = ["price", "wait"].indexOf(btn.dataset.value) === -1 ? "rating" : btn.dataset.value;
    if (action === "set-meal") {
      state.meal = MEALS.indexOf(btn.dataset.value) === -1 ? "auto" : btn.dataset.value;
      state.pickIndex = 0;
      saveMeal();
    }
    if (action === "toggle-new") state.onlyNew = !state.onlyNew;
    if (action === "toggle-risky") state.hideRisky = !state.hideRisky;
    if (action === "reset-filters") resetFilters();
    render();
  }

  function onInput(event) {
    if (event.target.id === "review-text") {
      state.draftText = event.target.value;
      return;
    }
    if (event.target.id !== "top-q") return;
    state.query = event.target.value;
    if (composing) return;
    if (state.view !== "explore") {
      location.hash = "explore";
      return;
    }
    render();
  }

  function onComposition(event) {
    if (event.target.id === "review-text") {
      composing = event.type === "compositionstart";
      if (!composing) state.draftText = event.target.value;
      return;
    }
    if (event.target.id !== "top-q") return;
    composing = event.type === "compositionstart";
    if (composing) return;
    state.query = event.target.value;
    if (state.view !== "explore") {
      location.hash = "explore";
      return;
    }
    render();
  }

  function onChange(event) {
    if (event.target.id !== "sort") return;
    state.sort = event.target.value;
    render();
  }

  function onKey(event) {
    if (event.key === "Escape" && state.panel) {
      state.panel = null;
      render();
    }
  }

  function readHash() {
    const name = location.hash.replace("#", "");
    return Object.prototype.hasOwnProperty.call(VIEWS, name) ? name : "today";
  }

  if (!DATA) {
    app.textContent = "模拟数据没有加载。";
    return;
  }

  state.view = readHash();
  if (!location.hash) history.replaceState(null, "", "#today");
  app.innerHTML = shell();
  document.body.addEventListener("click", onClick);
  document.body.addEventListener("input", onInput);
  document.body.addEventListener("compositionstart", onComposition);
  document.body.addEventListener("compositionend", onComposition);
  document.body.addEventListener("change", onChange);
  document.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", function () {
    state.view = readHash();
    state.panel = null;
    render();
  });
  render();
  setInterval(function () {
    if (state.view === "today" && !state.panel && document.activeElement === document.body) render();
  }, 30000);
})();
