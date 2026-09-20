/* =========================================================
   لا تنسى — التطبيق الرئيسي
   نمط العمل: الحالة (State) ← ثم إعادة الرسم (Render)
   المنطق كما هو منذ MVP — أُضيفت فقط:
   نوافذ حوار مخصصة، Toast، Dark Mode، Splash، مؤشر دائري.
   ========================================================= */

"use strict";

/* ---------- ثوابت ---------- */
const STORAGE_KEY = "latansa_v1";      // بيانات القوائم (لم يتغير — بياناتك محفوظة)
const THEME_KEY = "latansa_theme";     // اختيار المستخدم: "light" / "dark"

/* ---------- الحالة ---------- */
let state = { lists: [] };
let currentListId = null;

/* ---------- أدوات مساعدة ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ---------- التخزين ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.lists)) state = parsed;
    }
  } catch (e) {
    console.error("تعذر قراءة البيانات:", e);
    state = { lists: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- العمليات على البيانات (نفس MVP تمامًا) ---------- */
function findList(id) { return state.lists.find((l) => l.id === id); }

function createList(name) {
  const list = { id: uid(), name: name, items: [] };
  state.lists.unshift(list);
  saveState();
  return list;
}

function deleteList(id) {
  state.lists = state.lists.filter((l) => l.id !== id);
  saveState();
}

function renameList(id, newName) {
  const list = findList(id);
  if (list) { list.name = newName; saveState(); }
}

function addItem(listId, text) {
  const list = findList(listId);
  if (!list) return;
  list.items.push({ id: uid(), text: text, done: false });
  saveState();
}

function toggleItem(listId, itemId) {
  const list = findList(listId);
  if (!list) return;
  const item = list.items.find((i) => i.id === itemId);
  if (item) { item.done = !item.done; saveState(); }
}

function deleteItem(listId, itemId) {
  const list = findList(listId);
  if (!list) return;
  list.items = list.items.filter((i) => i.id !== itemId);
  saveState();
}

function uncheckAllItems(listId) {
  const list = findList(listId);
  if (!list) return;
  list.items.forEach((i) => (i.done = false));
  saveState();
}

function countDone(list) { return list.items.filter((i) => i.done).length; }

/* =========================================================
   نظام النوافذ المخصصة (بدل alert / confirm / prompt)
   ========================================================= */
const modalOverlay = document.getElementById("modal-overlay");
const modalMessage = document.getElementById("modal-message");
const modalInput = document.getElementById("modal-input");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");

function openModal(message, options) {
  options = options || {};
  return new Promise((resolve) => {
    modalMessage.textContent = message;

    // وضع الإدخال (prompt) أو زرين فقط (confirm)
    if (options.input) {
      modalInput.classList.remove("hidden");
      modalInput.value = options.defaultValue || "";
      modalConfirm.textContent = options.confirmText || "حفظ";
    } else {
      modalInput.classList.add("hidden");
      modalInput.value = "";
      modalConfirm.textContent = options.confirmText || "تأكيد";
    }

    modalConfirm.classList.toggle("danger", !!options.danger);
    modalOverlay.classList.remove("hidden");

    if (options.input) modalInput.focus();

    function close(result) {
      modalOverlay.classList.add("hidden");
      modalConfirm.removeEventListener("click", onConfirm);
      modalCancel.removeEventListener("click", onCancel);
      modalOverlay.removeEventListener("click", onOverlay);
      modalInput.removeEventListener("keydown", onEnter);
      resolve(result);
    }

    function onConfirm() {
      close(options.input ? modalInput.value.trim() : true);
    }
    function onCancel() { close(options.input ? null : false); }
    function onOverlay(e) { if (e.target === modalOverlay) close(options.input ? null : false); }
    function onEnter(e) { if (e.key === "Enter") onConfirm(); }

    modalConfirm.addEventListener("click", onConfirm);
    modalCancel.addEventListener("click", onCancel);
    modalOverlay.addEventListener("click", onOverlay);
    modalInput.addEventListener("keydown", onEnter);
  });
}

// اختصارات مريحة بنفس معنى confirm/prompt القديمة
function askConfirm(message, danger) {
  return openModal(message, { danger: danger !== false, confirmText: "تأكيد" });
}

function askPrompt(message, defaultValue) {
  return openModal(message, { input: true, defaultValue: defaultValue, confirmText: "حفظ" });
}

/* ---------- Toast ---------- */
let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
}

/* ---------- Dark Mode ---------- */
function applyTheme(dark) {
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  document.getElementById("btn-theme").textContent = dark ? "☀️" : "🌙";
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", dark ? "#15120d" : "#f6f1e7");
}

function toggleTheme() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(!dark);
  localStorage.setItem(THEME_KEY, !dark ? "dark" : "light");
}

/* ---------- Splash — بصمة المطوّر ---------- */
function runSplash() {
  const splash = document.getElementById("splash");
  // مدة قصيرة حتى لا تزعج، ثم خروج سلس
  setTimeout(() => splash.classList.add("done"), 1700);
  setTimeout(() => splash.remove(), 2400);
  // تشغيل الظهور المتتابع للواجهة الرئيسية
  setTimeout(() => document.body.classList.add("app-in"), 400);
}

/* ---------- التنقل بين الشاشتين ---------- */
function showHome() {
  currentListId = null;
  renderHome();
  switchView("view-home", "view-list");
}

function showList(listId) {
  currentListId = listId;
  renderList();
  switchView("view-list", "view-home");
}

function switchView(showId, hideId) {
  document.getElementById(hideId).classList.add("hidden");
  document.getElementById(showId).classList.remove("hidden");
}

/* ---------- رسم الشاشة الرئيسية ---------- */
function renderHome() {
  const container = document.getElementById("lists-container");
  const emptyMsg = document.getElementById("empty-home");
  const stats = document.getElementById("home-stats");
  const greeting = document.getElementById("greeting");

  container.innerHTML = "";

  // تحية حسب وقت اليوم
  const hour = new Date().getHours();
  greeting.textContent =
    hour < 12 ? "صباح الخير ☀️" : hour < 18 ? "نهارك سعيد 🌤️" : "مساء الخير 🌙";

  // الإحصائيات
  const totalLists = state.lists.length;
  const totalDone = state.lists.reduce((sum, l) => sum + countDone(l), 0);
  const totalItems = state.lists.reduce((sum, l) => sum + l.items.length, 0);

  stats.innerHTML =
    '<span class="stat-chip"><strong>' + totalLists + "</strong> قائمة</span>" +
    '<span class="stat-chip"><strong>' + totalDone + " / " + totalItems + "</strong> منجزة</span>";

  if (state.lists.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  state.lists.forEach((list, index) => {
    const done = countDone(list);
    const total = list.items.length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    const btn = document.createElement("button");
    btn.className = "list-card stagger";
    btn.style.setProperty("--i", index + 2); // بعد الترويسة والزر
    btn.innerHTML =
      '<div class="list-name">' + escapeHtml(list.name) + "</div>" +
      '<div class="list-stats">' + done + " / " + total + " مكتملة</div>" +
      '<div class="progress-bar"><div class="progress-fill" style="width:' +
      percent + '%"></div></div>';

    btn.addEventListener("click", () => showList(list.id));
    container.appendChild(btn);
  });
}

/* ---------- رسم شاشة القائمة ---------- */
const RING_LENGTH = 2 * Math.PI * 18; // محيط دائرة المؤشر (r=18)

function renderList() {
  const list = findList(currentListId);
  if (!list) { showHome(); return; }

  const done = countDone(list);
  const total = list.items.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("list-title").textContent = list.name;
  document.getElementById("list-progress").textContent =
    done + " / " + total + " مكتملة";

  // تحديث المؤشر الدائري
  const ring = document.getElementById("ring-fill");
  ring.style.strokeDashoffset = RING_LENGTH - (RING_LENGTH * percent) / 100;
  document.getElementById("ring-label").textContent = percent + "%";

  const container = document.getElementById("items-container");
  const emptyMsg = document.getElementById("empty-list");
  container.innerHTML = "";

  if (list.items.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  list.items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item-row" + (item.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "item-check";
    checkbox.checked = item.done;
    checkbox.setAttribute("aria-label", "تحديد العنصر");
    checkbox.addEventListener("change", () => {
      toggleItem(list.id, item.id);
      renderList();
    });

    const span = document.createElement("span");
    span.className = "item-text";
    span.textContent = item.text;

    const del = document.createElement("button");
    del.className = "item-delete";
    del.textContent = "✕";
    del.setAttribute("aria-label", "حذف العنصر");
    del.addEventListener("click", async () => {
      const ok = await askConfirm('حذف العنصر "' + item.text + '"؟');
      if (!ok) return;
      // خروج سلس قبل الحذف الفعلي
      li.classList.add("exit");
      setTimeout(() => {
        deleteItem(list.id, item.id);
        renderList();
        showToast("تم حذف العنصر");
      }, 230);
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(del);
    container.appendChild(li);
  });
}

/* ---------- ربط الأحداث ---------- */
function bindEvents() {
  document.getElementById("btn-new-list").addEventListener("click", () => {
    document.getElementById("form-new-list").classList.remove("form-hidden");
    document.getElementById("input-list-name").focus();
  });

  document.getElementById("btn-cancel-new").addEventListener("click", () => {
    document.getElementById("form-new-list").classList.add("form-hidden");
    document.getElementById("input-list-name").value = "";
  });

  document.getElementById("form-new-list").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-list-name");
    const name = input.value.trim();
    if (!name) return;
    const list = createList(name);
    input.value = "";
    document.getElementById("form-new-list").classList.add("form-hidden");
    showList(list.id);
    showToast("تم إنشاء القائمة 🎉");
  });

  document.getElementById("btn-back").addEventListener("click", showHome);

  document.getElementById("form-add-item").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("input-item-text");
    const text = input.value.trim();
    if (!text || currentListId === null) return;
    addItem(currentListId, text);
    input.value = "";
    input.focus();
    renderList();
    // حركة دخول للعنصر الجديد (آخر عنصر في القائمة)
    const rows = document.querySelectorAll(".item-row");
    const last = rows[rows.length - 1];
    if (last) last.classList.add("enter");
  });

  document.getElementById("btn-uncheck-all").addEventListener("click", () => {
    const list = findList(currentListId);
    if (!list || list.items.length === 0) return;
    uncheckAllItems(currentListId);
    renderList();
    showToast("تمت إعادة ضبط القائمة ↺");
  });

  document.getElementById("btn-rename").addEventListener("click", async () => {
    const list = findList(currentListId);
    if (!list) return;
    const newName = await askPrompt("اسم القائمة الجديد:", list.name);
    if (newName) {
      renameList(list.id, newName);
      renderList();
      showToast("تم تغيير الاسم ✎");
    }
  });

  document.getElementById("btn-delete-list").addEventListener("click", async () => {
    const list = findList(currentListId);
    if (!list) return;
    const ok = await askConfirm(
      'حذف قائمة "' + list.name + '"؟ لا يمكن التراجع.', true
    );
    if (ok) {
      deleteList(list.id);
      showHome();
      showToast("تم حذف القائمة");
    }
  });

  document.getElementById("btn-theme").addEventListener("click", toggleTheme);
}

/* ---------- التشغيل ---------- */
loadState();
bindEvents();
runSplash();
// مزامنة أيقونة الثيم مع المحفوظ
applyTheme(document.documentElement.getAttribute("data-theme") === "dark");
showHome();
