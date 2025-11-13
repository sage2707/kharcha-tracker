/* =======================================================
   KHARCHA TRACKER – FULL JAVASCRIPT (FINAL)
==========================================================*/

/* ---------- LOCAL STORAGE KEYS ---------- */
const LS_EXP = "kt_exp_v3";
const LS_CAT = "kt_cat_v3";
const LS_WAL = "kt_wallet_v3";
const LS_THEME = "kt_theme_v3";

/* ---------- DEFAULT CATEGORIES ---------- */
let DEFAULT_CATS = [
  "Food", "Shopping", "Entertainment", "Travel", "Rent",
  "College", "Health", "Other"
];

let CAT_COLORS = {
  Food: "#ffd857",
  Shopping: "#ff7ab6",
  Entertainment: "#b37bff",
  Travel: "#57c7ff",
  Rent: "#8ee5a1",
  College: "#ffd2a8",
  Health: "#ff9b4a",
  Other: "#c9c9c9"
};

/* ---------- INITIAL LOAD ---------- */
let expenses = JSON.parse(localStorage.getItem(LS_EXP) || "[]");
let categories = JSON.parse(localStorage.getItem(LS_CAT) || JSON.stringify(DEFAULT_CATS));
let wallet = Number(localStorage.getItem(LS_WAL) || 0);

/* ---------- SAVE DATA ---------- */
function saveAll() {
  localStorage.setItem(LS_EXP, JSON.stringify(expenses));
  localStorage.setItem(LS_CAT, JSON.stringify(categories));
  localStorage.setItem(LS_WAL, wallet);
}

/* ---------- HELPERS ---------- */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- DOM ---------- */
const categorySelect = document.getElementById("categorySelect");
const catColorsDiv = document.getElementById("catColors");
const expenseList = document.getElementById("expenseList");
const monthTotalEl = document.getElementById("monthTotal");
const top3El = document.getElementById("top3");

const smartSummaryText = document.getElementById("smartSummaryText");
const categorySummary = document.getElementById("categorySummary");

const otherCatRow = document.getElementById("otherCatRow");
const otherCategoryInput = document.getElementById("otherCategoryInput");

let miniBarChart, bifChart;

/* =======================================================
   LOAD CATEGORY DROPDOWN + CATEGORY COLOR DISPLAY
==========================================================*/

function randomColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const c = (h & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function loadCategories() {
  categorySelect.innerHTML = `<option value="">Category</option>`;
  
  categories.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);

    if (!CAT_COLORS[c]) CAT_COLORS[c] = randomColor(c);
  });

  catColorsDiv.innerHTML = "";
  categories.forEach(c => {
    catColorsDiv.innerHTML += `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span class="chip" style="background:${CAT_COLORS[c]}"></span>
        <span>${c}</span>
      </div>
    `;
  });
}

loadCategories();

/* =======================================================
   SHOW CUSTOM CATEGORY WHEN OTHER IS SELECTED
==========================================================*/

categorySelect.addEventListener("change", () => {
  if (categorySelect.value === "Other") {
    otherCatRow.classList.remove("hidden");
  } else {
    otherCatRow.classList.add("hidden");
    otherCategoryInput.value = "";
  }
});

/* =======================================================
   ADD EXPENSE
==========================================================*/

document.getElementById("addExpenseBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  const amount = Number(document.getElementById("amountInput").value);
  let cat = categorySelect.value;

  if (!name || !amount || !cat) return alert("Fill all fields.");

  if (cat === "Other") {
    const customCat = otherCategoryInput.value.trim();
    if (!customCat) return alert("Enter custom category.");

    // Add new category permanently
    if (!categories.includes(customCat)) {
      categories.push(customCat);
      CAT_COLORS[customCat] = randomColor(customCat);
      saveAll();
      loadCategories();
    }

    cat = customCat;
  }

  expenses.push({ name, amount, category: cat, date: today() });
  saveAll();

  document.getElementById("nameInput").value = "";
  document.getElementById("amountInput").value = "";
  categorySelect.value = "";
  otherCatRow.classList.add("hidden");

  renderAll();
});

/* =======================================================
   CLEAR ALL
==========================================================*/

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("Clear all data?")) return;
  localStorage.clear();
  expenses = [];
  categories = [...DEFAULT_CATS];
  wallet = 0;
  saveAll();
  loadCategories();
  renderAll();
});

/* =======================================================
   EXPORT CSV
==========================================================*/

document.getElementById("exportBtn").addEventListener("click", exportCSV);

function exportCSV() {
  if (!expenses.length) return alert("No data.");

  let csv = "date,name,category,amount\n";
  expenses.forEach(e => csv += `${e.date},"${e.name}",${e.category},${e.amount}\n`);

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "kharcha.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* =======================================================
   WALLET SET
==========================================================*/

document.getElementById("walletSetBtn").addEventListener("click", () => {
  wallet = Number(document.getElementById("walletInput").value || 0);
  saveAll();
  renderAll();
});

/* =======================================================
   MONTH EXPENSES
==========================================================*/

function monthExpenses() {
  const pref = new Date().toISOString().slice(0, 7);
  return expenses.filter(e => e.date.startsWith(pref));
}

/* =======================================================
   MONTH SUMMARY + TOP 3
==========================================================*/

function renderMonthSummary() {
  const me = monthExpenses();
  const total = me.reduce((s, x) => s + x.amount, 0);

  monthTotalEl.textContent = "₹" + total;
}

function renderTop3() {
  const me = monthExpenses();
  const map = {};

  me.forEach(e => map[e.category] = (map[e.category] || 0) + e.amount);

  const top = Object.entries(map)
    .sort((a,b) => b[1] - a[1])
    .slice(0,3);

  top3El.innerHTML = top.length
    ? top.map(([c, v]) => `
        <div style="display:flex;justify-content:space-between">
          <div><span class="chip" style="background:${CAT_COLORS[c]}"></span> ${c}</div>
          <strong>₹${v}</strong>
        </div>
      `).join("")
    : `<div class="muted">No data</div>`;
}

/* =======================================================
   MINI BAR CHART
==========================================================*/

function renderMiniBar() {
  const labels = [];
  const vals = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);

    const iso = d.toISOString().slice(0,10);
    const label = d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});

    const sum = expenses.filter(e => e.date === iso)
                        .reduce((s,x)=>s+x.amount,0);

    labels.push(label);
    vals.push(sum);
  }

  if (miniBarChart) miniBarChart.destroy();

  miniBarChart = new Chart(document.getElementById("miniBar").getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: vals,
        backgroundColor: "rgba(255,216,87,0.9)"
      }]
    },
    options: {
      plugins: { legend: { display:false }},
      scales: { y: { display:false }, x: { grid: { display:false }}}
    }
  });
}

/* =======================================================
   DONUT (BIFURCATION)
==========================================================*/

function renderBifurcation() {
  const me = monthExpenses();
  const spent = me.reduce((s,x)=>s+x.amount,0);
  const left = Math.max(wallet - spent, 0);

  document.getElementById("spentAmt").textContent = "₹" + spent;
  document.getElementById("leftAmt").textContent = "₹" + left;
  document.getElementById("walletTotal").textContent = "₹" + wallet;

  if (bifChart) bifChart.destroy();

  bifChart = new Chart(document.getElementById("bifChart").getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Spent", "Left"],
      datasets: [{
        data: [spent, left],
        backgroundColor: ["#ff5b5b", "#30d158"]
      }]
    },
    options: {
      cutout: "62%",
      plugins: { legend: { display:false }, tooltip: { enabled:false }}
    }
  });
}

/* =======================================================
   RENDER EXPENSE LIST
==========================================================*/

function renderList() {
  const me = monthExpenses();
  expenseList.innerHTML = "";

  if (!me.length) {
    expenseList.innerHTML = `<div class="muted">No expenses yet.</div>`;
    return;
  }

  me.slice().reverse().forEach(e => {
    const idx = expenses.indexOf(e);
    expenseList.innerHTML += `
      <div class="expense-item">
        <div class="expense-left">
          <span class="chip" style="background:${CAT_COLORS[e.category]}"></span>
          <strong>${e.name}</strong>
        </div>

        <strong>₹${e.amount}</strong>

        <button class="btn-ghost" onclick="deleteExpense(${idx})">Delete</button>
      </div>
    `;
  });
}

window.deleteExpense = function(i) {
  if (!confirm("Delete expense?")) return;
  expenses.splice(i,1);
  saveAll();
  renderAll();
};

/* =======================================================
   SMART SUMMARY CARD
==========================================================*/

function renderSmartSummary() {
  smartSummaryText.innerHTML = "";
  const me = monthExpenses();

  const spent = me.reduce((s,x)=>s+x.amount,0);
  const left = Math.max(wallet - spent, 0);

  /* -------- Wallet Warning -------- */
  if (wallet > 0 && left <= wallet * 0.25) {
    smartSummaryText.innerHTML += `
      <div class="summary-warning">
        ⚠ Spend wisely — only ₹${left} left from your wallet budget.
      </div>
    `;
  }

  /* -------- SIP Advice -------- */
  const leisure = me.filter(e =>
    ["Food","Shopping","Entertainment","Leisure"].includes(e.category)
  ).reduce((s,x)=>s+x.amount,0);

  if (leisure > 5000) {
    smartSummaryText.innerHTML += `
      <div class="summary-advice">
        💡 If you invested even 10% of this (₹${Math.round(leisure*0.1)}) into a SIP,
        you'd create great long-term returns. Spend wisely!
      </div>
    `;
  }
}

/* =======================================================
   MONTHLY CATEGORY SUMMARY
==========================================================*/

function renderCategorySummary() {
  const me = monthExpenses();
  const map = {};

  me.forEach(e => map[e.category] = (map[e.category] || 0) + e.amount);

  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]);

  categorySummary.innerHTML = sorted.length
    ? sorted.map(([c,v]) => `
        <div class="category-summary-item">
          <span>${c}</span>
          <strong>₹${v}</strong>
        </div>
      `).join("")
    : `<div class="muted">No data this month.</div>`;
}

/* =======================================================
   THEME SWITCH
==========================================================*/

const app = document.getElementById("app");
const themeToggle = document.getElementById("themeToggle");

let theme = localStorage.getItem(LS_THEME) || "dark";
applyTheme(theme);

function applyTheme(t) {
  app.setAttribute("data-theme", t);
  localStorage.setItem(LS_THEME, t);
}

themeToggle.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme(theme);
});

/* =======================================================
   RENDER EVERYTHING
==========================================================*/

function renderAll() {
  loadCategories();
  renderMonthSummary();
  renderTop3();
  renderMiniBar();
  renderBifurcation();
  renderList();
  renderSmartSummary();
  renderCategorySummary();
}

/* =======================================================
   BOOTSTRAP
==========================================================*/

function bootstrap() { renderAll(); }
bootstrap();
