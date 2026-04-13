import { useMemo } from 'react'
import { useSimStore } from '../store/simStore'
import BubbleVizCanvas from '../ui/BubbleVizCanvas'
import { StatsGrid } from '../ui/Stats'
import ConsultantInspector from '../ui/ConsultantInspector'

export default function SimulationPage(){
  const { result, selectedMonth, selectedConsultantId } = useSimStore()
  const snap = useMemo(()=> result?.cacheByMonth[selectedMonth], [result, selectedMonth])
  if (!result || !snap) return null
  const row = result.monthly[selectedMonth]
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 min-h-0">
      <div className="panel p-3 flex flex-col min-h-0">
        <div className="mb-3">
          <div className="text-sm font-semibold mb-1">Résumé du mois {row.ym}</div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge label="Clients actifs" value={row.activeAttachedClients} color="#2563eb"/>
            <Badge label="Acquis" value={row.clientsGained} color="#16a34a"/>
            <Badge label="Perdus (attachés)" value={row.clientsLostAttachedChurn} color="#ef4444"/>
            <Badge label="Perdus (sorties)" value={row.clientsLostExitWith + row.clientsLostExitPartial} color="#f97316"/>
            <Badge label="Churn (pool)" value={row.poolChurned} color="#dc2626"/>
            <Badge label="Exits consultants" value={row.consultantsExited} color="#0ea5e9"/>
            <Badge label="BASE" value={row.baseRecruitsAdded} color="#60a5fa"/>
            <Badge label="ROCO" value={row.rocoRecruitsAdded} color="#22c55e"/>
          </div>
        </div>
        <div className="min-h-0">
          <BubbleVizCanvas />
        </div>
      </div>
      <div className="panel p-3 min-h-0 overflow-auto">
        <div className="font-semibold mb-2">Détails consultant</div>
        {selectedConsultantId==null ? (
          <div className="text-sm text-slate-500">Sélectionnez un consultant (bulle ou table) pour voir les détails.</div>
        ) : <ConsultantInspector />}
      </div>
    </div>
  )
}

function Badge({label, value, color}:{label:string, value:number, color:string}){
  return <span className="px-2 py-1 rounded-full border border-line bg-white" style={{borderColor:'#e2e8f0'}}><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:color}}/> {label}: <b>{value}</b></span>
}
