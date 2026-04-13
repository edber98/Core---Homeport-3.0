import { simulate, defaultParams } from './sim.js';
import { ZoomPanCanvas } from './zoompan.js';
import { buildLineChart, buildStackedBarChart, buildMultiLineChart, downloadChartPng } from './chart-setup.js';
import { formatEuro } from './utils.js';
import { exportMonthlyCsv, exportAnnualCsv, exportConsultantsCsv, exportPoolCsv } from './export.js';

let currentSim = null;
let charts = {};
const els = {};
let uiParams = { ...defaultParams };
let vizDesiredH = 480;
let layoutState = { left: '1fr', right: '480px' };

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function bindUI(){
  els.seed = qs('#seed');
  els.startDate = qs('#startDate');
  els.monthsTotal = qs('#monthsTotal');
  els.runSim = qs('#runSim');
  els.openParams = qs('#openParams');
  els.monthSlider = qs('#monthSlider');
  els.monthLabel = qs('#monthLabel');
  els.kpiConsultants = qs('#kpiConsultants');
  els.kpiClients = qs('#kpiClients');
  els.kpiPool = qs('#kpiPool');
  els.kpiRevenue = qs('#kpiRevenue');
  els.tblAnnual = qs('#tblAnnual tbody');
  els.tblMonthly = qs('#tblMonthly tbody');
  els.tblConsultants = qs('#tblConsultants tbody');
  els.tblPool = qs('#tblPool tbody');
  els.modal = qs('#modal');
  els.modalBody = qs('#modalBody');
  els.modalClose = qs('.modalClose');

  els.runSim.addEventListener('click', runSimulation);
  els.monthSlider.addEventListener('input', ()=> renderMonth(Number(els.monthSlider.value)));
  els.modalClose.addEventListener('click', ()=> els.modal.classList.add('hidden'));
  els.modal.addEventListener('click', (e)=>{ if (e.target === els.modal) els.modal.classList.add('hidden'); });
  els.openParams.addEventListener('click', openParamsModal);
  qs('#expandViz').addEventListener('click', ()=> expandCard('#vizPaneWrap'));
  qs('#expandSide').addEventListener('click', ()=> expandCard('.sidePane'));

  qsa('.tabBtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      qsa('.tabBtn').forEach(b=>b.classList.remove('active'));
      qsa('.tabContent').forEach(t=>t.classList.remove('active'));
      btn.classList.add('active');
      qs(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Export buttons
  qs('#exportMonthlyCsv').addEventListener('click', ()=> currentSim && exportMonthlyCsv(currentSim));
  qs('#exportAnnualCsv').addEventListener('click', ()=> currentSim && exportAnnualCsv(currentSim));
  qs('#exportConsultantsCsv').addEventListener('click', ()=> currentSim && exportConsultantsCsv(currentSim, Number(els.monthSlider.value)) );
  qs('#exportPoolCsv').addEventListener('click', ()=> currentSim && exportPoolCsv(currentSim, Number(els.monthSlider.value)) );

  // Chart PNG buttons
  qsa('.chartBox button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-dl');
      if (charts[id]) downloadChartPng(charts[id], `${id}.png`);
    });
  });

  // Page nav
  qsa('.topnav button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const page = b.dataset.page;
      qsa('main.page').forEach(p=> p.style.display = 'none');
      qs(`#page-${page}`).style.display = '';
      if (page === 'dashboard') resizeCanvas();
      if (page === 'analytics') ensureAnalyticsCharts();
    });
  });
  qs('#openParams2').addEventListener('click', openParamsModal);

  // Grid resizer
  const divider = qs('#gridResizer');
  if (divider){
    let dragging = false; let startX=0; let leftStart=0; let rightStart=0;
    divider.addEventListener('mousedown', (e)=>{ dragging=true; startX=e.clientX; document.body.style.userSelect='none'; });
    window.addEventListener('mouseup', ()=>{ dragging=false; document.body.style.userSelect=''; });
    window.addEventListener('mousemove', (e)=>{
      if (!dragging) return;
      const container = qs('#page-dashboard');
      const rect = container.getBoundingClientRect();
      const rel = Math.min(Math.max(e.clientX - rect.left, 300), rect.width - 320);
      const left = Math.max(300, rel - 8);
      const right = Math.max(360, rect.width - rel - 8);
      container.style.setProperty('--left-col', left + 'px');
      container.style.setProperty('--right-col', right + 'px');
      layoutState.left = left + 'px'; layoutState.right = right + 'px';
      resizeCanvas();
    });
  }
}

// Visualization
const canvas = document.getElementById('viz');
const zc = new ZoomPanCanvas(canvas);
let clickableNodes = [];

zc.onChange = ()=> drawViz();

function layoutConsultants(cons){
  // Simple grid layout
  const cols = Math.ceil(Math.sqrt(cons.length));
  const gap = 40;
  const cell = 160;
  const nodes = [];
  cons.forEach((c, i)=>{
    const r = Math.floor(i / cols);
    const col = i % cols;
    const x = col * (cell + gap);
    const y = r * (cell + gap);
    nodes.push({ id: c.id, x, y, data: c });
  });
  // pool area at bottom
  const heightRows = Math.ceil(cons.length / cols);
  const poolY = heightRows * (cell + gap) + 40;
  return { nodes, poolOrigin: {x:0, y:poolY}, cell, gap };
}

let layoutCache = null;
let selectedConsultantId = null;

function drawViz(){
  if (!currentSim) return;
  const m = Number(els.monthSlider.value);
  const snap = currentSim.cacheByMonth[m];
  const ctx = zc.ctx;
  zc.clear();
  zc.withTransform(()=>{
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-200,-200,5000,5000);

    const cons = snap.consultants.slice().sort((a,b)=> b.clientsCount - a.clientsCount);
    layoutCache = layoutConsultants(cons);
    clickableNodes = [];
    const baseR = 24;
    const maxClients = Math.max(1, cons[0]?.clientsCount || 1);
    const scaleR = (cnt)=> baseR + 2.2 * Math.sqrt(cnt);

    for (const n of layoutCache.nodes){
      const c = n.data;
      const radius = scaleR(c.clientsCount);
      const isSelected = c.id === selectedConsultantId;
      // halo
      ctx.beginPath(); ctx.arc(n.x, n.y, radius+8, 0, Math.PI*2);
      ctx.fillStyle = isSelected ? 'rgba(37,99,235,0.18)' : 'rgba(2,6,23,0.05)';
      ctx.fill();
      // body
      ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI*2);
      ctx.fillStyle = c.isActive ? '#22c55e' : '#94a3b8';
      ctx.fill();
      // label
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const statusTxt = c.isActive ? '' : ' • sorti';
      ctx.fillText(`#${c.id} • ${c.clientsCount} clients${statusTxt}`, n.x, n.y + radius + 14);
      // inner client dots (limit for perf)
      const dots = Math.min(c.clientsCount, 120);
      const cols = Math.ceil(Math.sqrt(dots));
      const spacing = Math.min(10, radius*1.3/cols);
      const startX = n.x - (cols-1)*spacing/2;
      const startY = n.y + radius*0.2; // lower half
      ctx.fillStyle = '#1f2937';
      for (let i=0;i<dots;i++){
        const r = Math.floor(i/cols), col = i%cols;
        ctx.fillRect(startX + col*spacing - 1, startY + r*spacing - 1, 2, 2);
      }
      clickableNodes.push({ x:n.x, y:n.y, r: radius, id: c.id });
    }

    // Pool area
    const pool = snap.pool;
    const poolX = layoutCache.poolOrigin.x; const poolY = layoutCache.poolOrigin.y;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(poolX-20, poolY-30, 700, 220);
    ctx.strokeStyle = '#e2e8f0'; ctx.strokeRect(poolX-20, poolY-30, 700, 220);
    ctx.fillStyle = '#334155';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Pool actifs (${pool.length})`, poolX, poolY-40);
    ctx.fillStyle = '#60a5fa';
    const maxDots = Math.min(pool.length, 1000);
    const colsPool = 40; const spacing = 14;
    for (let i=0;i<maxDots;i++){
      const r = Math.floor(i/colsPool), col = i%colsPool;
      ctx.fillRect(poolX + col*spacing, poolY + r*spacing, 3, 3);
    }
  });
}

canvas.addEventListener('click', (e)=>{
  if (!layoutCache) return;
  const rect = canvas.getBoundingClientRect();
  const p = zc.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  for (const n of clickableNodes){
    const dx = p.x - n.x, dy = p.y - n.y;
    if (dx*dx + dy*dy <= n.r*n.r){ selectedConsultantId = n.id; buildConsultantDetails(); drawViz(); return; }
  }
});

function openConsultantModal(id){
  const m = Number(els.monthSlider.value);
  const snap = currentSim.cacheByMonth[m];
  const c = snap.consultants.find(x=>x.id===id);
  if (!c) return;
  els.modalBody.innerHTML = `
    <h2>Consultant #${c.id} <span class="pill">${c.isActive?'Actif':'Sorti'}</span></h2>
    <div class="muted">Origin: ${c.origin}${c.referrerId?` • referrer #${c.referrerId}`:''}</div>
    <p>Créé au mois ${c.createdMonthIndex}${c.createdReason?` • Raison: ${c.createdReason}`:''}.</p>
    <ul>
      <li>Clients actifs: <b>${c.clientsCount}</b></li>
      <li>Projets gagnés: <b>${c.projectsWon}</b></li>
      <li>Exit: ${c.exitMonthIndex!=null?`M${c.exitMonthIndex}`:'—'}</li>
    </ul>
    <p class="muted">Pourquoi j’ai eu autant de consultants: ROCO déclenche un nouveau consultant tous les ${currentSim.params.projectsPerReferral} projets gagnés, conversion ${Math.round(currentSim.params.referralConv*100)}%.</p>
  `;
  els.modal.classList.remove('hidden');
}

function buildTablesAndCharts(){
  if (!currentSim) return;
  const sim = currentSim;
  els.tblAnnual.innerHTML = sim.annual.map(a=>`
    <tr data-year="${a.year}"><td>${a.year}</td><td>${a.newConsultants}</td><td>${a.baseRecruits}</td><td>${a.rocoRecruits}</td><td>${a.avgClientsPerConsultantEnd.toFixed(2)}</td></tr>
  `).join('');
  // Year modal
  els.tblAnnual.querySelectorAll('tr').forEach(tr=>{
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', ()=>{
      const y = tr.getAttribute('data-year');
      const row = sim.annual.find(r=>String(r.year)===String(y));
      els.modalBody.innerHTML = `
        <h2>Année ${row.year}</h2>
        <p>Nouveaux consultants: <b>${row.newConsultants}</b></p>
        <p>BASE recruits: <b>${row.baseRecruits}</b> • ROCO recruits: <b>${row.rocoRecruits}</b></p>
        <p class="muted">Explication: BASE est lissé mensuellement (croissance ${Math.round(sim.params.recruitGrowthPct*100)}%). ROCO découle des projets gagnés selon le seuil ${sim.params.projectsPerReferral} et conversion ${Math.round(sim.params.referralConv*100)}%.</p>
      `;
      els.modal.classList.remove('hidden');
    });
  });

  els.tblMonthly.innerHTML = sim.monthly.map(r=>`
    <tr><td>${r.ym}</td><td>${r.activeConsultants}</td><td>${r.activeAttachedClients}</td><td>${r.poolActive}</td><td>${Math.round(r.revenue)}</td><td>${r.baseRecruitsAdded}</td><td>${r.rocoRecruitsAdded}</td></tr>
  `).join('');

  // Big tables
  const tbodyMonthlyBig = qs('#tblMonthlyBig tbody');
  if (tbodyMonthlyBig){
    tbodyMonthlyBig.innerHTML = sim.monthly.map(r=>`
      <tr>
        <td>${r.ym}</td><td>${r.activeConsultants}</td><td>${r.activeAttachedClients}</td><td>${r.poolActive}</td><td>${Math.round(r.revenue)}</td>
        <td>${r.baseRecruitsAdded}</td><td>${r.rocoRecruitsAdded}</td><td>${r.consultantsExited}</td>
        <td>${r.clientsGained}</td><td>${r.clientsLostAttachedChurn}</td><td>${r.clientsLostExitWith + r.clientsLostExitPartial}</td><td>${r.clientsToPoolFromExit}</td><td>${r.poolChurned}</td>
      </tr>
    `).join('');
  }
  const tbodyAnnualBig = qs('#tblAnnualBig tbody');
  if (tbodyAnnualBig){
    tbodyAnnualBig.innerHTML = sim.annual.map(a=>`
      <tr><td>${a.year}</td><td>${a.newConsultants}</td><td>${a.baseRecruits}</td><td>${a.rocoRecruits}</td><td>${a.avgClientsPerConsultantEnd.toFixed(2)}</td></tr>
    `).join('');
  }

  // Charts
  charts.chartConsultants?.destroy();
  charts.chartClients?.destroy();
  charts.chartPool?.destroy();
  charts.chartRevenue?.destroy();
  const labels = sim.monthly.map(r=>r.ym);
  charts.chartConsultants = buildLineChart(qs('#chartConsultants'), 'Consultants actifs', labels, sim.monthly.map(r=>r.activeConsultants), '#66e0a3');
  charts.chartClients = buildLineChart(qs('#chartClients'), 'Clients attachés', labels, sim.monthly.map(r=>r.activeAttachedClients), '#ffd56a');
  charts.chartPool = buildLineChart(qs('#chartPool'), 'Pool', labels, sim.monthly.map(r=>r.poolActive), '#6ac9ff');
  charts.chartRevenue = buildLineChart(qs('#chartRevenue'), 'Revenu', labels, sim.monthly.map(r=>Math.round(r.revenue)), '#ff6a88');

  // Analytics page charts (if mounted)
  ensureAnalyticsCharts();
}

function renderMonth(m){
  const snap = currentSim.cacheByMonth[m];
  els.monthLabel.textContent = `${snap.ym} (M${m})`;
  els.kpiConsultants.textContent = snap.metrics.activeConsultants;
  els.kpiClients.textContent = snap.metrics.activeAttachedClients;
  els.kpiPool.textContent = snap.metrics.poolActive;
  els.kpiRevenue.textContent = formatEuro(snap.metrics.revenue);

  // Consultants table small page (current)
  els.tblConsultants.innerHTML = snap.consultants.slice(0,2000).map(c=>`
    <tr><td>${c.id}</td><td>${c.origin}</td><td>${c.referrerId??''}</td><td>${c.createdMonthIndex}</td><td>${c.isActive?1:0}</td><td>${c.clientsCount}</td><td>${c.projectsWon}</td><td>${c.rocoCreatedTotal}</td><td>${c.churnedByConsultant}</td><td>${c.lostAtExit}</td><td>${c.transferredToPool}</td></tr>
  `).join('');
  els.tblPool.innerHTML = snap.pool.slice(0,3000).map(p=>`
    <tr><td>${p.id}</td><td>${p.originConsultantId??''}</td><td>${p.poolStartMonthIndex??''}</td><td>${p.poolFromConsultantExitMonth??''}</td></tr>
  `).join('');
  // Select row click
  els.tblConsultants.querySelectorAll('tr').forEach(tr=>{
    tr.style.cursor='pointer';
    tr.addEventListener('click', ()=>{ const id = Number(tr.children[0].textContent); selectedConsultantId = id; buildConsultantDetails(); });
  });

  if (selectedConsultantId!=null) buildConsultantDetails();

  drawViz();
}

function runSimulation(){
  // Compose params from base + UI overrides
  uiParams.startDate = els.startDate.value;
  uiParams.monthsTotal = Number(els.monthsTotal.value);
  uiParams.seed = String(els.seed.value || 'i55-demo');
  currentSim = simulate(uiParams); // one-pass déterministe
  els.monthSlider.max = String(currentSim.months.length - 1);
  els.monthSlider.value = '0';
  buildTablesAndCharts();
  renderMonth(0);
}

// Init
bindUI();
runSimulation();

// Canvas responsive sizing
function resizeCanvas(height=vizDesiredH){
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth * dpr;
  const h = height * dpr;
  canvas.width = Math.max(1, Math.floor(w));
  canvas.height = Math.max(1, Math.floor(h));
  canvas.style.height = height + 'px';
  drawViz();
}
window.addEventListener('resize', ()=> resizeCanvas());
// Wrap viz pane for expand
const vizPaneWrap = document.createElement('div');
vizPaneWrap.id = 'vizPaneWrap';
const vizPane = document.querySelector('.vizPane');
vizPane.parentNode.replaceChild(vizPaneWrap, vizPane);
vizPaneWrap.appendChild(vizPane);
resizeCanvas();

// Expand/Modal helpers
let expanded = { target:null, placeholder:null };
function expandCard(selector){
  const el = document.querySelector(selector === '#vizPaneWrap' ? '#vizPaneWrap' : selector);
  if (!el) return;
  if (!els.modal.classList.contains('hidden')) return; // already open
  expanded.placeholder = document.createElement('div');
  expanded.placeholder.style.display = 'none';
  el.parentNode.insertBefore(expanded.placeholder, el);
  els.modalBody.innerHTML = '';
  els.modalBody.appendChild(el);
  els.modal.classList.remove('hidden');
  expanded.target = el;
  if (selector === '#vizPaneWrap'){ vizDesiredH = 700; resizeCanvas(700); }
}
els.modalClose.addEventListener('click', restoreExpanded);
els.modal.addEventListener('click', (e)=>{ if (e.target === els.modal) restoreExpanded(); });
function restoreExpanded(){
  if (expanded.target){
    expanded.placeholder.parentNode.replaceChild(expanded.target, expanded.placeholder);
    expanded.target = null; expanded.placeholder = null;
    vizDesiredH = 480; resizeCanvas(480);
  }
}

// Params modal
function openParamsModal(){
  const tpl = document.getElementById('paramsTemplate');
  els.modalBody.innerHTML = '';
  els.modalBody.appendChild(tpl.content.cloneNode(true));
  // Prefill from uiParams
  const setVal = (id, val)=>{ const el = document.getElementById(id); if (el) el.value = val; };
  setVal('p_startConsultants', uiParams.startConsultants);
  setVal('p_recruitsPerYear', uiParams.recruitsPerYear);
  setVal('p_recruitGrowthPct', Math.round(uiParams.recruitGrowthPct*100));
  setVal('p_rampMonths', uiParams.rampMonths);
  setVal('p_activityMean', uiParams.activityMean);
  setVal('p_minClientsPerMonth', uiParams.minClientsPerMonth);
  setVal('p_maxClientsPerMonth', uiParams.maxClientsPerMonth);
  setVal('p_maxPortfolio', uiParams.maxPortfolio);
  setVal('p_clientChurnPct', Math.round(uiParams.clientChurnPct*1000)/10);
  setVal('p_poolChurnMultiplier', uiParams.poolChurnMultiplier);
  setVal('p_consultantChurnPct', Math.round(uiParams.consultantChurnPct*1000)/10);
  setVal('p_leaveWithClientsPct', Math.round(uiParams.leaveWithClientsPct*100));
  setVal('p_partialRetentionPct', Math.round(uiParams.partialRetentionPct*100));
  setVal('p_partialRetentionShare', uiParams.partialRetentionShare);
  setVal('p_projectsPerReferral', uiParams.projectsPerReferral);
  setVal('p_referralConv', uiParams.referralConv);
  setVal('p_marketplacePct', Math.round(uiParams.marketplacePct*100));
  setVal('p_marketplaceEurPerClient', uiParams.marketplaceEurPerClient);
  // Bind buttons
  document.getElementById('paramsCancel').addEventListener('click', ()=> els.modal.classList.add('hidden'));
  document.getElementById('paramsApply').addEventListener('click', ()=>{
    const gv = (id)=> Number(document.getElementById(id).value);
    uiParams.startConsultants = gv('p_startConsultants');
    uiParams.recruitsPerYear = gv('p_recruitsPerYear');
    uiParams.recruitGrowthPct = gv('p_recruitGrowthPct')/100;
    uiParams.rampMonths = gv('p_rampMonths');
    uiParams.activityMean = Number(document.getElementById('p_activityMean').value);
    uiParams.minClientsPerMonth = gv('p_minClientsPerMonth');
    uiParams.maxClientsPerMonth = gv('p_maxClientsPerMonth');
    uiParams.maxPortfolio = gv('p_maxPortfolio');
    uiParams.clientChurnPct = gv('p_clientChurnPct')/100;
    uiParams.poolChurnMultiplier = Number(document.getElementById('p_poolChurnMultiplier').value);
    uiParams.consultantChurnPct = gv('p_consultantChurnPct')/100;
    uiParams.leaveWithClientsPct = gv('p_leaveWithClientsPct')/100;
    uiParams.partialRetentionPct = gv('p_partialRetentionPct')/100;
    uiParams.partialRetentionShare = Number(document.getElementById('p_partialRetentionShare').value);
    uiParams.projectsPerReferral = gv('p_projectsPerReferral');
    uiParams.referralConv = Number(document.getElementById('p_referralConv').value);
    uiParams.marketplacePct = gv('p_marketplacePct')/100;
    uiParams.marketplaceEurPerClient = gv('p_marketplaceEurPerClient');
    els.modal.classList.add('hidden');
    runSimulation();
  });
  els.modal.classList.remove('hidden');
}

function ensureAnalyticsCharts(){
  if (!currentSim) return;
  const sim = currentSim; const labels = sim.monthly.map(r=>r.ym);
  // Recruits stacked
  const c1 = document.getElementById('chartRecruits');
  if (c1){
    charts.chartRecruits?.destroy();
    charts.chartRecruits = buildStackedBarChart(c1, labels, [
      { label:'Base', data: sim.monthly.map(r=>r.baseRecruitsAdded), backgroundColor:'#60a5fa' },
      { label:'ROCO', data: sim.monthly.map(r=>r.rocoRecruitsAdded), backgroundColor:'#22c55e' },
    ]);
  }
  // Avg clients per consultant
  const c2 = document.getElementById('chartAvgClients');
  if (c2){
    charts.chartAvgClients?.destroy();
    charts.chartAvgClients = buildLineChart(c2, 'Moy. clients / consultant', labels, sim.monthly.map(r=> r.activeConsultants ? (r.activeAttachedClients / r.activeConsultants) : 0), '#f59e0b');
  }
  // Gain vs Loss
  const c3 = document.getElementById('chartGainLoss');
  if (c3){
    charts.chartGainLoss?.destroy();
    charts.chartGainLoss = buildMultiLineChart(c3, labels, [
      { label:'Acquis', data: sim.monthly.map(r=>r.clientsGained), borderColor:'#16a34a' },
      { label:'Perdus (attachés)', data: sim.monthly.map(r=>r.clientsLostAttachedChurn + r.clientsLostExitWith + r.clientsLostExitPartial), borderColor:'#dc2626' },
      { label:'Pool churn', data: sim.monthly.map(r=>r.poolChurned), borderColor:'#64748b' },
    ]);
  }
  // Consultant exits
  const c4 = document.getElementById('chartConsultantExits');
  if (c4){
    charts.chartConsultantExits?.destroy();
    charts.chartConsultantExits = buildLineChart(c4, 'Exits consultants', labels, sim.monthly.map(r=>r.consultantsExited), '#0ea5e9');
  }
}

function buildConsultantDetails(){
  if (!currentSim || selectedConsultantId==null) { const title=qs('#selConsultantTitle'); if (title) title.textContent='—'; return; }
  const m = Number(els.monthSlider.value);
  const id = selectedConsultantId;
  const snap = currentSim.cacheByMonth[m];
  const cons = snap.consultants.find(c=>c.id===id);
  const title = qs('#selConsultantTitle'); if (!cons || !title) return;
  title.textContent = `#${id} (${cons.isActive?'Actif':'Sorti'})`;
  const overview = qs('#cPane-overview');
  if (overview){
    overview.innerHTML = `
      <div class="details" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="kv"><div class="k">Origine</div><div class="v">${cons.origin}${cons.referrerId?` (ref #${cons.referrerId})`:''}</div></div>
        <div class="kv"><div class="k">Créé (M)</div><div class="v">${cons.createdMonthIndex}</div></div>
        <div class="kv"><div class="k">Exit (M)</div><div class="v">${cons.exitMonthIndex??'—'}</div></div>
        <div class="kv"><div class="k">Clients actifs</div><div class="v">${cons.clientsCount}</div></div>
        <div class="kv"><div class="k">Projets gagnés</div><div class="v">${cons.projectsWon}</div></div>
        <div class="kv"><div class="k">ROCO créés</div><div class="v">${cons.rocoCreatedTotal}</div></div>
        <div class="kv"><div class="k">Churn attachés</div><div class="v">${cons.churnedByConsultant}</div></div>
        <div class="kv"><div class="k">Perdus à la sortie</div><div class="v">${cons.lostAtExit}</div></div>
        <div class="kv"><div class="k">Vers pool (sortie)</div><div class="v">${cons.transferredToPool}</div></div>
      </div>`;
  }
  // Build lists
  const clients = currentSim.clientsAll || [];
  const active = clients.filter(c=> c.attachedConsultantId===id && c.startMonthIndex<=m && (c.endMonthIndex==null || c.endMonthIndex>m));
  const pool = clients.filter(c=> c.poolStartMonthIndex!=null && c.poolFromConsultantId===id && c.poolStartMonthIndex<=m && (c.endMonthIndex==null || c.endMonthIndex>m));
  const churn = clients.filter(c=> c.originConsultantId===id && c.endMonthIndex!=null && c.endMonthIndex<=m);
  const tbA = qs('#tblCActive tbody'); if (tbA) tbA.innerHTML = active.slice(0,2000).map(c=>`<tr><td>${c.id}</td><td>${c.startMonthIndex}</td></tr>`).join('');
  const tbP = qs('#tblCPool tbody'); if (tbP) tbP.innerHTML = pool.slice(0,2000).map(c=>`<tr><td>${c.id}</td><td>${c.poolStartMonthIndex}</td></tr>`).join('');
  const tbC = qs('#tblCChurn tbody'); if (tbC) tbC.innerHTML = churn.slice(0,2000).map(c=>`<tr><td>${c.id}</td><td>${c.endMonthIndex}</td><td>${c.endReason}</td></tr>`).join('');
  const btnWhy = qs('#btnWhy'); if (btnWhy) btnWhy.onclick = ()=> openConsultantModal(id);
  // Consultant tabs handlers
  ['#cTabOverview','#cTabActive','#cTabPool','#cTabChurn'].forEach(sel=>{
    const b = qs(sel); if (!b) return; b.onclick = ()=>{
      ['overview','active','pool','churn'].forEach(t=> qs(`#cPane-${t}`).style.display='none');
      const key = b.dataset.ctab; qs(`#cPane-${key}`).style.display='';
      ['#cTabOverview','#cTabActive','#cTabPool','#cTabChurn'].forEach(s=> qs(s)?.classList.remove('active'));
      b.classList.add('active');
    };
  });
}
