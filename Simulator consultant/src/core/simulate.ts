import { Random, indexToYM } from './rng'
import type { ClientFlat, ConsultantSnap, MonthCache, MonthRow, SimParams, SimResult, YearRow } from './types'

export const defaultParams: SimParams = {
  startDate: '2025-01', monthsTotal: 60, seed: '123456',
  startConsultants: 1, recruitsPerYear: 5, recruitGrowthPct: 0.20,
  rampMonths: 2, activityMean: 0.70, minClientsPerMonth: 0, maxClientsPerMonth: 3, maxPortfolio: 10,
  clientChurnPct: 0.02, poolChurnMultiplier: 0.30, consultantChurnPct: 0.025,
  leaveWithClientsPct: 0.55, partialRetentionPct: 0.25, partialRetentionShare: 0.5,
  projectsPerReferral: 5, referralConv: 0.70,
  marketplacePct: 0.35, marketplaceEurPerClient: 8,
  speedMs: 350, layoutMode: 'seniority'
}

export function simulate(userParams?: Partial<SimParams>): SimResult{
  const p = { ...defaultParams, ...(userParams||{}) }
  const rng = new Random(p.seed)

  type Cons = {
    id: number; origin: 'INITIAL'|'BASE'|'ROCO'; referrerId: number|null; createdReason: string|null;
    createdMonthIndex: number; exitMonthIndex: number|null; isActive: boolean; projectsWon: number; referralsDone: number;
    rocoCreatedTotal: number; churnedByConsultant: number; lostAtExit: number; transferredToPool: number; activityBias: number; clients: Set<number>
  }
  type Cl = {
    id: number; isActive: boolean; attachedConsultantId: number|null; startMonthIndex: number; endMonthIndex: number|null; endReason: string|null;
    poolStartMonthIndex: number|null; poolFromConsultantId: number|null; poolFromConsultantExitMonth: number|null; originConsultantId: number|null
  }

  let nextConsultantId = 1
  let nextClientId = 1
  const consultants = new Map<number, Cons>()
  const clients = new Map<number, Cl>()
  const pool = new Set<number>()

  function createConsultant(origin: Cons['origin'], monthIdx: number, extra: Partial<Cons>={}){
    const id = nextConsultantId++
    const c: Cons = {
      id, origin,
      referrerId: (extra as any).referrerId ?? null,
      createdReason: (extra as any).createdReason ?? null,
      createdMonthIndex: monthIdx, exitMonthIndex: null, isActive: true,
      projectsWon: 0, referralsDone: 0, rocoCreatedTotal: 0, churnedByConsultant: 0, lostAtExit: 0, transferredToPool: 0,
      activityBias: Math.min(0.95, Math.max(0.2, p.activityMean + (rng.float(-0.2, 0.2)))) ,
      clients: new Set<number>()
    }
    consultants.set(id, c)
    return c
  }

  function attachClient(consultant: Cons, monthIdx: number){
    if (!consultant?.isActive) return null
    const id = nextClientId++
    const cl: Cl = {
      id, isActive: true, attachedConsultantId: consultant.id, startMonthIndex: monthIdx, endMonthIndex: null, endReason: null,
      poolStartMonthIndex: null, poolFromConsultantId: null, poolFromConsultantExitMonth: null, originConsultantId: consultant.id
    }
    clients.set(id, cl)
    consultant.clients.add(id)
    consultant.projectsWon += 1
    return cl
  }

  function detachToPool(cl: Cl, exitConsultant: Cons|null, exitMonthIdx: number){
    if (!cl.isActive) return
    cl.attachedConsultantId = null
    cl.poolStartMonthIndex = exitMonthIdx
    cl.poolFromConsultantId = exitConsultant?.id ?? null
    cl.poolFromConsultantExitMonth = exitMonthIdx
    pool.add(cl.id)
  }

  function churnClient(cl: Cl, monthIdx: number, reason: string){
    cl.isActive = false
    cl.endMonthIndex = monthIdx
    cl.endReason = reason
    if (cl.attachedConsultantId){
      const cons = consultants.get(cl.attachedConsultantId)
      cons?.clients.delete(cl.id)
    }
    pool.delete(cl.id)
  }

  // Seed initial consultants
  for (let i=0;i<p.startConsultants;i++) createConsultant('INITIAL', 0)

  const months = Array.from({length: p.monthsTotal}, (_,i)=>indexToYM(p.startDate, i))
  const cacheByMonth: MonthCache[] = []
  const monthly: MonthRow[] = []
  const annualByYear = new Map<number, YearRow>()
  const yearOf = (idx: number)=> Number(months[idx].slice(0,4))

  function baseRecruitsForMonth(monthIdx: number){
    const yearIdx = yearOf(monthIdx) - yearOf(0)
    const recruitsPerYearEffective = Math.round(p.recruitsPerYear * Math.pow(1 + p.recruitGrowthPct, yearIdx))
    const expectedPerMonth = recruitsPerYearEffective / 12
    const base = Math.floor(expectedPerMonth)
    const fraction = expectedPerMonth - base
    const add = rng.chance(fraction) ? 1 : 0
    return { count: base + add, recruitsPerYearEffective }
  }

  for (let m=0; m<p.monthsTotal; m++){
    const ym = months[m]
    const year = Number(ym.slice(0,4))
    if (!annualByYear.has(year)) annualByYear.set(year, {year, newConsultants:0, baseRecruits:0, rocoRecruits:0, avgClientsPerConsultantEnd:0})
    const annualRow = annualByYear.get(year)!

    let clientsGained=0, clientsLostAttachedChurn=0, clientsLostExitWith=0, clientsLostExitPartial=0, clientsToPoolFromExit=0, poolChurned=0, consultantsExited=0

    // BASE recruits
    const {count: baseAdds, recruitsPerYearEffective} = baseRecruitsForMonth(m)
    let baseRecruitsAdded = 0
    let rocoRecruitsAdded = 0
    for (let i=0;i<baseAdds;i++){ createConsultant('BASE', m); baseRecruitsAdded++ }

    // ROCO referrals
    for (const c of consultants.values()){
      if (!c.isActive) continue
      const shouldHave = Math.floor(c.projectsWon / p.projectsPerReferral)
      const delta = shouldHave - c.referralsDone
      for (let k=0;k<delta;k++){
        if (rng.chance(p.referralConv)){
          createConsultant('ROCO', m, {referrerId: c.id, createdReason: `ROCO threshold ${p.projectsPerReferral} @projects=${c.projectsWon}`})
          c.rocoCreatedTotal += 1
          rocoRecruitsAdded++
        }
        c.referralsDone += 1
      }
    }

    // Production
    for (const c of consultants.values()){
      if (!c.isActive) continue
      const age = m - c.createdMonthIndex
      if (age < p.rampMonths) continue
      if (!rng.chance(c.activityBias)) continue
      const capRemain = Math.max(0, p.maxPortfolio - c.clients.size)
      if (capRemain <= 0) continue
      const toAdd = Math.min(capRemain, Math.max(0, rng.int(p.minClientsPerMonth, p.maxClientsPerMonth)))
      for (let i=0;i<toAdd;i++){ attachClient(c, m); clientsGained++ }
    }

    // Client churn attached
    for (const c of consultants.values()){
      if (!c.isActive) continue
      for (const cid of Array.from(c.clients)){
        const cl = clients.get(cid)!
        if (!cl?.isActive) continue
        if (rng.chance(p.clientChurnPct)){
          churnClient(cl, m, 'CHURN');
          c.churnedByConsultant += 1
          clientsLostAttachedChurn += 1
        }
      }
    }

    // Consultant churn
    for (const c of consultants.values()){
      if (!c.isActive) continue
      if (rng.chance(p.consultantChurnPct)){
        c.isActive = false
        c.exitMonthIndex = m
        consultantsExited += 1
        const r = rng.next()
        const clientsBeforeExit = c.clients.size
        c.clientsAtExit = clientsBeforeExit as any
        if (r < p.leaveWithClientsPct){
          for (const cid of Array.from(c.clients)){
            const cl = clients.get(cid)!
            if (cl?.isActive){ churnClient(cl, m, 'EXIT_WITH'); c.lostAtExit += 1; clientsLostExitWith += 1 }
          }
          ;(c as any).exitMode = 'WITH_ALL'
          c.clients.clear()
        } else if (r < p.leaveWithClientsPct + p.partialRetentionPct){
          const ids = Array.from(c.clients)
          const keepToPool = Math.floor(ids.length * p.partialRetentionShare)
          const shuffled = ids.slice(); rng.shuffle(shuffled)
          const toPool = new Set(shuffled.slice(0, keepToPool))
          for (const cid of ids){
            const cl = clients.get(cid)!
            if (!cl?.isActive) continue
            if (toPool.has(cid)){
              c.clients.delete(cid)
              detachToPool(cl, c, m)
              c.transferredToPool += 1
              clientsToPoolFromExit += 1
            } else {
              churnClient(cl, m, 'EXIT_PARTIAL_LEAVE')
              c.lostAtExit += 1
              clientsLostExitPartial += 1
            }
          }
          ;(c as any).exitMode = 'PARTIAL'
        } else {
          for (const cid of Array.from(c.clients)){
            const cl = clients.get(cid)!
            if (cl?.isActive){ c.clients.delete(cid); detachToPool(cl, c, m); c.transferredToPool += 1; clientsToPoolFromExit += 1 }
          }
          ;(c as any).exitMode = 'TO_POOL_ALL'
        }
      }
    }

    // Pool churn
    for (const cid of Array.from(pool)){
      const cl = clients.get(cid)!
      if (!cl?.isActive){ pool.delete(cid); continue }
      if (rng.chance(p.clientChurnPct * p.poolChurnMultiplier)){
        churnClient(cl, m, 'POOL_CHURN');
        poolChurned += 1
      }
    }

    // Metrics
    let activeConsultants=0, exitedConsultants=0, activeAttachedClients=0
    for (const c of consultants.values()){
      if (c.isActive) activeConsultants++; else exitedConsultants++
      activeAttachedClients += c.clients.size
    }
    const poolActive = pool.size
    const revenue = activeAttachedClients * p.marketplaceEurPerClient * p.marketplacePct

    const annualRowMut = annualByYear.get(year)!
    annualRowMut.newConsultants += (baseRecruitsAdded + rocoRecruitsAdded)
    annualRowMut.baseRecruits += baseRecruitsAdded
    annualRowMut.rocoRecruits += rocoRecruitsAdded
    annualRowMut.avgClientsPerConsultantEnd = activeConsultants>0 ? (activeAttachedClients/activeConsultants) : 0

    monthly.push({ monthIndex:m, ym, recruitsPerYearEffective, baseRecruitsAdded, rocoRecruitsAdded, consultantsExited,
      activeConsultants, exitedConsultants, activeAttachedClients, poolActive, revenue,
      clientsGained, clientsLostAttachedChurn, clientsLostExitWith, clientsLostExitPartial, clientsToPoolFromExit, poolChurned })

    const consultantsSnapshot: ConsultantSnap[] = Array.from(consultants.values()).map(c=>({
      id: c.id, origin: c.origin, referrerId: c.referrerId, createdReason: c.createdReason, createdMonthIndex: c.createdMonthIndex,
      exitMonthIndex: c.exitMonthIndex, isActive: c.isActive, clientsCount: c.clients.size, projectsWon: c.projectsWon,
      rocoCreatedTotal: c.rocoCreatedTotal, churnedByConsultant: c.churnedByConsultant, lostAtExit: c.lostAtExit, transferredToPool: c.transferredToPool,
      clientsAtExit: (c as any).clientsAtExit, exitMode: (c as any).exitMode
    }))
    const poolSnapshot = Array.from(pool).map(cid=>{
      const cl = clients.get(cid)!
      return { id: cl.id, originConsultantId: cl.originConsultantId, poolStartMonthIndex: cl.poolStartMonthIndex, poolFromConsultantId: cl.poolFromConsultantId, poolFromConsultantExitMonth: cl.poolFromConsultantExitMonth }
    })
    cacheByMonth.push({ monthIndex:m, ym, consultants: consultantsSnapshot, pool: poolSnapshot, metrics: {activeConsultants, exitedConsultants, activeAttachedClients, poolActive, revenue, baseRecruitsAdded, rocoRecruitsAdded} })
  }

  const annual = Array.from(annualByYear.values())
  const clientsAll: ClientFlat[] = Array.from(clients.values()).map(cl=>({
    id: cl.id, isActive: cl.isActive, originConsultantId: cl.originConsultantId, attachedConsultantId: cl.attachedConsultantId,
    startMonthIndex: cl.startMonthIndex, endMonthIndex: cl.endMonthIndex, endReason: cl.endReason, poolStartMonthIndex: cl.poolStartMonthIndex,
    poolFromConsultantId: cl.poolFromConsultantId, poolFromConsultantExitMonth: cl.poolFromConsultantExitMonth
  }))

  return { months, cacheByMonth, monthly, annual, params: p, clientsAll }
}
