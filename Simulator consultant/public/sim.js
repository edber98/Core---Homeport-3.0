import { Random, indexToYM } from './utils.js';

export const defaultParams = {
  startDate: '2025-01',
  monthsTotal: 60,
  seed: '123456',
  startConsultants: 1,
  recruitsPerYear: 5,
  recruitGrowthPct: 0.20,
  rampMonths: 2,
  activityMean: 0.70,
  minClientsPerMonth: 0,
  maxClientsPerMonth: 3,
  maxPortfolio: 10,
  clientChurnPct: 0.02,
  poolChurnMultiplier: 0.30,
  consultantChurnPct: 0.025,
  leaveWithClientsPct: 0.55,
  partialRetentionPct: 0.25, // chance branch for partial
  partialRetentionShare: 0.5, // fraction retained as pool in partial scenario
  projectsPerReferral: 5,
  referralConv: 0.70,
  marketplacePct: 0.35,
  marketplaceEurPerClient: 8,
};

export function simulate(userParams={}){
  const p = {...defaultParams, ...userParams};
  const rng = new Random(p.seed);

  // data stores
  let nextConsultantId = 1;
  let nextClientId = 1;
  const consultants = new Map(); // id -> obj
  const clients = new Map(); // id -> obj
  const pool = new Set(); // active clients w/out consultant

  function createConsultant(origin, monthIdx, extra={}){
    const id = nextConsultantId++;
    const c = {
      id,
      origin, // INITIAL | BASE | ROCO
      referrerId: extra.referrerId ?? null,
      createdReason: extra.createdReason ?? null,
      createdMonthIndex: monthIdx,
      exitMonthIndex: null,
      isActive: true,
      projectsWon: 0,
      referralsDone: 0,
      rocoCreatedTotal: 0,
      churnedByConsultant: 0,
      lostAtExit: 0,
      transferredToPool: 0,
      activityBias: Math.min(0.95, Math.max(0.2, p.activityMean + (rng.float(-0.2, 0.2)))),
      clients: new Set(), // active client ids attached
    };
    consultants.set(id, c);
    return c;
  }

  function attachClient(consultant, monthIdx){
    if (!consultant || !consultant.isActive) return null;
    const id = nextClientId++;
    const cl = {
      id,
      isActive: true,
      attachedConsultantId: consultant.id,
      startMonthIndex: monthIdx,
      endMonthIndex: null,
      endReason: null,
      poolStartMonthIndex: null,
      poolFromConsultantId: null,
      poolFromConsultantExitMonth: null,
      originConsultantId: consultant.id,
    };
    clients.set(id, cl);
    consultant.clients.add(id);
    consultant.projectsWon += 1;
    return cl;
  }

  function detachToPool(cl, exitConsultant, exitMonthIdx){
    if (!cl.isActive) return;
    cl.attachedConsultantId = null;
    cl.poolStartMonthIndex = exitMonthIdx;
    cl.poolFromConsultantId = exitConsultant?.id ?? null;
    cl.poolFromConsultantExitMonth = exitMonthIdx;
    pool.add(cl.id);
  }

  function churnClient(cl, monthIdx, reason){
    cl.isActive = false;
    cl.endMonthIndex = monthIdx;
    cl.endReason = reason;
    if (cl.attachedConsultantId){
      const cons = consultants.get(cl.attachedConsultantId);
      cons?.clients.delete(cl.id);
    }
    pool.delete(cl.id);
  }

  // Seed initial consultants
  for (let i=0;i<p.startConsultants;i++){
    createConsultant('INITIAL', 0);
  }

  const months = Array.from({length: p.monthsTotal}, (_,i)=>indexToYM(p.startDate, i));
  const cacheByMonth = [];
  const monthly = [];
  const annualByYear = new Map();

  function yearOf(idx){ return Number(months[idx].slice(0,4)); }

  // Helper for base recruits smoothing
  function baseRecruitsForMonth(monthIdx){
    const yearIdx = yearOf(monthIdx) - yearOf(0);
    const recruitsPerYearEffective = Math.round(p.recruitsPerYear * Math.pow(1 + p.recruitGrowthPct, yearIdx));
    const expectedPerMonth = recruitsPerYearEffective / 12;
    const base = Math.floor(expectedPerMonth);
    const fraction = expectedPerMonth - base;
    const add = rng.chance(fraction) ? 1 : 0;
    return { count: base + add, recruitsPerYearEffective };
  }

  for (let m=0; m<p.monthsTotal; m++){
    const ym = months[m];
    const year = Number(ym.slice(0,4));
    if (!annualByYear.has(year)) annualByYear.set(year, {year, newConsultants:0, baseRecruits:0, rocoRecruits:0, avgClientsPerConsultantEnd:0});
    const annualRow = annualByYear.get(year);

    // Per-month counters
    let clientsGained = 0;
    let clientsLostAttachedChurn = 0;
    let clientsLostExitWith = 0;
    let clientsLostExitPartial = 0;
    let clientsToPoolFromExit = 0;
    let poolChurned = 0;
    let consultantsExited = 0;

    // 1) BASE recruits
    const {count: baseAdds, recruitsPerYearEffective} = baseRecruitsForMonth(m);
    let baseRecruitsAdded = 0;
    let rocoRecruitsAdded = 0;
    for (let i=0;i<baseAdds;i++){
      createConsultant('BASE', m);
      baseRecruitsAdded++;
    }

    // 2) ROCO referrals
    for (const c of consultants.values()){
      if (!c.isActive) continue;
      const shouldHave = Math.floor(c.projectsWon / p.projectsPerReferral);
      const delta = shouldHave - c.referralsDone;
      for (let k=0;k<delta;k++){
        if (rng.chance(p.referralConv)){
          createConsultant('ROCO', m, {referrerId: c.id, createdReason: `ROCO threshold ${p.projectsPerReferral} @projects=${c.projectsWon}`});
          c.rocoCreatedTotal += 1;
          rocoRecruitsAdded++;
        }
        c.referralsDone += 1;
      }
    }

    // 3) Production by consultants
    for (const c of consultants.values()){
      if (!c.isActive) continue;
      const age = m - c.createdMonthIndex;
      if (age < p.rampMonths) continue;
      if (!rng.chance(c.activityBias)) continue;
      const activeCount = c.clients.size;
      const capRemain = Math.max(0, p.maxPortfolio - activeCount);
      if (capRemain <= 0) continue;
      const toAdd = Math.min(capRemain, Math.max(0, rng.int(p.minClientsPerMonth, p.maxClientsPerMonth)));
      for (let i=0;i<toAdd;i++) { attachClient(c, m); clientsGained += 1; }
    }

    // 4) Churn attached clients
    for (const c of consultants.values()){
      if (!c.isActive) continue;
      for (const cid of Array.from(c.clients)){
        const cl = clients.get(cid);
        if (!cl || !cl.isActive) continue;
        if (rng.chance(p.clientChurnPct)){
          churnClient(cl, m, 'CHURN');
          c.churnedByConsultant += 1;
          clientsLostAttachedChurn += 1;
        }
      }
    }

    // 5) Consultant churn (exit)
    for (const c of consultants.values()){
      if (!c.isActive) continue;
      if (rng.chance(p.consultantChurnPct)){
        c.isActive = false;
        c.exitMonthIndex = m;
        consultantsExited += 1;
        const r = rng.next();
        if (r < p.leaveWithClientsPct){
          // all clients leave platform
          for (const cid of Array.from(c.clients)){
            const cl = clients.get(cid);
            if (cl?.isActive) { churnClient(cl, m, 'EXIT_WITH'); c.lostAtExit += 1; clientsLostExitWith += 1; }
          }
          c.clients.clear();
        } else if (r < p.leaveWithClientsPct + p.partialRetentionPct){
          // partial retention to pool
          const ids = Array.from(c.clients);
          const keepToPool = Math.floor(ids.length * p.partialRetentionShare);
          const shuffled = ids.slice();
          rng.shuffle(shuffled);
          const toPool = new Set(shuffled.slice(0, keepToPool));
          for (const cid of ids){
            const cl = clients.get(cid);
            if (!cl?.isActive) continue;
            if (toPool.has(cid)){
              c.clients.delete(cid);
              detachToPool(cl, c, m);
              c.transferredToPool += 1;
              clientsToPoolFromExit += 1;
            } else {
              churnClient(cl, m, 'EXIT_PARTIAL_LEAVE');
              c.lostAtExit += 1;
              clientsLostExitPartial += 1;
            }
          }
        } else {
          // all pass to pool
          for (const cid of Array.from(c.clients)){
            const cl = clients.get(cid);
            if (cl?.isActive){
              c.clients.delete(cid);
              detachToPool(cl, c, m);
              c.transferredToPool += 1;
              clientsToPoolFromExit += 1;
            }
          }
        }
      }
    }

    // 6) Pool churn
    for (const cid of Array.from(pool)){
      const cl = clients.get(cid);
      if (!cl?.isActive) { pool.delete(cid); continue; }
      if (rng.chance(p.clientChurnPct * p.poolChurnMultiplier)){
        churnClient(cl, m, 'POOL_CHURN');
        poolChurned += 1;
      }
    }

    // Metrics for this month
    let activeConsultants = 0;
    let exitedConsultants = 0;
    let activeAttachedClients = 0;
    for (const c of consultants.values()){
      if (c.isActive) activeConsultants++; else exitedConsultants++;
      activeAttachedClients += c.clients.size;
    }
    const poolActive = pool.size;
    const revenue = activeAttachedClients * p.marketplaceEurPerClient * p.marketplacePct;

    // Annual accumulators
    annualRow.newConsultants += (baseRecruitsAdded + rocoRecruitsAdded);
    annualRow.baseRecruits += baseRecruitsAdded;
    annualRow.rocoRecruits += rocoRecruitsAdded;
    annualRow.avgClientsPerConsultantEnd = activeConsultants>0 ? (activeAttachedClients/activeConsultants) : 0;

    monthly.push({
      monthIndex: m,
      ym,
      recruitsPerYearEffective,
      baseRecruitsAdded,
      rocoRecruitsAdded,
      consultantsExited,
      activeConsultants,
      exitedConsultants,
      activeAttachedClients,
      poolActive,
      revenue,
      clientsGained,
      clientsLostAttachedChurn,
      clientsLostExitWith,
      clientsLostExitPartial,
      clientsToPoolFromExit,
      poolChurned,
    });

    // Snapshot for viz/UI (do not mutate; store a lightweight view)
    const consultantsSnapshot = Array.from(consultants.values()).map(c => ({
      id: c.id,
      origin: c.origin,
      referrerId: c.referrerId,
      createdReason: c.createdReason,
      createdMonthIndex: c.createdMonthIndex,
      exitMonthIndex: c.exitMonthIndex,
      isActive: c.isActive,
      clientsCount: c.clients.size,
      projectsWon: c.projectsWon,
      rocoCreatedTotal: c.rocoCreatedTotal,
      churnedByConsultant: c.churnedByConsultant,
      lostAtExit: c.lostAtExit,
      transferredToPool: c.transferredToPool,
    }));
    const poolSnapshot = Array.from(pool).map(cid=>{
      const cl = clients.get(cid);
      return {
        id: cl.id,
        originConsultantId: cl.originConsultantId,
        poolStartMonthIndex: cl.poolStartMonthIndex,
        poolFromConsultantId: cl.poolFromConsultantId,
        poolFromConsultantExitMonth: cl.poolFromConsultantExitMonth,
      };
    });
    cacheByMonth.push({
      monthIndex: m, ym,
      consultants: consultantsSnapshot,
      pool: poolSnapshot,
      metrics: {activeConsultants, exitedConsultants, activeAttachedClients, poolActive, revenue, baseRecruitsAdded, rocoRecruitsAdded}
    });
  }

  const annual = Array.from(annualByYear.values());
  const clientsAll = Array.from(clients.values()).map(cl=>({
    id: cl.id,
    isActive: cl.isActive,
    originConsultantId: cl.originConsultantId,
    attachedConsultantId: cl.attachedConsultantId,
    startMonthIndex: cl.startMonthIndex,
    endMonthIndex: cl.endMonthIndex,
    endReason: cl.endReason,
    poolStartMonthIndex: cl.poolStartMonthIndex,
    poolFromConsultantId: cl.poolFromConsultantId,
    poolFromConsultantExitMonth: cl.poolFromConsultantExitMonth,
  }));
  return { months, cacheByMonth, monthly, annual, params: p, clientsAll };
}
