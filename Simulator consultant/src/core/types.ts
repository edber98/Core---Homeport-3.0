export type Origin = 'INITIAL' | 'BASE' | 'ROCO'

export interface SimParams {
  startDate: string
  monthsTotal: number
  seed: string
  startConsultants: number
  recruitsPerYear: number
  recruitGrowthPct: number
  rampMonths: number
  activityMean: number
  minClientsPerMonth: number
  maxClientsPerMonth: number
  maxPortfolio: number
  clientChurnPct: number
  poolChurnMultiplier: number
  consultantChurnPct: number
  leaveWithClientsPct: number
  partialRetentionPct: number
  partialRetentionShare: number
  projectsPerReferral: number
  referralConv: number
  marketplacePct: number
  marketplaceEurPerClient: number
  speedMs: number
  layoutMode: 'seniority' | 'seniority-exited-right'
}

export interface ConsultantSnap {
  id: number
  origin: Origin
  referrerId: number | null
  createdReason: string | null
  createdMonthIndex: number
  exitMonthIndex: number | null
  isActive: boolean
  clientsCount: number
  projectsWon: number
  rocoCreatedTotal: number
  churnedByConsultant: number
  lostAtExit: number
  transferredToPool: number
  clientsAtExit?: number
  exitMode?: 'WITH_ALL' | 'PARTIAL' | 'TO_POOL_ALL'
}

export interface PoolClientSnap {
  id: number
  originConsultantId: number | null
  poolStartMonthIndex: number | null
  poolFromConsultantId: number | null
  poolFromConsultantExitMonth: number | null
}

export interface MonthCache {
  monthIndex: number
  ym: string
  consultants: ConsultantSnap[]
  pool: PoolClientSnap[]
  metrics: {
    activeConsultants: number
    exitedConsultants: number
    activeAttachedClients: number
    poolActive: number
    revenue: number
    baseRecruitsAdded: number
    rocoRecruitsAdded: number
  }
}

export interface MonthRow {
  monthIndex: number
  ym: string
  recruitsPerYearEffective: number
  baseRecruitsAdded: number
  rocoRecruitsAdded: number
  consultantsExited: number
  activeConsultants: number
  exitedConsultants: number
  activeAttachedClients: number
  poolActive: number
  revenue: number
  clientsGained: number
  clientsLostAttachedChurn: number
  clientsLostExitWith: number
  clientsLostExitPartial: number
  clientsToPoolFromExit: number
  poolChurned: number
}

export interface YearRow {
  year: number
  newConsultants: number
  baseRecruits: number
  rocoRecruits: number
  avgClientsPerConsultantEnd: number
}

export interface ClientFlat {
  id: number
  isActive: boolean
  originConsultantId: number | null
  attachedConsultantId: number | null
  startMonthIndex: number
  endMonthIndex: number | null
  endReason: string | null
  poolStartMonthIndex: number | null
  poolFromConsultantId: number | null
  poolFromConsultantExitMonth: number | null
}

export interface SimResult {
  months: string[]
  cacheByMonth: MonthCache[]
  monthly: MonthRow[]
  annual: YearRow[]
  params: SimParams
  clientsAll: ClientFlat[]
}
