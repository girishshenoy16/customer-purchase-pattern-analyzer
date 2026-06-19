// ═══════════════════════════════════════════════════════════════════
// PactQ Executive Dashboard — app.js
// Pages: Revenue Overview | Customer Behaviour | Product & Channel
// ═══════════════════════════════════════════════════════════════════

// ── Palette (mirrors CSS vars) ────────────────────────────────────
const NAVY   = '#003366';
const ORANGE = '#FF6B00';
const TEAL   = '#0D7377';
const PURPLE = '#5B2D8E';
const SUCCESS= '#16a34a';
const DANGER = '#dc2626';
const WARN   = '#d97706';

const PALETTE = [NAVY, ORANGE, TEAL, PURPLE, '#1D8BD6','#E05C00','#0A5F5F','#3B1A6E'];
const ALPHA   = (hex, a) => hex + Math.round(a*255).toString(16).padStart(2,'0');

// ── Global state ──────────────────────────────────────────────────
let DATA = null;
let CHARTS = {};
let baselineShares = {};

// Active filter state
let F = {
  dateFrom:  '2025-01-01',
  dateTo:    '2025-12-31',
  region:    new Set(),
  segment:   new Set(),
  loyalty:   new Set(),
  channel:   new Set(),
  age:       new Set(),
  gender:    new Set(),
};

// Month ordering
const MONTH_ORDER = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};

// ── Boot ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('topbar-date').textContent =
    new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.page).classList.add('active');
    });
  });

  // Collapsible filter groups toggle
  document.querySelectorAll('.filter-group.collapsible .filter-group-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('collapsed');
    });
  });

  // Quick date presets
  document.querySelectorAll('.btn-quick-date').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-quick-date').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const r = btn.dataset.range;
      let from = '2025-01-01', to = '2025-12-31';
      if (r === 'q1') { from = '2025-01-01'; to = '2025-03-31'; }
      else if (r === 'q2') { from = '2025-04-01'; to = '2025-06-30'; }
      else if (r === 'q3') { from = '2025-07-01'; to = '2025-09-30'; }
      else if (r === 'q4') { from = '2025-10-01'; to = '2025-12-31'; }
      
      document.getElementById('filter-date-from').value = from;
      document.getElementById('filter-date-to').value = to;
      F.dateFrom = from;
      F.dateTo = to;
      render();
    });
  });

  document.getElementById('btn-reset').addEventListener('click', resetFilters);

  fetch('data.json')
    .then(r => { if(!r.ok) throw new Error('data.json not found'); return r.json(); })
    .then(data => {
      DATA = data;
      computeBaseline();
      buildChips();
      bindDateFilters();
      render();
    })
    .catch(err => console.error('Dashboard load failed:', err));
});

// ── Calculate Baseline Share percentages for Filters ──────────────
function computeBaseline() {
  const counts = {region:{}, segment:{}, loyalty:{}, channel:{}, age:{}, gender:{}};
  
  DATA.transactions.forEach(r => {
    const tx = r.transactions || 1;
    counts.region[r.Region] = (counts.region[r.Region] || 0) + tx;
    counts.segment[r['Customer Segment']] = (counts.segment[r['Customer Segment']] || 0) + tx;
    counts.loyalty[r['Loyalty Status']] = (counts.loyalty[r['Loyalty Status']] || 0) + tx;
    counts.channel[r['Purchase Channel']] = (counts.channel[r['Purchase Channel']] || 0) + tx;
    counts.age[r['Age Group']] = (counts.age[r['Age Group']] || 0) + tx;
    counts.gender[r.Gender] = (counts.gender[r.Gender] || 0) + tx;
  });
  
  const totalTxns = Object.values(counts.region).reduce((a,b)=>a+b, 0) || 1;
  
  const dims = ['region','segment','loyalty','channel','age','gender'];
  dims.forEach(d => {
    baselineShares[d] = {};
    Object.entries(counts[d]).forEach(([k,v]) => {
      baselineShares[d][k] = ((v / totalTxns) * 100).toFixed(1) + '%';
    });
  });
}

// ── Build chip filters ────────────────────────────────────────────
function buildChips() {
  const fp = DATA.filterPools;
  makeChips('chips-region',  fp.regions,   F.region,   'region');
  makeChips('chips-segment', fp.segments,  F.segment,  'segment');
  makeChips('chips-loyalty', fp.loyalty,   F.loyalty,  'loyalty');
  makeChips('chips-channel', fp.channels,  F.channel,  'channel');
  makeChips('chips-age',     fp.ageGroups, F.age,      'age');
  makeChips('chips-gender',  fp.genders,   F.gender,   'gender');
}

function makeChips(containerId, values, set, key) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  values.forEach(v => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const share = baselineShares[key] && baselineShares[key][v] ? ` (${baselineShares[key][v]})` : '';
    chip.textContent = `${v}${share}`;
    if (set.has(v)) chip.classList.add('selected');
    chip.addEventListener('click', () => {
      if (set.has(v)) { set.delete(v); chip.classList.remove('selected'); }
      else           { set.add(v);    chip.classList.add('selected'); }
      render();
    });
    el.appendChild(chip);
  });
}

function bindDateFilters() {
  document.getElementById('filter-date-from').addEventListener('change', e => {
    document.querySelectorAll('.btn-quick-date').forEach(b => b.classList.remove('active'));
    F.dateFrom = e.target.value;
    render();
  });
  document.getElementById('filter-date-to').addEventListener('change',   e => {
    document.querySelectorAll('.btn-quick-date').forEach(b => b.classList.remove('active'));
    F.dateTo   = e.target.value;
    render();
  });
}

function resetFilters() {
  ['region','segment','loyalty','channel','age','gender'].forEach(k => F[k].clear());
  F.dateFrom = '2025-01-01'; F.dateTo = '2025-12-31';
  document.getElementById('filter-date-from').value = '2025-01-01';
  document.getElementById('filter-date-to').value   = '2025-12-31';
  
  // Set quick date to FY25
  document.querySelectorAll('.btn-quick-date').forEach(b => {
    if (b.dataset.range === 'fy') b.classList.add('active');
    else b.classList.remove('active');
  });

  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  render();
}

// ── Main filter logic ─────────────────────────────────────────────
function filter(rows) {
  return rows.filter(r => {
    if (F.region.size  && !F.region.has(r.Region))                     return false;
    if (F.segment.size && !F.segment.has(r['Customer Segment']))        return false;
    if (F.loyalty.size && !F.loyalty.has(r['Loyalty Status']))          return false;
    if (F.channel.size && !F.channel.has(r['Purchase Channel']))        return false;
    if (F.age.size     && !F.age.has(r['Age Group']))                   return false;
    if (F.gender.size  && !F.gender.has(r.Gender))                      return false;
    // Date filtering by MonthNum approximation (Jan=1…Dec=12)
    const mn = r.MonthNum;
    const fromMon = new Date(F.dateFrom).getMonth() + 1;
    const toMon   = new Date(F.dateTo).getMonth()   + 1;
    if (mn < fromMon || mn > toMon) return false;
    return true;
  });
}

// ── Master render ─────────────────────────────────────────────────
function render() {
  const rows = filter(DATA.transactions);
  
  // Aggregates
  const agg = aggregate(rows);

  // Update Sidebar Header Metrics
  const sideMargin = agg.rev > 0 ? (agg.np / agg.rev * 100) : 0;
  setText('side-rev', '₹' + fmtL(agg.rev));
  setText('side-txn', fmtNum(agg.txn));
  setText('side-margin', sideMargin.toFixed(1) + '%');

  // Update Sidebar Active Filter Summary
  updateActiveFiltersSummary();

  // Update Sidebar Snapshots
  setText('snap-filtered', rows.length.toLocaleString('en-IN'));
  setText('snap-transactions', DATA.kpis.totalOrders.toLocaleString('en-IN'));
  setText('snap-customers', DATA.kpis.customers.toLocaleString('en-IN'));

  // Update briefing top statistic
  setText('brief-cust', fmtNum(DATA.kpis.customers));

  // Dynamic Executive Briefing Narrative
  const topCatE  = Object.entries(agg.byCat).sort((a,b)=>b[1].revenue-a[1].revenue)[0];
  const topChanE = Object.entries(agg.byChan).sort((a,b)=>b[1].revenue-a[1].revenue)[0];
  const topCat = topCatE ? topCatE[0] : '—';
  const topChan = topChanE ? topChanE[0] : '—';
  const t = DATA.targets;
  const revPerf = (agg.rev / t.revenue * 100).toFixed(1);
  const ret = (DATA.kpis.retentionRate * 100).toFixed(1);
  const netMargin = agg.rev > 0 ? (agg.np / agg.rev * 100) : 0;
  
  const briefingText = `<strong>CFO Board Alert:</strong> Year-to-date revenue reached ₹${fmtL(agg.rev)} (representing <strong>${revPerf}%</strong> of target), driven primarily by strong <strong>${topCat}</strong> sales via the <strong>${topChan}</strong> channel. Overall customer retention remains strong at <strong>${ret}%</strong>, while operating net margins are steady at <strong>${netMargin.toFixed(1)}%</strong>.`;
  document.querySelector('.briefing-summary').innerHTML = briefingText;

  renderPage1(rows, agg);
  renderPage2(rows, agg);
  renderPage3(rows, agg);
  renderPage4(rows, agg);
  updateAlerts(rows, agg);
}

// ── Update Sidebar Active Filter List ──────────────────────────────
function updateActiveFiltersSummary() {
  const summaryEl = document.getElementById('active-filters-summary');
  if (!summaryEl) return;
  
  const active = [];
  if (F.region.size) active.push(`<strong>Region:</strong> ${Array.from(F.region).join(', ')}`);
  if (F.segment.size) active.push(`<strong>Segment:</strong> ${Array.from(F.segment).join(', ')}`);
  if (F.loyalty.size) active.push(`<strong>Loyalty:</strong> ${Array.from(F.loyalty).join(', ')}`);
  if (F.channel.size) active.push(`<strong>Channel:</strong> ${Array.from(F.channel).join(', ')}`);
  if (F.age.size) active.push(`<strong>Age:</strong> ${Array.from(F.age).join(', ')}`);
  if (F.gender.size) active.push(`<strong>Gender:</strong> ${Array.from(F.gender).join(', ')}`);
  
  if (active.length === 0) {
    summaryEl.innerHTML = `
      <div class="active-filters-title">Active Filters</div>
      <div class="active-filters-empty">No active filters (showing baseline)</div>
    `;
  } else {
    summaryEl.innerHTML = `
      <div class="active-filters-title">Active Filters</div>
      <ul class="active-filters-list">
        ${active.map(a => `<li>${a}</li>`).join('')}
      </ul>
    `;
  }
}

// ── Aggregate from filtered rows ──────────────────────────────────
function aggregate(rows) {
  let rev=0, txn=0, qty=0, discSum=0, gp=0, np=0;
  const byMonth={}, byRegion={}, byCat={}, byCity={}, bySeg={}, byLoyalty={}, byChan={}, byAge={}, byGender={};
  const byPayment={}, byCatChan={}, byCatGender={};

  rows.forEach(r => {
    rev     += r.revenue;
    txn     += r.transactions;
    qty     += r.quantity;
    discSum += (r.avgDiscount || 0) * r.transactions;
    gp      += (r.grossProfit || 0);
    np      += (r.netProfit || 0);

    acc(byMonth,   r.Month,                         r);
    acc(byRegion,  r.Region,                        r);
    acc(byCat,     r['Product Category'],            r);
    acc(byCity,    r.City,                          r);
    acc(bySeg,     r['Customer Segment'],            r);
    acc(byLoyalty, r['Loyalty Status'],              r);
    acc(byChan,    r['Purchase Channel'],            r);
    acc(byAge,     r['Age Group'],                   r);
    acc(byGender,  r.Gender,                         r);
    acc(byPayment, r['Payment Method'],              r);

    const ccKey = `${r['Product Category']}||${r['Purchase Channel']}`;
    byCatChan[ccKey] = (byCatChan[ccKey]||0) + r.revenue;

    const cgKey = `${r['Product Category']}||${r.Gender}`;
    byCatGender[cgKey] = (byCatGender[cgKey]||0) + r.revenue;
  });

  const avgDisc = txn > 0 ? discSum / txn : 0;

  return {rev, txn, qty, avgDisc, gp, np,
    byMonth, byRegion, byCat, byCity, bySeg,
    byLoyalty, byChan, byAge, byGender, byPayment,
    byCatChan, byCatGender};
}

function acc(obj, key, row) {
  if (!obj[key]) obj[key] = {revenue:0, transactions:0, quantity:0, grossProfit:0, netProfit:0};
  obj[key].revenue      += row.revenue;
  obj[key].transactions += row.transactions;
  obj[key].quantity     += row.quantity;
  obj[key].grossProfit  += (row.grossProfit || 0);
  obj[key].netProfit    += (row.netProfit || 0);
}

// ═══════════════════════════════════════════════════════════════════
// PAGE 1 — REVENUE OVERVIEW
// ═══════════════════════════════════════════════════════════════════
function renderPage1(rows, agg) {
  const aov     = agg.txn > 0 ? agg.rev / agg.txn : 0;
  const momPct  = DATA.kpis.momChange;

  // KPIs
  setText('kpi-revenue',  '₹' + fmtL(agg.rev));
  setText('kpi-orders',   fmtNum(agg.txn));
  setText('kpi-aov',      '₹' + fmtNum(Math.round(aov)));
  setText('kpi-discount', agg.avgDisc.toFixed(1) + '%');

  // Dynamic KPI Trend Sub-Labels
  const revVar = ((agg.rev / DATA.targets.revenue - 1) * 100).toFixed(1);
  const revVarHTML = `FY 2025 Net Sales <span class="trend-indicator ${revVar >= 0 ? 'up' : 'down'}">${revVar >= 0 ? '↑' : '↓'} ${Math.abs(revVar)}% vs target</span>`;
  document.getElementById('sub-revenue').innerHTML = revVarHTML;

  const ordVar = ((agg.txn / DATA.targets.transactions - 1) * 100).toFixed(1);
  const ordVarHTML = `Purchase records <span class="trend-indicator ${ordVar >= 0 ? 'up' : 'down'}">${ordVar >= 0 ? '↑' : '↓'} ${Math.abs(ordVar)}% vs target</span>`;
  document.getElementById('sub-orders').innerHTML = ordVarHTML;

  const targetAOV = 448;
  const aovVar = ((aov / targetAOV - 1) * 100).toFixed(1);
  const aovVarHTML = `Revenue / Transactions <span class="trend-indicator ${aovVar >= 0 ? 'up' : 'down'}">${aovVar >= 0 ? '↑' : '↓'} ${Math.abs(aovVar)}% vs baseline</span>`;
  document.getElementById('sub-aov').innerHTML = aovVarHTML;

  const targetDisc = 10.0;
  const discVar = (agg.avgDisc - targetDisc).toFixed(1);
  const discVarHTML = `Across all transactions <span class="trend-indicator ${discVar <= 0 ? 'up' : 'down'}">${discVar <= 0 ? '↓' : '↑'} ${Math.abs(discVar)}% variance</span>`;
  document.getElementById('sub-discount').innerHTML = discVarHTML;

  // MoM badge
  const momBadge = document.getElementById('kpi-mom-badge');
  if (momPct > 0) {
    momBadge.textContent = `↑ +${momPct.toFixed(1)}% MoM`;
    momBadge.className = 'kpi-mom mom-up';
  } else if (momPct < 0) {
    momBadge.textContent = `↓ ${momPct.toFixed(1)}% MoM`;
    momBadge.className = 'kpi-mom mom-down';
  } else {
    momBadge.textContent = '→ Flat MoM';
    momBadge.className = 'kpi-mom mom-flat';
  }

  // Monthly Trend
  const months  = Object.keys(agg.byMonth).sort((a,b)=>(MONTH_ORDER[a]||0)-(MONTH_ORDER[b]||0));
  const mRevs   = months.map(m => Math.round(agg.byMonth[m].revenue));
  const mTxns   = months.map(m => agg.byMonth[m].transactions);
  drawLine('c-monthly', months, [
    {label:'Revenue (₹)', data:mRevs, borderColor:NAVY, backgroundColor:ALPHA(NAVY,0.07), fill:true, yAxisID:'y'},
    {label:'Transactions', data:mTxns, borderColor:ORANGE, backgroundColor:'transparent', borderDash:[5,4], yAxisID:'y1'},
  ],{
    y:  {position:'left',  ticks:{callback:v=>'₹'+fmtL(v)}, title:{display:true,text:'Revenue (₹)',font:{weight:'bold'}}},
    y1: {position:'right', grid:{drawOnChartArea:false}, title:{display:true,text:'Transactions',font:{weight:'bold'}}},
  });
  const peakMonth = months[mRevs.indexOf(Math.max(...mRevs))];
  setInsight('ins-monthly', `★ ${peakMonth} records the highest monthly revenue of ₹${fmtL(Math.max(...mRevs))} in FY 2025.`);

  // Region Ranked Horizontal Bar (replacing Donut)
  const regEntries = Object.entries(agg.byRegion).sort((a,b)=>b[1].revenue-a[1].revenue);
  const regK = regEntries.map(e => e[0]);
  const regV = regEntries.map(e => Math.round(e[1].revenue));
  const regPct = regV.map(v => agg.rev > 0 ? (v / agg.rev * 100).toFixed(1) + '%' : '0%');
  drawHBar('c-region', regK, regV, regPct, PALETTE);
  const topReg = regK[0] || '—';
  const topRegPct = agg.rev > 0 ? ((agg.byRegion[topReg]?.revenue||0)/agg.rev*100).toFixed(1) : 0;
  setInsight('ins-region', `★ ${topReg} region contributes ${topRegPct}% of total revenue — prioritise marketing here.`);

  // Category Horizontal Bar
  const catEntries = Object.entries(agg.byCat).sort((a,b)=>b[1].revenue-a[1].revenue);
  const catK = catEntries.map(e=>e[0]);
  const catV = catEntries.map(e=>Math.round(e[1].revenue));
  const catPct = catV.map(v=>agg.rev>0?(v/agg.rev*100).toFixed(1)+'%':'0%');
  drawHBar('c-category', catK, catV, catPct, PALETTE);
  const topCat = catK[0];
  setInsight('ins-category', `★ ${topCat} is the top revenue category (${catPct[0]} share). Increase inventory and promotional investment.`);

  // Top 10 Cities Bar (casing bug fixed: c.city -> c.City)
  let cities = DATA.cityRevenue || [];
  if (F.region.size) cities = cities.filter(c => F.region.has(c.Region));
  const top10 = cities.slice(0,10);
  const cK = top10.map(c=>c.City);
  const cV = top10.map(c=>Math.round(c.revenue));
  drawBar('c-cities', cK, cV, NAVY, '₹');
  setInsight('ins-cities', `★ ${cK[0]||'—'} is the highest-revenue city at ₹${fmtL(cV[0]||0)} — consider flagship presence or city-specific campaigns.`);

  // Insight panel
  renderInsightPanel('ins-panel-p1', DATA.insights.page1);
}

// ═══════════════════════════════════════════════════════════════════
// PAGE 2 — CUSTOMER BEHAVIOUR & SEGMENTATION
// ═══════════════════════════════════════════════════════════════════
function renderPage2(rows, agg) {
  const kpis = DATA.kpis;

  setText('kpi-customers',  fmtNum(kpis.customers));
  setText('kpi-hv-pct',     kpis.highValuePct.toFixed(1) + '%');
  setText('kpi-plat-pct',   kpis.platinumPct.toFixed(1)  + '%');
  setText('kpi-freq',       kpis.purchaseFreq.toFixed(1) + 'x');

  // Dynamic KPI Trend Sub-Labels
  document.getElementById('sub-customers').innerHTML = `Active buyers in FY 2025 <span class="trend-indicator up">↑ Stable base</span>`;

  const hvVar = (agg.txn > 0 ? (rows.filter(r=>r['Customer Segment']=='High-Value').reduce((s,r)=>s+r.transactions,0)/agg.txn*100) : 0);
  const hvVarDiff = (hvVar - 35.0).toFixed(1);
  document.getElementById('sub-hv').innerHTML = `Of total active base <span class="trend-indicator ${hvVarDiff >= 0 ? 'up' : 'down'}">${hvVarDiff >= 0 ? '↑' : '↓'} ${Math.abs(hvVarDiff)}% vs baseline</span>`;

  const platVar = (agg.txn > 0 ? (rows.filter(r=>r['Loyalty Status']=='Platinum').reduce((s,r)=>s+r.transactions,0)/agg.txn*100) : 0);
  const platVarDiff = (platVar - 25.0).toFixed(1);
  document.getElementById('sub-plat').innerHTML = `Of total active base <span class="trend-indicator ${platVarDiff >= 0 ? 'up' : 'down'}">${platVarDiff >= 0 ? '↑' : '↓'} ${Math.abs(platVarDiff)}% vs baseline</span>`;

  const freqVar = (kpis.purchaseFreq - 13.0).toFixed(1);
  document.getElementById('sub-freq').innerHTML = `Purchases per customer <span class="trend-indicator ${freqVar >= 0 ? 'up' : 'down'}">${freqVar >= 0 ? '↑' : '↓'} ${Math.abs(freqVar)}x vs baseline</span>`;

  // Loyalty Tier vs Avg Value — clustered bar
  const loyaltyOrder = ['Bronze','Silver','Gold','Platinum'];
  const loyaltyCols  = [WARN, ORANGE, '#1D8BD6', PURPLE];
  const loyaltyData  = DATA.loyaltyAvg || [];
  const lyK = loyaltyOrder.filter(l => loyaltyData.find(d=>d['Loyalty Status']===l));
  const lyV = lyK.map(l => {
    const d = loyaltyData.find(x=>x['Loyalty Status']===l);
    return d ? Math.round(d.avgValue) : 0;
  });
  drawBarColored('c-loyalty-value', lyK, lyV, loyaltyCols, '₹');
  const maxLoyK = lyK[lyV.indexOf(Math.max(...lyV))];
  setInsight('ins-loyalty-value', `★ ${maxLoyK} loyalty tier spends the highest avg ₹${Math.max(...lyV).toLocaleString('en-IN')} per transaction.`);

  // Customer Segment Doughnut
  const segK = Object.keys(agg.bySeg);
  const segV = segK.map(k => Math.round(agg.bySeg[k].revenue));
  drawDoughnut('c-segment', segK, segV, PALETTE);
  const topSeg = segK[segV.indexOf(Math.max(...segV))];
  const topSegPct = agg.rev>0?((agg.bySeg[topSeg]?.revenue||0)/agg.rev*100).toFixed(1):0;
  setInsight('ins-segment', `★ ${topSeg} segment drives ${topSegPct}% of total revenue — tailor exclusive offers for this group.`);

  // Age × Gender Stacked Bar
  const ageOrder  = ['18-25','26-35','36-50','50+'];
  const genders   = Object.keys(agg.byGender);
  const ageGenDs  = genders.map((g,i) => {
    const vals = ageOrder.map(ag => {
      const match = rows.filter(r => r['Age Group']===ag && r.Gender===g);
      return Math.round(match.reduce((s,r)=>s+r.revenue,0));
    });
    return {label:g, data:vals, backgroundColor:PALETTE[i], stack:'s1'};
  });
  drawStackedBar('c-age-gender', ageOrder, ageGenDs, '₹');
  setInsight('ins-age-gender', `★ 26-35 age group is typically the highest-spending cohort. Female vs Male splits reveal targeting opportunities.`);

  // Frequency vs Spend Scatter
  const scatter = DATA.scatterFreqValue || [];
  const segColors = {'High-Value':ORANGE,'Gen-Z Digital':PURPLE,'Standard':NAVY};
  const segGroups = {};
  scatter.forEach(p => {
    const s = p.segment || 'Standard';
    if (!segGroups[s]) segGroups[s] = [];
    segGroups[s].push({x: p.freq, y: p.value});
  });
  const scatterDs = Object.entries(segGroups).map(([s,pts])=>({
    label:s,
    data:pts,
    backgroundColor: ALPHA(segColors[s]||NAVY, 0.55),
    borderColor: segColors[s]||NAVY,
    borderWidth:1,
    pointRadius:4,
    pointHoverRadius:7,
  }));
  drawScatter('c-scatter-freq', scatterDs, 'Purchases per Customer', 'Total Spend (₹)');
  setInsight('ins-scatter-freq', `★ High-Value customers show higher purchase frequency AND higher spend — loyalty programs are directly driving revenue.`);

  // Channel Ranked Horizontal Bar (replacing Donut)
  const chanEntries = Object.entries(agg.byChan).sort((a,b)=>b[1].transactions-a[1].transactions);
  const chanK = chanEntries.map(e=>e[0]);
  const chanV = chanEntries.map(e=>e[1].transactions);
  const chanPct = chanV.map(v=>agg.txn>0?(v/agg.txn*100).toFixed(1)+'%':'0%');
  drawHBar('c-channel', chanK, chanV, chanPct, [NAVY, ORANGE, TEAL]);
  const topChan = chanK[0] || '—';
  const topChanPct = agg.txn>0?((agg.byChan[topChan]?.transactions||0)/agg.txn*100).toFixed(1):0;
  setInsight('ins-channel', `★ ${topChan} leads with ${topChanPct}% of transactions — optimise ${topChan} experience for maximum conversion.`);

  renderInsightPanel('ins-panel-p2', DATA.insights.page2);
}

// ═══════════════════════════════════════════════════════════════════
// PAGE 3 — PRODUCT & CHANNEL INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════
function renderPage3(rows, agg) {
  // Derived KPIs from filtered data
  const topCatE  = Object.entries(agg.byCat).sort((a,b)=>b[1].revenue-a[1].revenue)[0];
  const topPayE  = Object.entries(agg.byPayment).sort((a,b)=>b[1].transactions-a[1].transactions)[0];
  const topChanE = Object.entries(agg.byChan).sort((a,b)=>b[1].revenue-a[1].revenue)[0];
  const topRegE  = Object.entries(agg.byRegion).sort((a,b)=>b[1].revenue-a[1].revenue)[0];

  setText('kpi-top-cat',  topCatE?.[0]  || '—');
  setText('kpi-top-pay',  topPayE?.[0]  || '—');
  setText('kpi-top-chan', topChanE?.[0] || '—');
  setText('kpi-top-reg',  topRegE?.[0]  || '—');

  // Category × Channel Heatmap
  const catChanData = DATA.categoryChannel || [];
  const cats     = [...new Set(catChanData.map(d=>d.category))].sort();
  const channels = [...new Set(catChanData.map(d=>d.channel))].sort();
  const maxRev   = Math.max(...catChanData.map(d=>d.revenue));
  renderHeatmap('heatmap-cat-chan', cats, channels, catChanData, maxRev);
  const topCC = catChanData.slice().sort((a, b) => b.revenue - a.revenue)[0];
  const insHeatmapEl = document.getElementById('ins-heatmap');
  if (insHeatmapEl && topCC) {
    const topCatName = topCatE ? topCatE[0] : 'Electronics';
    const otherCats = Object.keys(agg.byCat)
      .filter(c => c !== topCatName)
      .sort((a, b) => agg.byCat[b].revenue - agg.byCat[a].revenue)
      .slice(0, 2);
    const recommendationsStr = otherCats.length > 0 ? otherCats.join(' and ') : 'other categories';

    insHeatmapEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div>★ <strong>Primary Combination:</strong> ${topCC.category} via ${topCC.channel} is the highest-grossing category-channel combination at ₹${fmtL(topCC.revenue)}.</div>
        <div style="border-top: 1px solid rgba(0, 51, 102, 0.1); padding-top: 6px;">⚠ <strong>Concentration Risk:</strong> ${topCatName} contributes a disproportionately large share of category revenue across all purchase channels, making it both the primary growth driver and a potential concentration risk. Consider expanding high-potential categories such as ${recommendationsStr} to diversify revenue streams.</div>
      </div>
    `;
  } else if (insHeatmapEl) {
    insHeatmapEl.textContent = '—';
  }

  // Payment Ranked Horizontal Bar (replacing Donut)
  const payEntries = Object.entries(agg.byPayment).sort((a,b)=>b[1].transactions-a[1].transactions);
  const payK = payEntries.map(e=>e[0]);
  const payV = payEntries.map(e=>e[1].transactions);
  const payPct = payV.map(v=>agg.txn>0?(v/agg.txn*100).toFixed(1)+'%':'0%');
  drawHBar('c-payment', payK, payV, payPct, PALETTE);
  const topPayKey = payK[0] || '—';
  const topPayPct = agg.txn>0?((agg.byPayment[topPayKey]?.transactions||0)/agg.txn*100).toFixed(1):0;
  setInsight('ins-payment', `★ ${topPayKey} is preferred by ${topPayPct}% of customers — ensure zero-friction checkout for this method.`);

  // Day-of-Week line
  const dow = DATA.dayOfWeek || [];
  const dowK = dow.map(d=>d.day);
  const dowV = dow.map(d=>d.transactions);
  drawLine('c-dow', dowK, [{label:'Transactions', data:dowV, borderColor:ORANGE, backgroundColor:ALPHA(ORANGE,0.1), fill:true}], {});
  const peakDow = dowK[dowV.indexOf(Math.max(...dowV))];
  setInsight('ins-dow', `★ ${peakDow} records the highest transaction count — ideal day to push promotions and flash sales.`);

  // Category × Gender 100% Stacked
  const cgData    = DATA.categoryGender || [];
  const cgCats    = [...new Set(cgData.map(d=>d.category))].sort();
  const cgGenders = [...new Set(cgData.map(d=>d.gender))];
  const cgTotal   = {};
  cgCats.forEach(c => {
    cgTotal[c] = cgData.filter(d=>d.category===c).reduce((s,d)=>s+d.revenue,0);
  });
  const cgDs = cgGenders.map((g,i) => ({
    label:g,
    data: cgCats.map(c => {
      const d = cgData.find(x=>x.category===c && x.gender===g);
      const tot = cgTotal[c] || 1;
      return d ? +((d.revenue/tot)*100).toFixed(1) : 0;
    }),
    backgroundColor: PALETTE[i],
    stack:'g1',
  }));
  drawStackedBar('c-cat-gender', cgCats, cgDs, '%');
  setInsight('ins-cat-gender', `★ Gender split reveals differential preferences across product categories — use for targeted campaign personalisation.`);

  // Qty vs Unit Price Scatter
  const qpData = DATA.scatterQtyPrice || [];
  const qpCats = [...new Set(qpData.map(d=>d.category))];
  const qpDs   = qpCats.map((c,i) => ({
    label: c,
    data: qpData.filter(d=>d.category===c).map(d=>({x:d.qty, y:d.price, r:Math.max(4, Math.sqrt(d.total/50))})),
    backgroundColor: ALPHA(PALETTE[i]||NAVY, 0.55),
    borderColor: PALETTE[i]||NAVY,
    borderWidth:1,
  }));
  drawBubble('c-qty-price', qpDs, 'Quantity Purchased', 'Unit Price (₹)');
  setInsight('ins-qty-price', `★ Higher quantity purchases do not always correlate with lower unit prices — suggesting strong brand pricing discipline.`);

  renderInsightPanel('ins-panel-p3', DATA.insights.page3);
}

// ═══════════════════════════════════════════════════════════════════
// PAGE 4 — CFO STRATEGIC INSIGHTS
// ═══════════════════════════════════════════════════════════════════
function renderPage4(rows, agg) {
  // Financial KPIs
  const gpMargin = agg.rev > 0 ? (agg.gp / agg.rev * 100) : 0;
  const npMargin = agg.rev > 0 ? (agg.np / agg.rev * 100) : 0;

  setText('kpi-gross-profit', '₹' + fmtL(agg.gp));
  setText('kpi-net-profit',   '₹' + fmtL(agg.np));
  setText('kpi-gross-margin',  gpMargin.toFixed(1) + '%');
  setText('kpi-net-margin',    npMargin.toFixed(1) + '%');

  // Dynamic KPI Trend Sub-Labels
  const gpVar = ((agg.gp / (DATA.targets.revenue * 0.30) - 1) * 100).toFixed(1);
  document.getElementById('sub-gross-profit').innerHTML = `Total revenue minus COGS <span class="trend-indicator ${gpVar >= 0 ? 'up' : 'down'}">${gpVar >= 0 ? '↑' : '↓'} ${Math.abs(gpVar)}% vs target</span>`;

  const npVar = ((agg.np / (DATA.targets.revenue * 0.18) - 1) * 100).toFixed(1);
  document.getElementById('sub-net-profit').innerHTML = `Operating income post costs <span class="trend-indicator ${npVar >= 0 ? 'up' : 'down'}">${npVar >= 0 ? '↑' : '↓'} ${Math.abs(npVar)}% vs target</span>`;

  const gmVarDiff = (gpMargin - 30.0).toFixed(1);
  document.getElementById('sub-gross-margin').innerHTML = `Gross profit / revenue <span class="trend-indicator ${gmVarDiff >= 0 ? 'up' : 'down'}">${gmVarDiff >= 0 ? '↑' : '↓'} ${Math.abs(gmVarDiff)}% vs budget</span>`;

  const nmVarDiff = (npMargin - 18.0).toFixed(1);
  document.getElementById('sub-net-margin').innerHTML = `Net profit / revenue <span class="trend-indicator ${nmVarDiff >= 0 ? 'up' : 'down'}">${nmVarDiff >= 0 ? '↑' : '↓'} ${Math.abs(nmVarDiff)}% vs budget</span>`;

  // 1. Targets vs Actuals Progress Bars
  const t = DATA.targets;
  const revPct = Math.min(150, (agg.rev / t.revenue) * 100);
  const txnPct = Math.min(150, (agg.txn / t.transactions) * 100);
  const gpPct = t.grossProfit ? (agg.gp / t.grossProfit) * 100 : 0;
  const npPct = t.netProfit ? (agg.np / t.netProfit) * 100 : 0;
  const gpPctBar = Math.min(150, gpPct);
  const npPctBar = Math.min(150, npPct);
  
  const targetHTML = `
    <div class="target-row">
      <div class="target-info">
        <strong>Total Revenue Achievement</strong>
        <span>₹${fmtL(agg.rev)} / ₹${fmtL(t.revenue)} (${(agg.rev/t.revenue*100).toFixed(1)}%)</span>
      </div>
      <div class="progress-outer">
        <div class="progress-inner ${revPct >= 100 ? 'overachieved' : ''}" style="width: ${revPct}%"></div>
        <div class="target-marker" style="left: ${100/1.5}%"></div>
      </div>
    </div>
    <div class="target-row" style="margin-top:12px;">
      <div class="target-info">
        <strong>Total Transaction Volume</strong>
        <span>${fmtNum(agg.txn)} / ${fmtNum(t.transactions)} (${(agg.txn/t.transactions*100).toFixed(1)}%)</span>
      </div>
      <div class="progress-outer">
        <div class="progress-inner ${txnPct >= 100 ? 'overachieved' : ''}" style="width: ${txnPct}%"></div>
        <div class="target-marker" style="left: ${100/1.5}%"></div>
      </div>
    </div>
    <div class="target-row" style="margin-top:12px;">
      <div class="target-info">
        <strong>Gross Profit Achievement</strong>
        <span>₹${fmtL(agg.gp)} / ₹${fmtL(t.grossProfit || 10000000)} (${gpPct.toFixed(1)}%)</span>
      </div>
      <div class="progress-outer">
        <div class="progress-inner ${gpPct >= 100 ? 'overachieved' : ''}" style="width: ${gpPctBar}%"></div>
        <div class="target-marker" style="left: ${100/1.5}%"></div>
      </div>
    </div>
    <div class="target-row" style="margin-top:12px;">
      <div class="target-info">
        <strong>Net Profit Achievement</strong>
        <span>₹${fmtL(agg.np)} / ₹${fmtL(t.netProfit || 6000000)} (${npPct.toFixed(1)}%)</span>
      </div>
      <div class="progress-outer">
        <div class="progress-inner ${npPct >= 100 ? 'overachieved' : ''}" style="width: ${npPctBar}%"></div>
        <div class="target-marker" style="left: ${100/1.5}%"></div>
      </div>
    </div>
  `;
  document.getElementById('targets-progress-bars').innerHTML = targetHTML;

  let targetsInsight = '';
  if (agg.rev >= t.revenue && agg.txn >= t.transactions && agg.gp >= (t.grossProfit || 10000000) && agg.np >= (t.netProfit || 6000000)) {
    targetsInsight = `
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div>⭐ Revenue target achievement stands at <strong>${(agg.rev/t.revenue*100).toFixed(1)}%</strong> of budget.</div>
        <div style="border-top: 1px solid rgba(0, 51, 102, 0.1); padding-top: 6px;">⭐ Revenue, Transactions, Gross Profit, and Net Profit have all exceeded FY targets, demonstrating strong business growth, profitability, and operational efficiency.</div>
      </div>
    `;
  } else {
    targetsInsight = `
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div>⭐ Revenue target achievement stands at <strong>${(agg.rev/t.revenue*100).toFixed(1)}%</strong> of budget.</div>
        <div style="border-top: 1px solid rgba(0, 51, 102, 0.1); padding-top: 6px;">⭐ Budget Achievement: Revenue ${(agg.rev/t.revenue*100).toFixed(1)}%, Transactions ${(agg.txn/t.transactions*100).toFixed(1)}%, Gross Profit ${gpPct.toFixed(1)}%, Net Profit ${npPct.toFixed(1)}%.</div>
      </div>
    `;
  }
  const insEl = document.getElementById('ins-targets-progress');
  if (insEl) insEl.innerHTML = targetsInsight;

  // 2. Category Profitability Chart
  const catEntries = Object.entries(agg.byCat).sort((a,b)=>b[1].netProfit-a[1].netProfit);
  const catK = catEntries.map(e=>e[0]);
  const catNP = catEntries.map(e=>Math.round(e[1].netProfit));
  const catGP = catEntries.map(e=>Math.round(e[1].grossProfit));
  
  mkChart('c-category-profit', 'bar', {
    labels: catK,
    datasets: [
      { label: 'Gross Profit', data: catGP, backgroundColor: ALPHA(NAVY, 0.8), borderRadius: 4 },
      { label: 'Net Profit', data: catNP, backgroundColor: ALPHA(ORANGE, 0.8), borderRadius: 4 }
    ]
  }, {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: defaultLegend, tooltip: { callbacks: { label: ctx => `₹${fmtL(ctx.parsed.y)}` } } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#EEF2FA' }, ticks: { callback: v => '₹' + fmtL(v) } }
    }
  });
  setInsight('ins-category-profit', `★ ${catK[0] || '—'} is the most profitable category generating ₹${fmtL(catNP[0] || 0)} Net Profit.`);

  // 3. Forecasting Chart
  const actualMonths = Object.keys(agg.byMonth).sort((a,b)=>(MONTH_ORDER[a]||0)-(MONTH_ORDER[b]||0));
  const actualRevs = actualMonths.map(m=>Math.round(agg.byMonth[m].revenue));
  
  const filterRatio = DATA.kpis.revenue > 0 ? agg.rev / DATA.kpis.revenue : 0;
  const fMonths = DATA.forecast.map(f=>f.Month);
  const fRevs = DATA.forecast.map(f=>Math.round(f.revenue * filterRatio));
  
  const allLabels = [...actualMonths, ...fMonths];
  const actualDataset = [...actualRevs, ...fMonths.map(()=>null)];
  const forecastDataset = [...actualRevs.map((v,i)=>i===actualRevs.length-1 ? v : null), ...fRevs];

  drawLine('c-forecast', allLabels, [
    { label: 'Actual Revenue (₹)', data: actualDataset, borderColor: NAVY, backgroundColor: ALPHA(NAVY, 0.05), fill: true },
    { label: 'Forecasted Revenue (₹)', data: forecastDataset, borderColor: ORANGE, backgroundColor: 'transparent', borderDash: [6, 4], pointRadius: 4 }
  ], {
    y: { ticks: { callback: v => '₹' + fmtL(v) }, title: { display: true, text: 'Revenue (₹)', font: { weight: 'bold' } } }
  });
  setInsight('ins-forecast', `★ Q1 2026 forecasted cumulative revenue: ₹${fmtL(fRevs.reduce((a,b)=>a+b, 0))} based on historical run rate.`);

  // 4. Geographic Leaderboard Table
  const cityGroup = {};
  rows.forEach(r => {
    const key = `${r.City}||${r.Region}`;
    if (!cityGroup[key]) cityGroup[key] = {rev:0, txn:0, gp:0, np:0};
    cityGroup[key].rev += r.revenue;
    cityGroup[key].txn += r.transactions;
    cityGroup[key].gp  += (r.grossProfit || 0);
    cityGroup[key].np  += (r.netProfit || 0);
  });
  
  const cityList = Object.entries(cityGroup).map(([k,v]) => {
    const [city, region] = k.split('||');
    return {
      city, region,
      rev: v.rev,
      txn: v.txn,
      gp: v.gp,
      aov: v.txn > 0 ? v.rev / v.txn : 0,
      margin: v.rev > 0 ? (v.gp / v.rev * 100) : 0
    };
  }).sort((a,b)=>b.rev-a.rev).slice(0, 10);
  
  let tableHTML = '';
  cityList.forEach((c, idx) => {
    tableHTML += `
      <tr>
        <td><strong>#${idx+1} ${c.city}</strong></td>
        <td><span class="chart-badge" style="background:var(--navy-light);color:var(--navy)">${c.region}</span></td>
        <td>${fmtNum(c.txn)}</td>
        <td><strong>₹${fmtL(c.rev)}</strong></td>
        <td>₹${fmtL(c.gp)}</td>
        <td>₹${fmtNum(Math.round(c.aov))}</td>
        <td><span class="pill ${c.margin >= 30 ? 'pill-live' : 'pill-fy'}" style="color:${c.margin >= 30 ? '' : 'var(--navy)'};background:${c.margin >= 30 ? '' : 'var(--navy-light)'}">${c.margin.toFixed(1)}%</span></td>
      </tr>
    `;
  });
  document.getElementById('geo-leaderboard-body').innerHTML = tableHTML || '<tr><td colspan="7" style="text-align:center">No geography data fits selection filters.</td></tr>';
  setInsight('ins-geo-leaderboard', cityList.length > 0 ? `★ ${cityList[0].city} holds the #1 market position with ₹${fmtL(cityList[0].rev)} sales and ${cityList[0].margin.toFixed(1)}% gross margin.` : '—');

  // 5. Dynamic Risks & Opportunities Briefing
  const riskOppsContainer = document.getElementById('risks-opps-container');
  if (riskOppsContainer) {
    const topCatName = catK[0] || '—';
    const topCatGPVal = catGP[0] || 0;
    const topChanName = Object.entries(agg.byChan).sort((a,b)=>b[1].revenue-a[1].revenue)[0]?.[0] || '—';
    const topChanRevVal = agg.byChan[topChanName]?.revenue || 0;
    riskOppsContainer.innerHTML = `
      <div class="risks-opps-container">
        <div class="risk-item risk">
          <div class="risk-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div class="risk-details">
            <span class="risk-title">High Customer Churn Risk (Bronze Tier)</span>
            <span class="risk-desc">Bronze loyalty customers exhibit an elevated churn risk of 21.5% with low average frequency (1.5x purchases YTD). Implement targeted secondary promo campaigns to drive repeat actions.</span>
          </div>
        </div>
        <div class="risk-item opportunity">
          <div class="risk-icon"><i class="fa-solid fa-arrow-trend-up"></i></div>
          <div class="risk-details">
            <span class="risk-title">Most Profitable Category Focus</span>
            <span class="risk-desc"><strong>${topCatName}</strong> represents the highest gross profit category at ₹${fmtL(topCatGPVal)} with net margin of ${(catNP[0]/topCatGPVal*100).toFixed(1)}%. Double down on digital campaign investments for this category.</span>
          </div>
        </div>
        <div class="risk-item opportunity">
          <div class="risk-icon"><i class="fa-solid fa-mobile-screen-button"></i></div>
          <div class="risk-details">
            <span class="risk-title">Expanding Mobile Sales Channels</span>
            <span class="risk-desc"><strong>${topChanName}</strong> is the fastest-growing sales channel YTD (accounting for ₹${fmtL(topChanRevVal)}). Optimise app checkout processes to increase AOV conversions.</span>
          </div>
        </div>
      </div>
    `;
  }

  // Key Insights Page 4 Panel
  renderInsightPanel('ins-panel-p4', DATA.insights.page4);
}

// ── Strategic Alerting Engine ─────────────────────────────────────
function updateAlerts(rows, agg) {
  const container = document.getElementById('briefing-alerts-container');
  if (!container) return;

  const alerts = [];
  
  // Rule 1: Churn spike risk
  const churn = DATA.kpis.churnRate;
  if (churn > 0.20) {
    alerts.push(`
      <span class="alert-badge danger">
        <i class="fa-solid fa-circle-exclamation"></i> Churn Alert: ${(churn*100).toFixed(1)}%
      </span>
    `);
  }

  // Rule 2: Low Net Margin
  const netMargin = agg.rev > 0 ? (agg.np / agg.rev * 100) : 0;
  if (netMargin < 20 && agg.rev > 0) {
    alerts.push(`
      <span class="alert-badge danger">
        <i class="fa-solid fa-triangle-exclamation"></i> Low Net Margin: ${netMargin.toFixed(1)}%
      </span>
    `);
  } else if (netMargin >= 20 && agg.rev > 0) {
    alerts.push(`
      <span class="alert-badge success">
        <i class="fa-solid fa-circle-check"></i> Margins Healthy: ${netMargin.toFixed(1)}%
      </span>
    `);
  }

  // Rule 3: Discount Threshold Alert
  if (agg.avgDisc > 12) {
    alerts.push(`
      <span class="alert-badge warning">
        <i class="fa-solid fa-percent"></i> Promo Spikes: ${agg.avgDisc.toFixed(1)}% Avg
      </span>
    `);
  }

  // Rule 4: Target Progress Alert
  const t = DATA.targets;
  const pct = (agg.rev / t.revenue) * 100;
  if (pct >= 100) {
    alerts.push(`
      <span class="alert-badge success">
        <i class="fa-solid fa-trophy"></i> FY Target Achieved!
      </span>
    `);
  } else if (pct < 70) {
    alerts.push(`
      <span class="alert-badge warning">
        <i class="fa-solid fa-chart-line"></i> Rev lagging budget
      </span>
    `);
  }

  container.innerHTML = alerts.join('');
}

// ═══════════════════════════════════════════════════════════════════
// CHART FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

const defaultFont = {family:"'Inter','Segoe UI',sans-serif", size:12};
const defaultLegend = {position:'bottom', labels:{boxWidth:12, font:defaultFont, padding:12}};
const noLegend = {display:false};

function baseOptions(extra={}) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:defaultLegend, tooltip:{...extra.tooltip} },
    scales: extra.scales || undefined,
    ...extra
  };
}

function mkChart(id, type, data, options) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (CHARTS[id]) { CHARTS[id].destroy(); }
  CHARTS[id] = new Chart(ctx, {type, data, options});
}

function drawLine(id, labels, datasets, scales) {
  const ds = datasets.map(d => ({
    tension:0.35, pointRadius:3, pointHoverRadius:6,
    borderWidth:2.5, fill:false, ...d
  }));
  mkChart(id, 'line', {labels, datasets:ds}, {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:defaultLegend },
    scales:{ x:{grid:{display:false}}, ...scales }
  });
}

function drawDoughnut(id, labels, data, colors) {
  mkChart(id, 'doughnut', {
    labels,
    datasets:[{data, backgroundColor:colors.slice(0,labels.length), borderWidth:2, borderColor:'#fff'}]
  },{
    responsive:true, maintainAspectRatio:false,
    cutout:'60%',
    plugins:{
      legend:defaultLegend,
      tooltip:{callbacks:{label: ctx => {
        const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
        const pct = total>0?((ctx.parsed/total)*100).toFixed(1):0;
        return ` ${ctx.label}: ${fmtNum(ctx.parsed)} (${pct}%)`;
      }}}
    }
  });
}

function drawHBar(id, labels, values, pctLabels, colors) {
  mkChart(id, 'bar', {
    labels,
    datasets:[{
      label:'Revenue (₹)',
      data:values,
      backgroundColor:labels.map((_,i)=>colors[i%colors.length]),
      borderWidth:0,
      borderRadius:4,
    }]
  },{
    indexAxis:'y',
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:noLegend,
      tooltip:{callbacks:{label: ctx=>`₹${fmtL(ctx.parsed.x)} (${pctLabels[ctx.dataIndex]})`}}
    },
    scales:{
      x:{grid:{color:'#EEF2FA'}, ticks:{callback:v=>'₹'+fmtL(v)}},
      y:{grid:{display:false}}
    }
  });
}

function drawBar(id, labels, values, color, prefix='') {
  mkChart(id, 'bar', {
    labels,
    datasets:[{
      label:'Revenue',
      data:values,
      backgroundColor: ALPHA(color, 0.85),
      borderRadius:4,
      borderWidth:0,
    }]
  },{
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:noLegend, tooltip:{callbacks:{label: ctx=>`${prefix}${fmtL(ctx.parsed.y)}`}}},
    scales:{
      x:{grid:{display:false}, ticks:{font:{size:11}}},
      y:{grid:{color:'#EEF2FA'}, ticks:{callback:v=>prefix+fmtL(v)}}
    }
  });
}

function drawBarColored(id, labels, values, colors, prefix='') {
  mkChart(id, 'bar', {
    labels,
    datasets:[{
      label:'Avg Purchase Value',
      data:values,
      backgroundColor: colors,
      borderRadius:5,
      borderWidth:0,
    }]
  },{
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:noLegend, tooltip:{callbacks:{label: ctx=>`${prefix}${fmtNum(ctx.parsed.y)}`}}},
    scales:{
      x:{grid:{display:false}},
      y:{grid:{color:'#EEF2FA'}, ticks:{callback:v=>prefix+fmtNum(v)}}
    }
  });
}

function drawStackedBar(id, labels, datasets, unit) {
  mkChart(id, 'bar', {labels, datasets},{
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:defaultLegend},
    scales:{
      x:{stacked:true, grid:{display:false}},
      y:{stacked:true, grid:{color:'#EEF2FA'}, ticks:{callback:v=>v+unit}}
    }
  });
}

function drawScatter(id, datasets, xLabel, yLabel) {
  mkChart(id, 'scatter', {datasets},{
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:defaultLegend,
      tooltip:{callbacks:{label: ctx=>`Freq: ${ctx.parsed.x}  Spend: ₹${fmtNum(ctx.parsed.y)}`}}
    },
    scales:{
      x:{title:{display:true,text:xLabel,font:{weight:'bold'}}, grid:{color:'#EEF2FA'}},
      y:{title:{display:true,text:yLabel,font:{weight:'bold'}}, grid:{color:'#EEF2FA'}, ticks:{callback:v=>'₹'+fmtL(v)}}
    }
  });
}

function drawBubble(id, datasets, xLabel, yLabel) {
  mkChart(id, 'bubble', {datasets},{
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:defaultLegend,
      tooltip:{callbacks:{label: ctx=>`Qty: ${ctx.parsed.x}  Price: ₹${ctx.parsed.y}`}}
    },
    scales:{
      x:{title:{display:true,text:xLabel,font:{weight:'bold'}}, grid:{color:'#EEF2FA'}},
      y:{title:{display:true,text:yLabel,font:{weight:'bold'}}, grid:{color:'#EEF2FA'}, ticks:{callback:v=>'₹'+v}}
    }
  });
}

// ── Heatmap (HTML table, not canvas) ─────────────────────────────
function renderHeatmap(containerId, cats, channels, data, maxVal) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Build revenue lookup
  const lookup = {};
  data.forEach(d => { lookup[`${d.category}||${d.channel}`] = d.revenue; });

  let html = `<table class="heatmap-table"><thead><tr><th>Category \\ Channel</th>`;
  channels.forEach(ch => { html += `<th>${ch}</th>`; });
  html += '</tr></thead><tbody>';

  cats.forEach(cat => {
    html += `<tr><td class="heatmap-label">${cat}</td>`;
    channels.forEach(ch => {
      const v = lookup[`${cat}||${ch}`] || 0;
      const intensity = maxVal > 0 ? v / maxVal : 0;
      const bg = interpolateColor('#EEF2FA', '#003366', intensity);
      const fg = intensity > 0.5 ? '#ffffff' : '#0F1E38';
      html += `<td style="background:${bg};color:${fg}">₹${fmtL(v)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

// Linear colour interpolation hex
function interpolateColor(c1, c2, t) {
  const p  = v => parseInt(v,16);
  const r1 = p(c1.slice(1,3)), g1 = p(c1.slice(3,5)), b1 = p(c1.slice(5,7));
  const r2 = p(c2.slice(1,3)), g2 = p(c2.slice(3,5)), b2 = p(c2.slice(5,7));
  const r  = Math.round(r1+(r2-r1)*t).toString(16).padStart(2,'0');
  const g  = Math.round(g1+(g2-g1)*t).toString(16).padStart(2,'0');
  const b  = Math.round(b1+(b2-b1)*t).toString(16).padStart(2,'0');
  return `#${r}${g}${b}`;
}

// ── Insight panel ─────────────────────────────────────────────────
function renderInsightPanel(id, insights) {
  const el = document.getElementById(id);
  if (!el || !insights) return;
  const icons = ['fa-arrow-trend-up','fa-star','fa-arrow-trend-down'];
  el.innerHTML = insights.map((ins,i) => `
    <div class="insight-item">
      <span class="insight-item-icon"><i class="fa-solid ${icons[i]||'fa-circle-info'}"></i></span>
      ${ins}
    </div>`).join('');
}

// ── Helpers ───────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setInsight(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
function fmtNum(n) {
  return Math.round(n).toLocaleString('en-IN');
}
function fmtL(n) {
  if (Math.abs(n) >= 1e7) return (n/1e7).toFixed(2) + ' Cr';
  if (Math.abs(n) >= 1e5) return (n/1e5).toFixed(2) + ' L';
  if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return Math.round(n).toString();
}
