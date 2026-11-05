(function () {
  const DATA = window.CANTEEN_DATA;
  const app = document.getElementById("app");
  const FAV_KEY = "shiguang.favorites";
  const MEAL_KEY = "shiguang.meal";
  const MEALS = ["auto", "breakfast", "lunch", "tea", "dinner", "late"];
  const TASTE = { mild: "清淡", medium: "微辣", hot: "重口" };
  const VIEWS = {
    today: "今天吃什么",
    explore: "找菜",
    windows: "窗口口碑",
    saved: "我的收藏"
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
    panel: null
  };

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
    return dish.rating * 10 + familiarity - waitMinutes(stall) * waitWeight(meal);
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
    if (isRisky(dish)) return { cls: "bad", text: "踩雷" };
    if (dish.isNew) return { cls: "new", text: "新品" };
    if (dish.rating >= 4.5) return { cls: "safe", text: "稳" };
    return null;
  }

  function heart(on) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"></path></svg>';
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
    return '<button type="button" class="fav" data-action="toggle-fav" data-id="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? "取消收藏" : "收藏") + '">' + heart(on) + "</button>";
  }

  function chip(action, value, current, label) {
    const on = String(current) === String(value);
    return '<button type="button" class="chip" data-action="' + action + '" data-value="' + esc(value) + '" aria-pressed="' + on + '">' + esc(label) + "</button>";
  }

  function mealSwitch() {
    const labels = { auto: "现在", breakfast: "早餐", lunch: "午餐", tea: "下午", dinner: "晚餐", late: "夜宵" };
    return '<div class="meal-switch" role="group" aria-label="选择餐段">' + MEALS.map(function (value) {
      return '<button type="button" class="meal" data-action="set-meal" data-value="' + value + '" aria-pressed="' + (state.meal === value) + '">' + labels[value] + "</button>";
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
      '<div class="chip-row">' + canteenChips() + "</div>",
      '<div class="chip-row">',
      chip("set-taste", "all", state.taste, "口味不限"),
      chip("set-taste", "mild", state.taste, "清淡"),
      chip("set-taste", "medium", state.taste, "微辣"),
      chip("set-taste", "hot", state.taste, "重口"),
      chip("set-budget", "all", state.budget, "预算不限"),
      chip("set-budget", "10", state.budget, "≤10 元"),
      chip("set-budget", "15", state.budget, "≤15 元"),
      chip("set-budget", "20", state.budget, "≤20 元"),
      "</div>"
    ].join("");
  }

  function dishCard(dish) {
    const where = place(dish);
    const mark = badge(dish);
    const q = state.view === "explore" ? state.query : "";
    return [
      '<article class="dish-card">',
      '<button type="button" class="card-hit" data-action="open-dish" data-id="' + esc(dish.id) + '">',
      '<div class="card-top">',
      '<span class="tile ' + dish.taste + '">' + esc(dish.name.slice(0, 1)) + "</span>",
      "<div>",
      "<h3><span>" + highlight(dish.name, q) + "</span>" + (mark ? '<span class="badge ' + mark.cls + '">' + mark.text + "</span>" : "") + "</h3>",
      '<p class="score-line"><b>' + dish.rating.toFixed(1) + "</b>分 · " + dish.reviewCount + "人评过</p>",
      "<p>" + highlight(where.canteen.name, q) + " · " + highlight(where.stall.name, q) + "</p>",
      "</div></div>",
      '<div class="card-foot"><span class="price"><small>¥</small>' + dish.price + '</span><span class="wait">约 ' + esc(where.stall.wait) + "</span></div></button>",
      favButton(dish.id),
      "</article>"
    ].join("");
  }

  function renderToday() {
    const mealKey = activeMeal();
    const meal = mealMeta(mealKey);
    const nowMeal = mealMeta(mealNow());
    const lookingAhead = state.meal !== "auto";
    const picked = pickToday();
    const fresh = DATA.dishes.filter(function (dish) {
      return dish.isNew && dish.meals.indexOf(mealKey) !== -1 && matchesCanteen(dish);
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
      decision = [
        '<section class="decision">',
        "<div><p class=\"kicker\">现在没有稳妥选择</p>",
        "<h2>条件有点紧</h2>",
        '<p class="decision-copy">' + meal.label + "里，没有同时满足口味和预算、又避开差评窗口的菜。放宽一点，或者换个食堂。</p>",
        '<div class="btn-row" style="margin-top:16px"><button type="button" class="btn btn-primary" data-action="reset-filters">放宽条件</button></div>',
        "</div></section>"
      ].join("");
    } else {
      const where = place(picked.primary);
      const nth = (state.pickIndex % picked.total) + 1;
      const reasons = reasonsFor(picked.primary, todayList()).map(function (line) {
        return "<li>" + esc(line) + "</li>";
      }).join("");
      decision = [
        '<section class="decision">',
        "<div>",
        '<p class="kicker">' + (nth === 1 ? "这一餐最稳" : "换过的选择 · 第 " + nth + " / " + picked.total) + "</p>",
        "<h2>" + esc(picked.primary.name) + "</h2>",
        '<p class="decision-copy">' + esc(where.canteen.name) + " · " + esc(where.stall.name) + "</p>",
        '<ul class="reasons">' + reasons + "</ul>",
        '<div class="btn-row">',
        '<button type="button" class="btn btn-primary" data-action="open-dish" data-id="' + esc(picked.primary.id) + '">看看评价</button>',
        '<button type="button" class="btn" data-action="shuffle"' + (picked.total < 2 ? " disabled" : "") + ">换一个</button>",
        '<button type="button" class="btn" data-action="toggle-fav" data-id="' + esc(picked.primary.id) + '">' + (favorites.has(picked.primary.id) ? "已收藏" : "收藏") + "</button>",
        "</div></div>",
        '<div class="score-block"><strong>' + picked.primary.rating.toFixed(1) + "</strong><span>窗口 " + where.stall.rating.toFixed(1) + "</span></div>",
        "</section>"
      ].join("");
    }
    const altHint = picked.primary && picked.alts.some(function (dish) {
      return place(dish).canteen.id !== place(picked.primary).canteen.id;
    }) ? "尽量换成别的食堂" : "这一餐里的其他选择";
    const alts = picked.alts.length
      ? '<div class="section-title"><h2>也可以</h2><span>' + altHint + '</span></div><div class="card-grid">' + picked.alts.map(dishCard).join("") + "</div>"
      : "";
    const freshBlock = fresh.length
      ? '<div class="section-title"><h2>新上的</h2><span>最近才出现在窗口</span></div><div class="h-scroll">' + fresh.map(dishCard).join("") + "</div>"
      : "";
    const riskBlock = risky.length
      ? '<div class="section-title"><h2>先别去</h2><span>近期差评集中的窗口</span></div>' + risky.map(function (stall) {
        return windowButton(stall, true);
      }).join("")
      : "";
    return [
      '<header class="page-head">',
      '<p class="kicker">' + esc(DATA.campus) + " · " + clock() + (lookingAhead ? " · 现在是" + nowMeal.label : "") + "</p>",
      "<h1>" + (lookingAhead ? meal.label + "吃什么" : greeting() + "，今天吃什么") + "</h1>",
      '<p class="hint">' + (lookingAhead ? "按" + meal.label + "来选，不会跟着当前时间变。" : meal.hint) + "</p>",
      mealSwitch(),
      "</header>",
      '<div class="filters">' + preferenceChips() + "</div>",
      decision,
      alts,
      freshBlock,
      riskBlock
    ].join("");
  }

  function renderExplore() {
    const list = exploreList();
    const hidden = state.hideRisky ? DATA.dishes.filter(isRisky).length : 0;
    return [
      '<header class="page-head"><p class="kicker">菜品</p><h1>找一道想吃的</h1><p class="hint">可以搜菜名、窗口或食堂。每道菜都标了现在大约要排多久。</p></header>',
      '<div class="filters">',
      '<input class="search" id="q" type="search" placeholder="搜菜名、窗口或食堂" value="' + esc(state.query) + '" autocomplete="off">',
      preferenceChips(),
      '<div class="chip-row">',
      '<button type="button" class="toggle" data-action="toggle-new" aria-pressed="' + state.onlyNew + '">只看新品</button>',
      '<button type="button" class="toggle" data-action="toggle-risky" aria-pressed="' + state.hideRisky + '">隐藏踩雷</button>',
      '<label>排序 <select class="sort" id="sort">',
      '<option value="rating"' + (state.sort === "rating" ? " selected" : "") + ">口碑优先</option>",
      '<option value="price"' + (state.sort === "price" ? " selected" : "") + ">价格从低到高</option>",
      '<option value="wait"' + (state.sort === "wait" ? " selected" : "") + ">少排队</option>",
      "</select></label>",
      "</div></div>",
      '<div class="toolbar"><p class="count">' + list.length + " 道菜" + (hidden && state.hideRisky ? " · 已隐藏踩雷菜" : "") + '</p><button type="button" class="btn" data-action="reset-filters">清空筛选</button></div>',
      list.length ? '<div class="card-grid">' + list.map(dishCard).join("") + "</div>" : '<div class="empty">没有符合的菜。把预算放宽，或关掉「只看新品」。</div>'
    ].join("");
  }

  function windowButton(stall, bad) {
    const canteen = canteenById(stall.canteenId);
    const names = DATA.dishes.filter(function (dish) { return dish.windowId === stall.id; }).map(function (dish) { return dish.name; }).join("、");
    return [
      '<button type="button" class="window-card' + (bad ? " bad" : "") + '" data-action="open-window" data-id="' + esc(stall.id) + '">',
      '<div class="top"><strong>' + esc(stall.name) + '</strong><span class="rating">' + stall.rating.toFixed(1) + "</span></div>",
      '<div class="where">' + esc(canteen.name) + " · " + esc(canteen.area) + " · 约 " + esc(stall.wait) + "</div>",
      '<p class="note">' + esc(stall.note) + "</p>",
      '<p class="dishes">' + esc(names) + "</p>",
      "</button>"
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
    const sortChips = '<div class="chip-row">' +
      chip("set-window-sort", "rating", state.windowSort, "口碑优先") +
      chip("set-window-sort", "wait", state.windowSort, "少排队") +
      "</div>";
    return [
      '<header class="page-head"><p class="kicker">窗口</p><h1>先看窗口，再点菜</h1><p class="hint">同一道菜，窗口不稳就会踩雷。差评窗口始终单独放在前面。</p></header>',
      '<div class="filters"><div class="chip-row">' + canteenChips() + "</div>" + sortChips + "</div>",
      bad.length ? '<div class="section-title"><h2>建议避开</h2><span>' + bad.length + " 个窗口</span></div>" + bad.map(function (stall) { return windowButton(stall, true); }).join("") : "",
      '<div class="section-title"><h2>' + (state.windowSort === "wait" ? "按排队" : "按口碑") + "</h2><span>分数来自模拟评价</span></div>",
      '<ol class="rank">' + good.map(function (stall) { return "<li>" + windowButton(stall, false) + "</li>"; }).join("") + "</ol>"
    ].join("");
  }

  function renderSaved() {
    const list = DATA.dishes.filter(function (dish) { return favorites.has(dish.id); });
    return [
      '<header class="page-head"><p class="kicker">收藏</p><h1>想再吃的</h1><p class="hint">收藏只存在这台设备的浏览器里。</p></header>',
      list.length ? '<div class="card-grid">' + list.map(dishCard).join("") + "</div>" : '<div class="empty">还没有收藏。在菜品上点爱心，下次就不用重新找。</div>'
    ].join("");
  }

  function renderDrawer() {
    if (!state.panel) return "";
    if (state.panel.type === "dish") return dishDrawer(dishById(state.panel.id));
    return windowDrawer(windowById(state.panel.id));
  }

  function dishDrawer(dish) {
    if (!dish) return "";
    const where = place(dish);
    const reviews = dish.reviews.map(function (review) {
      return "<li><div class=\"review-top\"><strong>" + esc(review.user) + "</strong><span>" + review.score.toFixed(1) + " · " + esc(review.when) + "</span></div><p>" + esc(review.text) + "</p></li>";
    }).join("");
    return [
      '<div class="backdrop" data-action="close-panel"></div>',
      '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(dish.name) + '">',
      '<button type="button" class="drawer-close" data-action="close-panel">关闭</button>',
      '<p class="kicker" style="margin-top:16px">' + esc(where.canteen.name) + " · " + esc(where.stall.name) + "</p>",
      "<h2>" + esc(dish.name) + "</h2>",
      '<div class="stat-line"><span><strong>' + dish.rating.toFixed(1) + "</strong> 分</span><span><strong>¥" + dish.price + "</strong></span><span>" + TASTE[dish.taste] + "</span><span>约 " + esc(where.stall.wait) + "</span></div>",
      '<p class="summary">' + esc(dish.summary) + "</p>",
      '<div class="tag-row">' + dish.tags.map(function (tag) { return '<span class="tag">' + esc(tag) + "</span>"; }).join("") + "</div>",
      '<div class="callout' + (where.stall.warning ? " bad" : "") + '">' + esc(where.stall.note) + "</div>",
      '<div class="btn-row"><button type="button" class="btn btn-primary" data-action="toggle-fav" data-id="' + esc(dish.id) + '">' + (favorites.has(dish.id) ? "取消收藏" : "收藏这道菜") + '</button><button type="button" class="btn" data-action="open-window" data-id="' + esc(where.stall.id) + '">看这个窗口</button></div>',
      '<div class="section-title"><h2>同学怎么说</h2><span>摘录 ' + dish.reviews.length + " / " + dish.reviewCount + " 条</span></div>",
      '<ul class="reviews">' + reviews + "</ul>",
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
      '<button type="button" class="drawer-close" data-action="close-panel">关闭</button>',
      '<p class="kicker" style="margin-top:16px">' + esc(canteen.name) + " · " + esc(canteen.area) + "</p>",
      "<h2>" + esc(stall.name) + "</h2>",
      '<div class="stat-line"><span><strong>' + stall.rating.toFixed(1) + "</strong> 分</span><span>" + stall.reviewCount + " 条窗口评价</span><span>" + esc(canteen.hours) + "</span></div>",
      '<div class="callout' + (stall.warning ? " bad" : "") + '">' + esc(stall.note) + "</div>",
      '<div class="section-title"><h2>这个窗口的菜</h2></div>',
      '<div class="card-grid">' + dishes.map(dishCard).join("") + "</div>",
      "</aside>"
    ].join("");
  }

  function navIcon(key) {
    const paths = {
      today: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1z"/>',
      explore: '<circle cx="11" cy="11" r="6.2"/><path d="m16 16 4.2 4.2"/>',
      windows: '<path d="M4 7h16M4 12h16M4 17h10"/>',
      saved: '<path d="M12 20s-6.5-4.1-6.5-8.4a3.7 3.7 0 0 1 6.5-1.9 3.7 3.7 0 0 1 6.5 1.9C18.5 15.9 12 20 12 20z"/>'
    };
    return '<svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">' + paths[key] + "</svg>";
  }

  function shell() {
    const nav = Object.keys(VIEWS).map(function (key) {
      const short = { today: "今天", explore: "找菜", windows: "窗口", saved: "收藏" }[key];
      return '<button type="button" class="nav-btn" data-action="nav" data-nav="' + key + '">' + navIcon(key) + '<span class="long">' + VIEWS[key] + '</span><span class="short">' + short + "</span></button>";
    }).join("");
    return [
      '<div class="layout">',
      '<aside class="sidebar">',
      '<div class="brand"><span class="logo">食</span><span><strong>食光</strong><small>' + esc(DATA.campus) + "</small></span></div>",
      '<nav class="side-nav" aria-label="主导航">' + nav + "</nav>",
      '<p class="side-note">模拟数据，不是真实档口</p>',
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
    if (action === "open-dish") state.panel = { type: "dish", id: id };
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
    if (event.target.id !== "q") return;
    state.query = event.target.value;
    if (composing) return;
    restoreSearch = true;
    render();
  }

  function onComposition(event) {
    if (event.target.id !== "q") return;
    composing = event.type === "compositionstart";
    if (composing) return;
    state.query = event.target.value;
    restoreSearch = true;
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
