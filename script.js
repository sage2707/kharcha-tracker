/* Kharcha Tracker - final script.js
   - New banner logic as requested
   - permanent 'Other' categories
   - dynamic theme-safe text
*/

/* STORAGE KEYS */
const LS_EXP = "kt_exp_final";
const LS_CAT = "kt_cat_final";
const LS_WAL = "kt_wallet_final";
const LS_THEME = "kt_theme_final";

/* defaults */
const DEFAULT_CATS = ["Food","Shopping","Entertainment","Travel","Rent","College","Health","Other"];
let CAT_COLORS = { Food:"#ffd857",Shopping:"#ff7ab6",Entertainment:"#b37bff",Travel:"#57c7ff",Rent:"#8ee5a1",College:"#ffd2a8",Health:"#ff9b4a",Other:"#c9c9c9" };

/* load */
let expenses = JSON.parse(localStorage.getItem(LS_EXP) || "[]");
let categories = JSON.parse(localStorage.getItem(LS_CAT) || JSON.stringify(DEFAULT_CATS));
let wallet = Number(localStorage.getItem(LS_WAL) || 0);

/* elements */
const categorySelect = document.getElementById("categorySelect");
const catColorsDiv = document.getElementById("catColors");
const expenseList = document.getElementById("expenseList");
const monthTotalEl = document.getElementById("monthTotal");
const top3El = document.getElementById("top3");

const bannerMain = document.getElementById("bannerMain");
const bannerSub = document.getElementById("bannerSub");
const spendBanner = document.getElementById("spendBanner");

const categorySummary = document.getElementById("categorySummary");
const otherCatRow = document.getElementById("otherCatRow");
const otherCategoryInput = document.getElementById("otherCategoryInput");

let miniBarChart = null, bifChart = null;

/* HELPERS */
function today(){ return new Date().toISOString().slice(0,10); }
function saveAll(){ localStorage.setItem(LS_EXP, JSON.stringify(expenses)); localStorage.setItem(LS_CAT, JSON.stringify(categories)); localStorage.setItem(LS_WAL, String(wallet)); }

/* color generator */
function randomColor(s){
  let h=0; for(let i=0;i<s.length;i++) h = s.charCodeAt(i) + ((h<<5)-h);
  const c = (h & 0x00FFFFFF).toString(16).toUpperCase();
  return "#"+ "00000".substring(0,6-c.length) + c;
}

/* populate categories + legend */
function loadCategories(){
  categorySelect.innerHTML = `<option value="">Category</option>`;
  categories.forEach(c=>{
    const opt = document.createElement("option"); opt.value=c; opt.textContent=c; categorySelect.appendChild(opt);
    if(!CAT_COLORS[c]) CAT_COLORS[c] = randomColor(c);
  });

  catColorsDiv.innerHTML = "";
  categories.forEach(c=>{
    const div = document.createElement("div");
    div.style.display="flex"; div.style.alignItems="center"; div.style.gap="10px"; div.style.marginBottom="6px";
    div.innerHTML = `<span class="chip" style="background:${CAT_COLORS[c]}"></span><span>${c}</span>`;
    catColorsDiv.appendChild(div);
  });
}
loadCategories();

/* show other input when Other selected */
categorySelect.addEventListener("change", ()=>{
  if(categorySelect.value === "Other") otherCatRow.classList.remove("hidden");
  else { otherCatRow.classList.add("hidden"); otherCategoryInput.value=""; }
});

/* add expense */
document.getElementById("addExpenseBtn").addEventListener("click", ()=>{
  const name = document.getElementById("nameInput").value.trim();
  const amount = Number(document.getElementById("amountInput").value);
  let cat = categorySelect.value;

  if(!name || !amount || !cat) return alert("Fill all fields.");

  if(cat === "Other"){
    const custom = otherCategoryInput.value.trim();
    if(!custom) return alert("Enter custom category.");
    // add permanently
    if(!categories.includes(custom)){
      categories.push(custom);
      CAT_COLORS[custom] = randomColor(custom);
      saveAll(); loadCategories();
    }
    cat = custom;
  }

  expenses.push({ name, amount, category: cat, date: today() });
  saveAll();

  document.getElementById("nameInput").value = "";
  document.getElementById("amountInput").value = "";
  categorySelect.value = "";
  otherCatRow.classList.add("hidden");

  renderAll();
});

/* wallet set */
document.getElementById("walletSetBtn").addEventListener("click", ()=>{
  wallet = Number(document.getElementById("walletInput").value) || 0;
  saveAll(); renderAll();
});

/* export */
document.getElementById("exportBtn").addEventListener("click", ()=>{
  if(!expenses.length) return alert("No data");
  let csv = "date,name,category,amount\n"+ expenses.map(e=>`${e.date},"${e.name}",${e.category},${e.amount}`).join("\n");
  const blob = new Blob([csv],{type:"text/csv"}); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="kharcha.csv"; a.click(); URL.revokeObjectURL(url);
});

/* clear */
document.getElementById("clearBtn").addEventListener("click", ()=>{
  if(!confirm("Clear all data?")) return;
  localStorage.clear(); expenses=[]; categories=[...DEFAULT_CATS]; wallet=0; saveAll(); loadCategories(); renderAll();
});

/* compute current month's expenses */
function monthExpenses(){ const pref = new Date().toISOString().slice(0,7); return expenses.filter(e=>e.date.startsWith(pref)); }

/* render month total & top categories */
function renderMonthSummary(){
  const me = monthExpenses(); const total = me.reduce((s,x)=>s+x.amount,0);
  monthTotalEl.textContent = "₹"+total;
}
function renderTop3(){
  const me = monthExpenses(); const map = {};
  me.forEach(e=> map[e.category] = (map[e.category]||0)+e.amount);
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,3);
  top3El.innerHTML = sorted.length ? sorted.map(([c,v])=>`<div style="display:flex;justify-content:space-between"><div><span class="chip" style="background:${CAT_COLORS[c]}"></span> ${c}</div><strong>₹${v}</strong></div>`).join("") : `<div class="muted">No data</div>`;
}

/* mini bar for last 7 days */
function renderMiniBar(){
  const labels=[]; const vals=[];
  const now = new Date();
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(now.getDate()-i);
    const iso = d.toISOString().slice(0,10);
    const label = d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    const sum = expenses.filter(e=>e.date===iso).reduce((s,x)=>s+x.amount,0);
    labels.push(label); vals.push(sum);
  }
  if(miniBarChart) miniBarChart.destroy();
  miniBarChart = new Chart(document.getElementById("miniBar").getContext("2d"), { type:"bar",
    data:{ labels, datasets:[{ data:vals, backgroundColor:"rgba(255,216,87,0.95)" }]},
    options:{ plugins:{ legend:{display:false }}, scales:{ y:{ display:false }, x:{ grid:{display:false} } } }
  });
}

/* bifurcation donut */
function renderBifurcation(){
  const me = monthExpenses();
  const spent = me.reduce((s,x)=>s+x.amount,0);
  const left = Math.max(wallet - spent, 0);

  document.getElementById("spentAmt").textContent = "₹"+spent;
  document.getElementById("leftAmt").textContent = "₹"+left;
  document.getElementById("walletTotal").textContent = "₹"+(wallet||0);

  if(bifChart) bifChart.destroy();
  bifChart = new Chart(document.getElementById("bifChart").getContext("2d"), {
    type:"doughnut",
    data:{ labels:["Spent","Left"], datasets:[{ data:[spent,left], backgroundColor:["#ff5b5b","#30d158"] }]},
    options:{ cutout:"62%", plugins:{ legend:{display:false}, tooltip:{enabled:false} } }
  });
}

/* list */
function renderList(){
  const me = monthExpenses();
  expenseList.innerHTML = "";
  if(!me.length){ expenseList.innerHTML = `<div class="muted">No expenses this month.</div>`; return; }
  me.slice().reverse().forEach(e=>{
    const idx = expenses.indexOf(e);
    expenseList.innerHTML += `<div class="expense-item"><div class="expense-left"><span class="chip" style="background:${CAT_COLORS[e.category] || '#999'}"></span><strong>${e.name}</strong></div><strong>₹${e.amount}</strong><button class="btn-ghost" onclick="deleteExpense(${idx})">Delete</button></div>`;
  });
}
window.deleteExpense = function(i){ if(!confirm("Delete expense?")) return; expenses.splice(i,1); saveAll(); renderAll(); };

/* banner logic now exactly as requested */
function renderBanner(){
  // always visible title "Spend wisely" (in HTML). We'll set messages here.
  const me = monthExpenses();
  const spent = me.reduce((s,x)=>s+x.amount,0);
  const left = Math.max(wallet - spent, 0);

  // compute leisure: Food + Entertainment + Shopping
  const leisure = me.filter(e=>["Food","Entertainment","Shopping"].includes(e.category)).reduce((s,x)=>s+x.amount,0);

  // default neutral text
  bannerMain.textContent = "Keep tracking — small steps build big savings.";
  bannerSub.textContent = "";

  // priority: if left < 500 show the wallet warning (exact rupee left)
  if(wallet > 0 && left <= 500){
    bannerMain.textContent = `⚠ Spend wisely — only ₹${left} left from your wallet budget.`;
    // if also leisure >5000 show SIP advice under it
    if(leisure > 5000){
      bannerSub.textContent = `💡 If you had invested 10% of your spending (₹${Math.round(leisure*0.1)}) into a SIP, you'd build strong long-term returns.`;
    } else {
      bannerSub.textContent = "";
    }
    // use warning style
    spendBanner.className = "banner-warning";
    return;
  }

  // otherwise if leisure > 5000 (but left not critically low)
  if(leisure > 5000){
    bannerMain.textContent = `💡 Your leisure spending is ₹${leisure} this month.`;
    bannerSub.textContent = `If you invested 10% (₹${Math.round(leisure*0.1)}) into a SIP, you'd create long-term gains. Spend wisely.`;
    spendBanner.className = "banner-advice";
    return;
  }

  // default neutral
  bannerMain.textContent = "Keep tracking — small steps build big savings.";
  bannerSub.textContent = "";
  spendBanner.className = "banner-neutral";
}

/* monthly category summary */
function renderCategorySummary(){
  const me = monthExpenses(); const map={};
  me.forEach(e=> map[e.category] = (map[e.category]||0) + e.amount);
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  categorySummary.innerHTML = sorted.length ? sorted.map(([c,v])=>`<div class="category-summary-item"><span>${c}</span><strong>₹${v}</strong></div>`).join("") : `<div class="muted">No data this month.</div>`;
}

/* theme handling - flips text through CSS variable automatically */
const app = document.getElementById("app");
const themeToggle = document.getElementById("themeToggle");
let theme = localStorage.getItem(LS_THEME) || "dark";
function applyTheme(t){ app.setAttribute("data-theme", t); localStorage.setItem(LS_THEME, t); }
themeToggle.addEventListener("click", ()=>{ theme = theme === "dark" ? "light" : "dark"; applyTheme(theme); });
applyTheme(theme);

/* render top */
function renderAll(){
  loadCategories(); renderMonthSummary(); renderTop3(); renderMiniBar(); renderBifurcation(); renderList(); renderBanner(); renderCategorySummary();
}

/* helpers used earlier */
function renderMonthSummary(){ const me=monthExpenses(); const total=me.reduce((s,x)=>s+x.amount,0); monthTotalEl.textContent = "₹"+total; }
function renderTop3(){ const me=monthExpenses(); const map={}; me.forEach(e=> map[e.category]=(map[e.category]||0)+e.amount); const top = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,3); top3El.innerHTML = top.length ? top.map(([c,v])=>`<div style="display:flex;justify-content:space-between"><div><span class="chip" style="background:${CAT_COLORS[c]}"></span> ${c}</div><strong>₹${v}</strong></div>`).join("") : `<div class="muted">No data</div>`; }

/* bootstrap & chart init */
function bootstrap(){ renderAll(); }
bootstrap();
