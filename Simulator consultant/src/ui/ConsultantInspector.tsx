import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip } from 'chart.js'
import { useSimStore } from '../store/simStore'
import { useState } from 'react'
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip)

export default function ConsultantInspector(){
  const { result, selectedMonth, selectedConsultantId } = useSimStore()
  if (!result || selectedConsultantId==null) return null
  const snap = result.cacheByMonth[selectedMonth]
  const c = snap.consultants.find(x=>x.id===selectedConsultantId)
  if (!c) return <div className="text-sm text-slate-500">Hors plage (sélectionné avant sa création). Ajustez le mois.</div>
  const clientsAll = result.clientsAll
  const active = clientsAll.filter(cl=> cl.attachedConsultantId===c.id && cl.startMonthIndex<=selectedMonth && (cl.endMonthIndex==null || cl.endMonthIndex>selectedMonth))
  const pool = clientsAll.filter(cl=> cl.poolFromConsultantId===c.id && cl.poolStartMonthIndex!=null && cl.poolStartMonthIndex<=selectedMonth && (cl.endMonthIndex==null || cl.endMonthIndex>selectedMonth))
  const churn = clientsAll.filter(cl=> cl.originConsultantId===c.id && cl.endMonthIndex!=null && cl.endMonthIndex<=selectedMonth)
  const labs = result.monthly.map(m=>m.ym)
  const rows = result.cacheByMonth.map(s=> s.consultants.find(c0=>c0.id===c.id))
  const clientsSeries = rows.map(r=> r?.clientsCount || 0)
  const wonCum = rows.map(r=> r?.projectsWon || 0)
  const churnCum = rows.map(r=> (r?.churnedByConsultant||0) + (r?.lostAtExit||0) + (r?.transferredToPool||0))
  const diffs = (arr:number[])=> arr.map((v,i)=> i===0?0: Math.max(0, v - (arr[i-1]||0)))
  const wonPerMonth = diffs(wonCum)
  const churnPerMonth = diffs(churnCum)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <KV k="Origine" v={`${c.origin}${c.referrerId?` (ref #${c.referrerId})`:''}`} />
        <KV k="Créé" v={result.months[c.createdMonthIndex]} />
        <KV k="Fin" v={c.exitMonthIndex==null?'—':result.months[c.exitMonthIndex]} />
        <KV k="Statut" v={c.isActive?'Actif':'Sorti'} />
        <KV k="Clients actifs" v={String(c.clientsCount)} />
        <KV k="Projets gagnés" v={String(c.projectsWon)} />
        <KV k="ROCO créés" v={String(c.rocoCreatedTotal)} />
        <KV k="Churn attachés" v={String(c.churnedByConsultant)} />
        <KV k="Perdus sortie" v={String(c.lostAtExit)} />
        <KV k="Vers pool" v={String(c.transferredToPool)} />
        <KV k="Clients à la sortie" v={c.clientsAtExit!=null? String(c.clientsAtExit):'—'} />
        <KV k="Mode de sortie" v={c.exitMode? modeLabel(c.exitMode):'—'} />
      </div>
      <div className="panel p-2">
        <div className="text-sm font-semibold mb-1">Évolution</div>
        <div className="grid grid-cols-1 gap-2">
          <div className="h-[160px]"><Line data={{ labels: labs, datasets:[{ label:'Clients actifs', data: clientsSeries, borderColor:'#2563eb', pointRadius:0, tension:.2 }] }} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ ticks:{ maxTicksLimit:6 }}} }} /></div>
          <div className="h-[160px]"><Line data={{ labels: labs, datasets:[{ label:'Acquis / mois', data: wonPerMonth, borderColor:'#16a34a', pointRadius:0, tension:.2 }, { label:'Perdus / mois', data: churnPerMonth, borderColor:'#dc2626', pointRadius:0, tension:.2 }] }} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}, scales:{ x:{ ticks:{ maxTicksLimit:6 }}} }} /></div>
        </div>
      </div>
      <LinkedAll allRows={clientsAll.filter(cl=> cl.originConsultantId===c.id)} months={result.months} consultantId={c.id} selectedMonth={selectedMonth} />
      <ClientLists active={active} pool={pool} churn={churn} allRows={clientsAll.filter(cl=> cl.originConsultantId===c.id)} months={result.months} />
    </div>
  )
}

function KV({k, v}:{k:string, v:string}){
  return (<div className="border border-line rounded-lg p-2"><div className="text-xs text-slate-500">{k}</div><div className="font-semibold">{v}</div></div>)
}
function modeLabel(m:'WITH_ALL'|'PARTIAL'|'TO_POOL_ALL'){
  return m==='WITH_ALL'? 'Part avec tous ses clients' : m==='PARTIAL'? 'Sortie partielle (pool + pertes)' : 'Transfert total au pool'
}

function ClientLists({active, pool, churn, allRows, months}:{active:any[], pool:any[], churn:any[], allRows:any[], months:string[]}){
  const [tab, setTab] = useState<'active'|'pool'|'churn'|'all'>('active')
  const tabs = [
    {id:'active', label:`Clients actifs (${active.length})`, rows: active, cols:[['id','ID'],['startMonthIndex','Début']]},
    {id:'pool', label:`Clients en pool (${pool.length})`, rows: pool, cols:[['id','ID'],['poolStartMonthIndex','Début pool']]},
    {id:'churn', label:`Churnés (${churn.length})`, rows: churn, cols:[['id','ID'],['endMonthIndex','Fin'],['endReason','Raison']]},
    {id:'all', label:`Historique complet (${allRows.length})`, rows: allRows, cols:[['id','ID'],['startMonthIndex','Début'],['endMonthIndex','Fin'],['endReason','Raison'],['poolStartMonthIndex','Début pool']]},
  ] as {id:any,label:string,rows:any[],cols:[string,string][]}[]
  const current = tabs.find(t=>t.id===tab)!
  return (
    <div className="panel p-2">
      <div className="flex gap-2 mb-2 flex-wrap">
        {tabs.map(t=> (
          <button key={t.id} className={`px-2 py-1 rounded text-sm ${t.id===tab?'bg-blue-600 text-white':'bg-slate-100'}`} onClick={()=>setTab(t.id as any)}>{t.label}</button>
        ))}
      </div>
      <div className="tableWrap">
        <table className="w-full text-sm">
          <thead className="stickyHead"><tr>{current.cols.map(([k,h])=> <th key={k} className="border-b border-line p-2 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{current.rows.slice(0,2000).map((r,i)=> (
            <tr key={i} className="hover:bg-slate-50">
              {current.cols.map(([k])=> {
                let v = r[k]
                if (k.endsWith('MonthIndex') && v!=null) v = months[v]
                return <td key={k} className="border-b border-line p-2 whitespace-nowrap">{String(v??'')}</td>
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function LinkedAll({allRows, months, consultantId, selectedMonth}:{allRows:any[], months:string[], consultantId:number, selectedMonth:number}){
  const rows = allRows.map(r=>{
    let statut = 'Inactif', cls='text-slate-400'
    if ((r.attachedConsultantId===consultantId) && (r.startMonthIndex<=selectedMonth) && (r.endMonthIndex==null || r.endMonthIndex>selectedMonth)){
      statut = 'Actif (attaché)'; cls=''
    } else if ((r.poolStartMonthIndex!=null) && (r.poolStartMonthIndex<=selectedMonth) && (r.endMonthIndex==null || r.endMonthIndex>selectedMonth)){
      statut = 'En pool'; cls='text-slate-600'
    } else if (r.endReason){
      if (String(r.endReason).startsWith('EXIT')) statut = 'Inactif (sortie)'
      else if (String(r.endReason).includes('POOL')) statut = 'Inactif (pool)'
      else statut = 'Inactif (churn)'
    }
    return { ...r, __statut: statut, __cls: cls }
  })
  return (
    <div className="panel p-2">
      <div className="text-sm font-semibold mb-1">Clients liés (tous)</div>
      <div className="tableWrap">
        <table className="w-full text-sm">
          <thead className="stickyHead"><tr>
            <th className="border-b border-line p-2 text-left">ID</th>
            <th className="border-b border-line p-2 text-left">Statut au mois</th>
            <th className="border-b border-line p-2 text-left">Début</th>
            <th className="border-b border-line p-2 text-left">Début pool</th>
            <th className="border-b border-line p-2 text-left">Fin</th>
            <th className="border-b border-line p-2 text-left">Raison fin</th>
          </tr></thead>
          <tbody>
            {rows.slice(0,3000).map((r:any)=> (
              <tr key={r.id} className={`hover:bg-slate-50 ${r.__cls}`}>
                <td className="border-b border-line p-2">{r.id}</td>
                <td className="border-b border-line p-2">{r.__statut}</td>
                <td className="border-b border-line p-2">{months[r.startMonthIndex]}</td>
                <td className="border-b border-line p-2">{r.poolStartMonthIndex!=null? months[r.poolStartMonthIndex]: ''}</td>
                <td className="border-b border-line p-2">{r.endMonthIndex!=null? months[r.endMonthIndex]: ''}</td>
                <td className="border-b border-line p-2">{r.endReason??''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
