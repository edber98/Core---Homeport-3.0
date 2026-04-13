import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, BarElement } from 'chart.js'
import { useSimStore } from '../store/simStore'
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, BarElement)

export default function AnalyticsPage(){
  const res = useSimStore(s=>s.result)
  if (!res) return null
  const labs = res.monthly.map(m=>m.ym)
  // Cumul par origine
  const cumBase:number[] = []
  const cumRoco:number[] = []
  let cb=0, cr=0
  for (const r of res.monthly){ cb += r.baseRecruitsAdded; cr += r.rocoRecruitsAdded; cumBase.push(cb); cumRoco.push(cr) }
  const initArr = res.monthly.map(()=> res.params.startConsultants)
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartPanel title="Recrutements (BASE vs ROCO)">
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[
            { label:'BASE', data: res.monthly.map(m=>m.baseRecruitsAdded), borderColor:'#60a5fa', pointRadius:0 },
            { label:'ROCO', data: res.monthly.map(m=>m.rocoRecruitsAdded), borderColor:'#22c55e', pointRadius:0 }
          ] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, animation:false, plugins:{legend:{position:'bottom'}} }} />
        </div>
      </ChartPanel>
      <ChartPanel title="Moy. clients / consultant">
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[{ label:'Moyenne', data: res.monthly.map(m=> m.activeConsultants? m.activeAttachedClients/m.activeConsultants:0), borderColor:'#f59e0b', pointRadius:0 }] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, animation:false, plugins:{legend:{display:false}} }} />
        </div>
      </ChartPanel>
      <ChartPanel title="Acquis vs Perdus">
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[
            { label:'Acquis', data: res.monthly.map(m=>m.clientsGained), borderColor:'#16a34a', pointRadius:0 },
            { label:'Perdus attachés', data: res.monthly.map(m=>m.clientsLostAttachedChurn + m.clientsLostExitWith + m.clientsLostExitPartial), borderColor:'#dc2626', pointRadius:0 },
            { label:'Pool churn', data: res.monthly.map(m=>m.poolChurned), borderColor:'#64748b', pointRadius:0 },
          ] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, animation:false, plugins:{legend:{position:'bottom'}} }} />
        </div>
      </ChartPanel>
      <ChartPanel title="Exits consultants">
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[{ label:'Exits', data: res.monthly.map(m=>m.consultantsExited), borderColor:'#0ea5e9', pointRadius:0 }] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, animation:false, plugins:{legend:{display:false}} }} />
        </div>
      </ChartPanel>
      <ChartPanel title="Pool actifs">
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[{ label:'Pool actifs', data: res.monthly.map(m=>m.poolActive), borderColor:'#60a5fa', pointRadius:0 }] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, animation:false, plugins:{legend:{display:false}} }} />
        </div>
      </ChartPanel>
      <ChartPanel title="Revenu proxy">
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[{ label:'€', data: res.monthly.map(m=>Math.round(m.revenue)), borderColor:'#8b5cf6', pointRadius:0 }] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, animation:false, plugins:{legend:{display:false}} }} />
        </div>
      </ChartPanel>
      <ChartPanel title="Cumul consultants par origine">
        <div className="h-[280px]">
          <Line data={{ labels: labs, datasets:[
            { label:'INITIAL', data: initArr, borderColor:'#94a3b8', pointRadius:0 },
            { label:'BASE (cumul)', data: cumBase, borderColor:'#60a5fa', pointRadius:0 },
            { label:'ROCO (cumul)', data: cumRoco, borderColor:'#22c55e', pointRadius:0 },
          ] }} options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, animation:false, plugins:{legend:{position:'bottom'}} }} />
        </div>
      </ChartPanel>
    </div>
  )
}

function ChartPanel({title, children}:{title:string, children:React.ReactNode}){
  return (
    <div className="panel p-3 h-[340px]">
      <div className="font-semibold mb-2">{title}</div>
      {children}
    </div>
  )
}
