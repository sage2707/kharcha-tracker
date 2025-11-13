/* --------- LOCAL STORAGE KEYS --------- */
const LS_EXP = "kt_exp_v2";
const LS_CAT = "kt_cat_v2";
const LS_WAL = "kt_wallet_v2";
const LS_THEME = "kt_theme_v2";

const DEFAULT_CATS = [
  "Food", "Shopping", "Entertainment", "Travel", "Rent",
  "College", "Health", "Other"
];

const CAT_COLORS = {
  Food: "#ffd857",
  Shopping: "#ff7ab6",
  Entertainment: "#b37bff",
  Travel: "#57c7ff",
  Rent: "#8ee5a1",
  College: "#ffd2a8",
  Health: "#ff9b4a",
  Other: "#c9c9c9"
};

/* --------- INITIAL DATA --------- */
let expenses = JSON.parse(localStorage.getItem(LS_EXP) || "[]");
let categories = JSON.parse(localStorage.getItem(LS_CAT) || JSON.stringify(DEFAULT_CATS));
let wallet = Number(localStorage.getItem(LS_WAL) || 0);

function saveAll() {
  localStorage.setItem(LS_EXP, JSON.stringify(expenses));
  localStorage.setItem(LS_CAT, JSON.stringify(categories));
  localStorage.setItem(LS_WAL, wallet);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* --------- DOM SHORTCUTS --------- */
const categorySelect = document.getElementById("categorySelect");
const catColorsDiv = document.getElementById("catColors");
const expenseList = document.getElementById("expenseList");
const monthTotalEl = document.getElementById("monthTotal");
const top3El = document.getElementById("top3");
const adviceArea = document.getElementById("adviceArea");

const miniBarCtx = document.getElementById("miniBar").getContext("2d");
const bifCtx = document.getElementById("bifChart").getContext("2d");

let miniBarChart = null;
let bifChart = null;

/* --------- POPULATE CATEGORY SELECT --------- */
function loadCategories() {
  categorySelect.innerHTML = `<option value="">Select Category</option>`;

  categories.forEach(c => {
    let opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });

  catColorsDiv.innerHTML = "";
  categories.forEach(c => {
    catColorsDiv.innerHTML += `
      <div style="display:flex;align-items:center;gap:10px">
        <span class="chip" style="background:${CAT_COLORS[c] || randomColor(c)}"></span>
        <span>${c}</span>
      </div>
    `;
  });
}

function randomColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const c = (h & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

loadCategories();

/* --------- ADD CATEGORY --------- */
document.getElementById("addCategoryBtn").addEventListener("click", () => {
  const val = document.getElementById("newCategory").value.trim();
  if (!val) return alert("Enter category");
  if (categories.includes(val)) return alert("Already exists");

  categories.push(val);
  saveAll();
  loadCategories();
  document.getElementById("newCategory").value = "";
});

/* --------- ADD EXPENSE --------- */
document.getElementById("addExpenseBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  const amount = Number(document.getElementById("amountInput").value);
  const cat = categorySelect.value;

  if (!name || !amount || !cat) return alert("Fill all fields");

  expenses.push({ name, amount, category: cat, date: today() });
  saveAll();

  document.getElementById("nameInput").value = "";
  document.getElementById("amountInput").value = "";

  renderAll();
});

/* --------- EXPORT CSV --------- */
document.getElementById("exportBtn").addEventListener("click", exportCSV);
document.getElementById("exportCsvBtn").addEventListener("click", exportCSV);

function exportCSV() {
  if (!expenses.length) return alert("No data to export.");

  let csv = "date,name,category,amount\n";
  expenses.forEach(e => {
    csv += `${e.date},"${e.name}",${e.category},${e.amount}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "kharcha.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* --------- CLEAR ALL --------- */
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

/* --------- CLEAR MONTH --------- */
document.getElementById("clearMonthBtn")?.addEventListener("click", () => {
  const pref = new Date().toISOString().slice(0, 7);
  expenses = expenses.filter(e => !e.date.startsWith(pref));
  saveAll();
  renderAll();
});

/* --------- WALLET SET --------- */
document.getElementById("walletSetBtn").addEventListener("click", () => {
  wallet = Number(document.getElementById("walletInput").value) || 0;
  saveAll();
  renderAll();
});

/* --------- CALCULATIONS --------- */
function monthExpenses() {
  const pref = new Date().toISOString().slice(0, 7);
  return expenses.filter(e => e.date.startsWith(pref));
}

/* --------- TOP / SUMMARY --------- */
function renderMonthSummary() {
  const me = monthExpenses();
  const total = me.reduce((s, x) => s + x.amount, 0);
  monthTotalEl.textContent = "₹" + total;
}

function renderTop3() {
  const me = monthExpenses();
  const map = {};

  me.forEach(e => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });

  const arr = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0,3);

  top3El.innerHTML = arr.length
    ? arr.map(([c,v]) => `
        <div style="display:flex;justify-content:space-between">
          <div><span class="chip" style="background:${CAT_COLORS[c]};margin-right:6px"></span>${c}</div>
          <strong>₹${v}</strong>
        </div>
      `).join("")
    : `<div class="muted">No expenses yet</div>`;
}

/* --------- MINI BAR CHART --------- */
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

  miniBarChart = new Chart(miniBarCtx, {
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

/* --------- BIFURCATION (DONUT) --------- */
function renderBifurcation() {
  const me = monthExpenses();
  const spent = me.reduce((s,x)=>s+x.amount,0);
  const left = Math.max(wallet - spent, 0);

  document.getElementById("spentAmt").textContent = "₹" + spent;
  document.getElementById("leftAmt").textContent = "₹" + left;
  document.getElementById("walletTotal").textContent = "₹" + wallet;

  if (bifChart) bifChart.destroy();

  bifChart = new Chart(bifCtx, {
    type: "doughnut",
    data: {
      labels: ["Spent", "Left"],
      datasets: [{
        data: [spent, left],
        backgroundColor: ["#ff5b5b", "#30d158"]
      }]
    },
    options: {
      cutout: "60%",
      plugins: { legend: { display:false }, tooltip: { enabled:false }}
    }
  });
}

/* --------- EXPENSE LIST --------- */
function renderList() {
  const me = monthExpenses();
  expenseList.innerHTML = "";

  if (!me.length) {
    expenseList.innerHTML = `<div class="muted">No expenses this month.</div>`;
    return;
  }

  me.slice().reverse().forEach(e => {
    const idx = expenses.indexOf(e);

    expenseList.innerHTML += `
      <div class="expense-item">
        <div class="expense-left">
          <span class="chip" style="background:${CAT_COLORS[e.category] || "#999"}"></span>
          <strong>${e.name}</strong>
        </div>

        <strong>₹${e.amount}</strong>

        <button class="btn-ghost" onclick="deleteExpense(${idx})">Delete</button>
      </div>
    `;
  });
}

window.deleteExpense = function(i) {
  if (!confirm("Delete this expense?")) return;
  expenses.splice(i,1);
  saveAll();
  renderAll();
};

/* --------- ADVICE --------- */
function renderAdvice() {
  adviceArea.innerHTML = "";
  const me = monthExpenses();
  const risky = (me.filter(e=>["Food","Shopping","Entertainment"].includes(e.category))
                .reduce((s,x)=>s+x.amount,0));

  if (risky > 5000) {
    adviceArea.innerHTML = `
      <div class="advice">
        ⚠ Your spending on leisure categories crossed ₹${risky}.
        Consider investing the extra money instead!
      </div>
    `;
  }
}

/* --------- QR GENERATOR (QUIRKY RANDOM) --------- */
const qrStyles = [
  "qr-style-neon", "qr-style-pastel",
  "qr-style-gradient", "qr-style-sticker",
  "qr-style-emoji"
];

const emojis = ["🔥","✨","💸","😎","🚀","🎉","💰","💯"];

const qrFrame = document.getElementById("qrFrame");
const qrImg = document.getElementById("qrImg");

function randomPick(arr) {
  return arr[Math.floor(Math.random()*arr.length)];
}

function generateQrData(upi, name) {
  let uri = `upi://pay?pa=${encodeURIComponent(upi)}`;
  if (name) uri += `&pn=${encodeURIComponent(name)}`;

  return (
    "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" +
    encodeURIComponent(uri)
  );
}

function applyQrStyle() {
  qrFrame.classList.remove(...qrStyles);
  qrFrame.classList.add(randomPick(qrStyles));

  qrFrame.querySelector(".e1").textContent = randomPick(emojis);
  qrFrame.querySelector(".e2").textContent = randomPick(emojis);
  qrFrame.querySelector(".e3").textContent = randomPick(emojis);
}

document.getElementById("genQrBtn").addEventListener("click", () => {
  const upi = document.getElementById("upiInput").value.trim();
  const name = document.getElementById("upiName").value.trim();

  if (!upi) return alert("Enter UPI ID");

  qrImg.src = generateQrData(upi, name);
  applyQrStyle();
});

document.getElementById("regenQrBtn").addEventListener("click", applyQrStyle);

/* --------- THEME SWITCH --------- */
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

/* --------- RENDER ALL --------- */
function renderAll() {
  loadCategories();
  renderMonthSummary();
  renderTop3();
  renderMiniBar();
  renderBifurcation();
  renderList();
  renderAdvice();
}

/* --------- BOOTSTRAP --------- */
function bootstrap() {
  renderAll();
  applyQrStyle();
}

bootstrap();
