import { useMemo } from 'react'
import { useSimStore } from '../store/simStore'
import { Info } from './Info'

export function useGlobalStats(){
  const res = useSimStore(s=>s.result)
  return useMemo(()=>{
    if (!res) return null
    const m = res.monthly
    const sum = (k: keyof typeof m[number])=> m.reduce((a,r)=> a + (r[k] as number), 0)
    const totalGained = sum('clientsGained')
    const totalLostAttach = sum('clientsLostAttachedChurn')
    const totalLostExit = sum('clientsLostExitWith') + sum('clientsLostExitPartial')
    const totalPoolChurn = sum('poolChurned')
    const totalLost = totalLostAttach + totalLostExit + totalPoolChurn
    const totalExits = sum('consultantsExited')
    const totalBase = sum('baseRecruitsAdded')
    const totalRoco = sum('rocoRecruitsAdded')
    const totalInitial = res.params.startConsultants
    const totalConsultantsUnique = totalInitial + totalBase + totalRoco
    const last = m[m.length-1]
    const avgEnd = last.activeConsultants ? last.activeAttachedClients / last.activeConsultants : 0
    const avgOverPeriod = (()=>{
      let s=0, c=0
      for (const r of m){ if (r.activeConsultants>0){ s += r.activeAttachedClients / r.activeConsultants; c++ } }
      return c? s/c : 0
    })()
    const churnPctClients = totalGained>0 ? totalLost / totalGained : 0
    const lostAttachPct = totalGained>0 ? totalLostAttach / totalGained : 0
    const lostExitPct = totalGained>0 ? totalLostExit / totalGained : 0
    const poolChurnPct = totalGained>0 ? totalPoolChurn / totalGained : 0
    const exitsPctConsultants = totalConsultantsUnique>0 ? totalExits / totalConsultantsUnique : 0
    return { totalGained, totalLost, totalLostAttach, totalLostExit, totalPoolChurn, totalExits,
      totalBase, totalRoco, totalInitial, totalConsultantsUnique, avgEnd, avgOverPeriod, churnPctClients, exitsPctConsultants,
      lostAttachPct, lostExitPct, poolChurnPct }
  }, [useSimStore(s=>s.result)])
}

export function StatsGrid(){
  const gs = useGlobalStats()
  if (!gs) return null
  const num = (n:number)=> new Intl.NumberFormat('fr-FR').format(Math.round(n))
  const pct = (x:number)=> (x*100).toFixed(1)+'%'
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <K k={<span>Clients acquis (total)<Info text="Somme des clients ajoutés par la production (après ramp-up, activité, cap)."/></span>} v={num(gs.totalGained)} />
      <K k={<span>Clients perdus (total)<Info text="Inclut: churn attachés + pertes dues aux sorties consultant + churn du pool (sur toute la période)."/></span>} v={num(gs.totalLost)} />
      <K k={<span>Perte globale clients (%)<Info text="Total perdus / Total acquis, sur toute la période (≠ taux mensuel configuré)."/></span>} v={pct(gs.churnPctClients)} />
      <K k={<span>Moy. clients/consultant (fin)<Info text="Clients actifs / Consultants actifs à la fin de la période."/></span>} v={gs.avgEnd.toFixed(2)} />
      <K k={<span>Moy. clients/consultant (période)<Info text="Moyenne mensuelle des (clients actifs / consultants actifs)."/></span>} v={gs.avgOverPeriod.toFixed(2)} />
      <K k={<span>Exits consultants (total)<Info text="Somme des départs de consultants sur la période."/></span>} v={num(gs.totalExits)} />
      <K k={<span>Consultants créés BASE<Info text="Recrutement lissé mensuellement avec croissance annuelle."/></span>} v={num(gs.totalBase)} />
      <K k={<span>Consultants créés ROCO<Info text="Créations par recommandation: seuil X projets, conversion Y%."/></span>} v={num(gs.totalRoco)} />
      <K k={<span>Consultants uniques (total)<Info text="INITIAL + BASE + ROCO (certains peuvent être sortis)."/></span>} v={num(gs.totalConsultantsUnique)} />
      <K k={<span>Exits consultants (%)<Info text="Exits / Consultants uniques sur la période."/></span>} v={pct(gs.exitsPctConsultants)} />
      <K k={<span>Perdus (attachés)<Info text="Churn mensuel sur les clients attachés aux consultants."/></span>} v={`${num(gs.totalLostAttach)} · ${pct(gs.lostAttachPct)}`} />
      <K k={<span>Perdus (sorties consultant)<Info text="Clients perdus quand un consultant part avec (ou partiel)."/></span>} v={`${num(gs.totalLostExit)} · ${pct(gs.lostExitPct)}`} />
      <K k={<span>Churn (pool)<Info text="Churn appliqué aux clients en pool (multiplieur)."/></span>} v={`${num(gs.totalPoolChurn)} · ${pct(gs.poolChurnPct)}`} />
    </div>
  )
}

function K({k,v}:{k:React.ReactNode,v:string}){
  return <div className="p-3 rounded-xl border border-line bg-white"><div className="text-xs text-slate-500 flex items-center">{k}</div><div className="text-lg font-semibold">{v}</div></div>
}
