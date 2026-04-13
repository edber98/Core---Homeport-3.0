import { useSimStore } from '../store/simStore'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip } from 'chart.js'
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip)
import { StatsGrid } from '../ui/Stats'

export default function Dashboard(){
  const res = useSimStore(s=>s.result)
  if (!res) return null
  const labs = res.monthly.map(m=>m.ym)
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0">
      <div className="panel p-4">
        <div className="font-semibold mb-2">Indicateurs</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Kpi label="Clients actifs" title="Clients attachés à des consultants (actifs)" value={res.monthly.at(-1)?.activeAttachedClients||0} />
          <Kpi label="Consultants vivants" title="Nombre de consultants actifs à la fin du mois" value={res.monthly.at(-1)?.activeConsultants||0} />
          <Kpi label="Sans consultant (pool)" title="Clients actifs sans consultant (suite à sorties/transferts), soumis à un churn spécifique" value={res.monthly.at(-1)?.poolActive||0} />
          <Kpi label="Acquisition mensuelle" title="Nombre de clients acquis ce mois (production)" value={res.monthly.at(-1)?.clientsGained||0} />
          <Kpi label="Pertes mensuelles" title="Churn attachés + pertes à la sortie consultant" value={(res.monthly.at(-1)?.clientsLostAttachedChurn||0)+(res.monthly.at(-1)?.clientsLostExitWith||0)+(res.monthly.at(-1)?.clientsLostExitPartial||0)} />
          <Kpi label="Revenu proxy" title="Clients actifs × € × % marketplace" value={Math.round(res.monthly.at(-1)?.revenue||0)} suffix=" €" />
        </div>
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">Synthèse globale</div>
          <StatsGrid />
        </div>
      </div>
      <div className="panel p-4 h-[340px]">
        <div className="font-semibold mb-2">Clients actifs</div>
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[{ label:'Clients', data: res.monthly.map(m=>m.activeAttachedClients), borderColor:'#2563eb', tension:.2, pointRadius:0 }] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay: 150, animation:false, plugins:{legend:{display:false}}, scales:{ x:{ ticks:{ maxTicksLimit:8 }}} }} />
        </div>
      </div>
      <div className="panel p-4 h-[340px]">
        <div className="font-semibold mb-2">Consultants vivants</div>
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[{ label:'Consultants', data: res.monthly.map(m=>m.activeConsultants), borderColor:'#16a34a', tension:.2, pointRadius:0 }] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay: 150, animation:false, plugins:{legend:{display:false}}, scales:{ x:{ ticks:{ maxTicksLimit:8 }}} }} />
        </div>
      </div>
      <div className="panel p-4 h-[340px]">
        <div className="font-semibold mb-2">Flux (Acquis vs Perdus)</div>
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[
            { label:'Acquis', data: res.monthly.map(m=>m.clientsGained), borderColor:'#16a34a', tension:.2, pointRadius:0 },
            { label:'Perdus', data: res.monthly.map(m=>m.clientsLostAttachedChurn + m.clientsLostExitWith + m.clientsLostExitPartial), borderColor:'#dc2626', tension:.2, pointRadius:0 },
          ] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, animation:false, plugins:{legend:{position:'bottom'}}, scales:{ x:{ ticks:{ maxTicksLimit:8 }}} }} />
        </div>
      </div>
    </div>
  )
}

function Kpi({label, value, suffix, title}:{label:string, value:number, suffix?:string, title?:string}){
  return (
    <div className="p-5 rounded-xl border border-line bg-white" title={title}>
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold tracking-tight">{value}{suffix||''}</div>
    </div>
  )
}
