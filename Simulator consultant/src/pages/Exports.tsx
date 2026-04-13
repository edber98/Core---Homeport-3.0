import { useSimStore } from '../store/simStore'
import { indexToYM } from '../core/rng'

function download(filename: string, content: string, type='text/csv; charset=utf-8;'){
  const blob = new Blob([content], {type}); const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000)
}

export default function ExportsPage(){
  const { result, selectedMonth } = useSimStore()
  if (!result) return null
  return (
    <div className="panel p-3">
      <div className="font-semibold mb-3">Exports</div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={()=>exportMonthlyCsv(result)}>CSV Mensuel</button>
        <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={()=>exportAnnualCsv(result)}>CSV Annuel</button>
        <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={()=>exportConsultantsCsv(result, selectedMonth)}>CSV Consultants (mois)</button>
        <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={()=>exportPoolCsv(result, selectedMonth)}>CSV Pool (mois)</button>
      </div>
      <div className="text-sm text-slate-600">Audit</div>
      <div className="mt-2 text-sm whitespace-pre-wrap bg-slate-50 border border-line rounded p-3">{JSON.stringify(result.params, null, 2)}</div>
    </div>
  )
}

export function exportMonthlyCsv(sim: any){
  const sep = ';';
  const head = ['mois','consultants_actifs','clients_attaches','pool','revenu','base_recruits','roco_recruits','exits','acquis','churn_attach','perdus_sortie','vers_pool','pool_churn'].join(sep)
  const rows = sim.monthly.map((r:any)=>[
    r.ym, r.activeConsultants, r.activeAttachedClients, r.poolActive, Math.round(r.revenue), r.baseRecruitsAdded, r.rocoRecruitsAdded, r.consultantsExited, r.clientsGained, r.clientsLostAttachedChurn, (r.clientsLostExitWith+r.clientsLostExitPartial), r.clientsToPoolFromExit, r.poolChurned
  ].join(sep))
  download(`mensuel_${sim.params.seed}.csv`, [head, ...rows].join('\n'))
}
export function exportAnnualCsv(sim: any){
  const sep = ';'; const head = ['annee','nouveaux','base_recruits','roco_recruits','moy_clients_par_consultant_fin'].join(sep)
  const rows = sim.annual.map((r:any)=>[ r.year, r.newConsultants, r.baseRecruits, r.rocoRecruits, r.avgClientsPerConsultantEnd.toFixed(2) ].join(sep))
  download(`annuel_${sim.params.seed}.csv`, [head, ...rows].join('\n'))
}
export function exportConsultantsCsv(sim: any, monthIdx: number){
  const snap = sim.cacheByMonth[monthIdx]; const sep=';'
  const head = ['id','origine','referrer','date_creation','actif','clients_actifs','projets_gagnes','roco_crees','churn_attaches','perdus_sortie','vers_pool','date_fin','mode_sortie','clients_a_la_sortie'].join(sep)
  const rows = snap.consultants.map((c:any)=> [
    c.id,
    c.origin,
    c.referrerId??'',
    indexToYM(sim.params.startDate, c.createdMonthIndex),
    c.isActive?1:0,
    c.clientsCount,
    c.projectsWon,
    c.rocoCreatedTotal,
    c.churnedByConsultant,
    c.lostAtExit,
    c.transferredToPool,
    (c.exitMonthIndex!=null? indexToYM(sim.params.startDate, c.exitMonthIndex):''),
    (c.exitMode??''),
    (c.clientsAtExit??'')
  ].join(sep))
  download(`consultants_M${monthIdx}_${sim.params.seed}.csv`, [head, ...rows].join('\n'))
}
export function exportPoolCsv(sim: any, monthIdx: number){
  const snap = sim.cacheByMonth[monthIdx]; const sep=';'
  const head = ['clientId','originConsultantId','poolStart','exitConsultantDate'].join(sep)
  const rows = snap.pool.map((p:any)=> [
    p.id,
    p.originConsultantId??'',
    (p.poolStartMonthIndex!=null? indexToYM(sim.params.startDate, p.poolStartMonthIndex):''),
    (p.poolFromConsultantExitMonth!=null? indexToYM(sim.params.startDate, p.poolFromConsultantExitMonth):'')
  ].join(sep))
  download(`pool_M${monthIdx}_${sim.params.seed}.csv`, [head, ...rows].join('\n'))
}
