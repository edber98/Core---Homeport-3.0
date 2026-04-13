import { useState, useMemo } from 'react'
import { useSimStore } from '../store/simStore'
import { Info } from '../ui/Info'

export default function TargetsPage(){
  const res = useSimStore(s=>s.result)
  const [targetClients, setTargetClients] = useState(1000)
  const [mode, setMode] = useState<'fin'|'moy'>('fin')
  const [monthIdx, setMonthIdx] = useState( res ? res.months.length-1 : 0 )
  if (!res) return null
  const last = res.monthly[monthIdx]
  const avgFin = last.activeConsultants ? last.activeAttachedClients / last.activeConsultants : 0
  const avgPeriod = useMemo(()=>{
    const ms = res.monthly.slice(0, monthIdx+1)
    let s=0,c=0; for (const r of ms){ if (r.activeConsultants>0){ s += r.activeAttachedClients / r.activeConsultants; c++ } }
    return c? s/c : 0
  }, [res, monthIdx])
  const avg = mode==='fin' ? avgFin : avgPeriod
  const activeConsultantsEnd = last.activeConsultants
  const neededTotal = avg>0 ? Math.ceil(targetClients / avg) : 0
  const additionalNeeded = Math.max(0, neededTotal - activeConsultantsEnd)
  // Répartition indicative selon l’historique (BASE/ROCO)
  const cumBase = res.monthly.slice(0, monthIdx+1).reduce((a,r)=>a+r.baseRecruitsAdded,0)
  const cumRoco = res.monthly.slice(0, monthIdx+1).reduce((a,r)=>a+r.rocoRecruitsAdded,0)
  const sumBR = cumBase+cumRoco || 1
  const shareBase = cumBase/sumBR, shareRoco = cumRoco/sumBR
  const baseAdd = Math.round(additionalNeeded*shareBase)
  const rocoAdd = additionalNeeded - baseAdd

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="panel p-4">
        <div className="font-semibold mb-2">Objectif et hypothèses</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="grid gap-1">
            <span>Objectif clients fin période <Info text="Nombre de clients actifs à atteindre à la fin de la période considérée."/></span>
            <input type="number" className="border border-line rounded px-2 py-1" value={targetClients} onChange={e=>setTargetClients(Number(e.target.value))}/>
          </label>
          <label className="grid gap-1">
            <span>Mois de référence <Info text="Mois utilisé pour mesurer la moyenne ou comme borne de cumul."/></span>
            <select className="border border-line rounded px-2 py-1" value={monthIdx} onChange={e=>setMonthIdx(Number(e.target.value))}>{res.months.map((m,i)=> <option key={m} value={i}>{m}</option>)}</select>
          </label>
          <label className="grid gap-1 col-span-2">
            <span>Hypothèse moyenne <Info text="Fin: moyenne Clients/Consultant sur le mois de référence. Période: moyenne des moyennes de 0 → mois de référence."/></span>
            <select className="border border-line rounded px-2 py-1" value={mode} onChange={e=>setMode(e.target.value as any)}>
              <option value="fin">Moyenne à la fin ({avgFin.toFixed(2)} clients/consultant)</option>
              <option value="moy">Moyenne sur la période ({avgPeriod.toFixed(2)})</option>
            </select>
          </label>
        </div>
      </div>
      <div className="panel p-4">
        <div className="font-semibold mb-2">Résultats</div>
        <div className="grid grid-cols-2 gap-3">
          <K k={<span>Moy. clients/consultant <Info text="Rapport Clients actifs / Consultants actifs (selon l’hypothèse sélectionnée)."/></span>} v={avg.toFixed(2)} />
          <K k={<span>Consultants actifs (réf.) <Info text="Nombre de consultants actifs au mois de référence."/></span>} v={String(activeConsultantsEnd)} />
          <K k={<span>Consultants nécessaires (total) <Info text="Objectif / Moy. clients/consultant."/></span>} v={String(neededTotal)} />
          <K k={<span>Consultants supplémentaires <Info text="Consultants nécessaires − Consultants actifs (réf.)."/></span>} v={String(additionalNeeded)} />
          <K k={<span>Répartition BASE (indicative) <Info text="Répartition indicative basée sur l’historique cumulé BASE/ROCO jusqu’au mois de référence."/></span>} v={`${baseAdd} (~${Math.round(shareBase*100)}%)`} />
          <K k={<span>Répartition ROCO (indicative) <Info text="Répartition indicative basée sur l’historique cumulé BASE/ROCO jusqu’au mois de référence."/></span>} v={`${rocoAdd} (~${Math.round(shareRoco*100)}%)`} />
        </div>
      </div>
    </div>
  )
}

function K({k,v}:{k:React.ReactNode,v:string}){
  return <div className="p-3 rounded-xl border border-line bg-white"><div className="text-xs text-slate-500 flex items-center gap-1">{k}</div><div className="text-lg font-semibold">{v}</div></div>
}
