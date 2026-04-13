import { useMemo, useState } from 'react'
import { useSimStore } from '../store/simStore'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, BarElement } from 'chart.js'
import { Info } from '../ui/Info'
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, BarElement)

export default function ResultsPage(){
  const res = useSimStore(s=>s.result)
  const [tab, setTab] = useState<'M'|'Y'>('M')
  if (!res) return null
  const labsM = res.monthly.map(r=>r.ym)
  const labsY = res.annual.map(a=>String(a.year))
  const gained = res.monthly.map(r=>r.clientsGained)
  const lost = res.monthly.map(r=>r.clientsLostAttachedChurn + r.clientsLostExitWith + r.clientsLostExitPartial + r.poolChurned)
  const consultants = res.monthly.map(r=>r.activeConsultants)
  const clients = res.monthly.map(r=>r.activeAttachedClients)
  const lostAttach = res.monthly.map(r=>r.clientsLostAttachedChurn)
  const lostExit = res.monthly.map(r=>r.clientsLostExitWith + r.clientsLostExitPartial)
  const lostPool = res.monthly.map(r=>r.poolChurned)
  // Annual end-of-year clients
  const endClientsPerYear = res.annual.map(a=>{
    const y = a.year
    const rows = res.monthly.filter(r=> r.ym.startsWith(String(y)))
    const lastY = rows[rows.length-1]
    return lastY ? lastY.activeAttachedClients : 0
  })
  return (
    <div className="min-h-0 flex flex-col gap-4">
      <StatsScope />
      <div className="flex gap-2">
        <button className={`px-3 py-1 rounded ${tab==='M'?'bg-blue-600 text-white':'bg-slate-100'}`} onClick={()=>setTab('M')}>Mensuel</button>
        <button className={`px-3 py-1 rounded ${tab==='Y'?'bg-blue-600 text-white':'bg-slate-100'}`} onClick={()=>setTab('Y')}>Annuel</button>
      </div>
      {tab==='M' ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="panel p-3 h-[360px]">
            <div className="font-semibold mb-2">Vue mensuelle — Clients & Consultants</div>
            <div className="h-[300px]">
              <Line data={{ labels: labsM, datasets:[
                { label:'Clients actifs', data: clients, borderColor:'#2563eb', pointRadius:0, tension:.2 },
                { label:'Consultants actifs', data: consultants, borderColor:'#16a34a', pointRadius:0, tension:.2 },
                { label:'Acquis', data: gained, borderColor:'#0ea5e9', pointRadius:0, tension:.2 },
                { label:'Perdus', data: lost, borderColor:'#dc2626', pointRadius:0, tension:.2 },
              ] }} options={{ responsive:true, maintainAspectRatio:false, animation:false, plugins:{legend:{position:'bottom'}}, scales:{ x:{ ticks:{ maxTicksLimit:10 }}} }} />
            </div>
          </div>
          <div className="panel p-3 h-[360px]">
            <div className="font-semibold mb-2">Pertes par cause (mensuel, stacked)</div>
            <div className="h-[300px]">
              <Bar data={{ labels: labsM, datasets:[
                { label:'Attachés (churn)', data: lostAttach, backgroundColor:'#fca5a5', stack:'loss' },
                { label:'Sorties consultant', data: lostExit, backgroundColor:'#f87171', stack:'loss' },
                { label:'Pool (churn)', data: lostPool, backgroundColor:'#ef4444', stack:'loss' },
              ] }} options={{ responsive:true, maintainAspectRatio:false, animation:false, plugins:{legend:{position:'bottom'}}, scales:{ x:{ stacked:true }, y:{ stacked:true } } }} />
            </div>
          </div>
          <div className="panel p-3 min-h-0 overflow-auto">
            <div className="font-semibold mb-2">Table mensuelle (détails)</div>
            <div className="tableWrap">
              <table className="w-full text-sm">
                <thead className="stickyHead"><tr>
                  <th className="border-b border-line p-2 text-left">Mois</th>
                  <th className="border-b border-line p-2 text-left">Consultants actifs</th>
                  <th className="border-b border-line p-2 text-left">Actifs INITIAL</th>
                  <th className="border-b border-line p-2 text-left">Actifs BASE</th>
                  <th className="border-b border-line p-2 text-left">Actifs ROCO</th>
                  <th className="border-b border-line p-2 text-left">Clients actifs</th>
                  <th className="border-b border-line p-2 text-left">Acquis</th>
                  <th className="border-b border-line p-2 text-left">Perdus (attachés)</th>
                  <th className="border-b border-line p-2 text-left">Perdus (sorties)</th>
                  <th className="border-b border-line p-2 text-left">Churn (pool)</th>
                  <th className="border-b border-line p-2 text-left">Pool actifs</th>
                  <th className="border-b border-line p-2 text-left">Revenu</th>
                  <th className="border-b border-line p-2 text-left">BASE recruits</th>
                  <th className="border-b border-line p-2 text-left">ROCO recruits</th>
                  <th className="border-b border-line p-2 text-left">Exits</th>
                </tr></thead>
                <tbody>
                  {res.monthly.map(r=> {
                    const snap = res.cacheByMonth[r.monthIndex]
                    const byOrigin = { INITIAL:0, BASE:0, ROCO:0 } as any
                    snap.consultants.forEach((c:any)=>{ if (c.isActive) byOrigin[c.origin]++ })
                    return (
                      <tr key={r.monthIndex} className="hover:bg-slate-50">
                        <td className="border-b border-line p-2">{r.ym}</td>
                        <td className="border-b border-line p-2">{r.activeConsultants}</td>
                        <td className="border-b border-line p-2">{byOrigin.INITIAL}</td>
                        <td className="border-b border-line p-2">{byOrigin.BASE}</td>
                        <td className="border-b border-line p-2">{byOrigin.ROCO}</td>
                        <td className="border-b border-line p-2">{r.activeAttachedClients}</td>
                        <td className="border-b border-line p-2">{r.clientsGained}</td>
                        <td className="border-b border-line p-2">{r.clientsLostAttachedChurn}</td>
                        <td className="border-b border-line p-2">{r.clientsLostExitWith + r.clientsLostExitPartial}</td>
                        <td className="border-b border-line p-2">{r.poolChurned}</td>
                        <td className="border-b border-line p-2">{r.poolActive}</td>
                        <td className="border-b border-line p-2">{Math.round(r.revenue)}</td>
                        <td className="border-b border-line p-2">{r.baseRecruitsAdded}</td>
                        <td className="border-b border-line p-2">{r.rocoRecruitsAdded}</td>
                        <td className="border-b border-line p-2">{r.consultantsExited}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <div className="panel p-3 h-[360px]">
            <div className="font-semibold mb-2">Vue annuelle — Créations & Clients fin d'année</div>
            <div className="h-[300px]">
              <Line data={{ labels: labsY, datasets:[
                { label:'Créations BASE', data: res.annual.map(a=>a.baseRecruits), borderColor:'#60a5fa', pointRadius:0 },
                { label:'Créations ROCO', data: res.annual.map(a=>a.rocoRecruits), borderColor:'#22c55e', pointRadius:0 },
                { label:"Clients actifs fin d'année", data: endClientsPerYear, borderColor:'#2563eb', pointRadius:0 },
                { label:'Moy. clients/consultant (fin)', data: res.annual.map(a=>a.avgClientsPerConsultantEnd), borderColor:'#f59e0b', pointRadius:0 },
              ] }} options={{ responsive:true, maintainAspectRatio:false, animation:false, plugins:{legend:{position:'bottom'}} }} />
            </div>
          </div>
          <div className="panel p-3 min-h-0 overflow-auto">
            <div className="font-semibold mb-2">Table annuelle</div>
            <div className="tableWrap">
              <table className="w-full text-sm">
                <thead className="stickyHead"><tr>
                  <th className="border-b border-line p-2 text-left">Année</th>
                  <th className="border-b border-line p-2 text-left">Nouveaux</th>
                  <th className="border-b border-line p-2 text-left">BASE</th>
                  <th className="border-b border-line p-2 text-left">ROCO</th>
                  <th className="border-b border-line p-2 text-left">Clients actifs fin d'année</th>
                  <th className="border-b border-line p-2 text-left">Clients gagnés (année)</th>
                  <th className="border-b border-line p-2 text-left">Clients perdus (année)</th>
                  <th className="border-b border-line p-2 text-left">Exits consultants (année)</th>
                  <th className="border-b border-line p-2 text-left">Moy. clients/consultant (fin)</th>
                </tr></thead>
                <tbody>
                  {res.annual.map((a,i)=> {
                    const year = a.year
                    const rows = res.monthly.filter(r=> r.ym.startsWith(String(year)))
                    const gainedYear = rows.reduce((s,r)=> s + r.clientsGained, 0)
                    const lostYear = rows.reduce((s,r)=> s + r.clientsLostAttachedChurn + r.clientsLostExitWith + r.clientsLostExitPartial + r.poolChurned, 0)
                    const exitsYear = rows.reduce((s,r)=> s + r.consultantsExited, 0)
                    return (
                      <tr key={a.year} className="hover:bg-slate-50">
                        <td className="border-b border-line p-2">{a.year}</td>
                        <td className="border-b border-line p-2">{a.newConsultants}</td>
                        <td className="border-b border-line p-2">{a.baseRecruits}</td>
                        <td className="border-b border-line p-2">{a.rocoRecruits}</td>
                        <td className="border-b border-line p-2">{endClientsPerYear[i]}</td>
                        <td className="border-b border-line p-2">{gainedYear}</td>
                        <td className="border-b border-line p-2">{lostYear}</td>
                        <td className="border-b border-line p-2">{exitsYear}</td>
                        <td className="border-b border-line p-2">{a.avgClientsPerConsultantEnd.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatsScope(){
  const res = useSimStore(s=>s.result)!
  const [mode, setMode] = useState<'global'|'year'|'month'>('global')
  const [year, setYear] = useState(res ? Number(res.months[0].slice(0,4)) : 0)
  const [monthIdx, setMonthIdx] = useState(0)
  const [cumul, setCumul] = useState(true)
  const monthly = res.monthly
  let rows = monthly
  if (mode==='year') rows = monthly.filter(r=> r.ym.startsWith(String(year)))
  if (mode==='month') rows = cumul ? monthly.slice(0, monthIdx+1) : [monthly[monthIdx]]
  const stats = computeStats(rows, res.params.startConsultants)
  const num = (n:number)=> new Intl.NumberFormat('fr-FR').format(Math.round(n))
  const pct = (x:number)=> (x*100).toFixed(1)+'%'
  const years = Array.from(new Set(res.months.map(m=> m.slice(0,4)))).map(Number)
  return (
    <div className="panel p-3">
      <div className="font-semibold mb-2">Synthèse paramétrable</div>
      <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
        <label>Portée <Info text="Choisissez la période sur laquelle calculer la synthèse."/>
          <select className="border border-line rounded px-2 py-1 ml-1" value={mode} onChange={e=>setMode(e.target.value as any)}>
            <option value="global">Globale</option>
            <option value="year">Année</option>
            <option value="month">Mois</option>
          </select>
        </label>
        {mode==='year' && (
          <label>Année <Info text="Filtre sur l’année civile."/>
            <select className="border border-line rounded px-2 py-1 ml-1" value={year} onChange={e=>setYear(Number(e.target.value))}>
              {years.map(y=> <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        )}
        {mode==='month' && (
          <label>Mois <Info text="Choisissez un mois de référence."/>
            <select className="border border-line rounded px-2 py-1 ml-1" value={monthIdx} onChange={e=>setMonthIdx(Number(e.target.value))}>
              {res.months.map((m,i)=> <option key={m} value={i}>{m}</option>)}
            </select>
          </label>
        )}
        {mode==='month' && (
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={cumul} onChange={e=>setCumul(e.target.checked)} /> Cumul jusqu’à <Info text="Cumul de 0 au mois sélectionné (sinon: uniquement le mois)."/></label>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <K k={<span>Clients actifs (fin) <Info text="Clients actifs à la fin de la période considérée."/></span>} v={num(stats.activeClientsEnd)} />
        <K k={<span>Clients acquis (total) <Info text="Somme des clients ajoutés par la production."/></span>} v={num(stats.totalGained)} />
        <K k={<span>Clients perdus (total) <Info text="Churn attachés + pertes sorties + churn pool."/></span>} v={num(stats.totalLost)} />
        <K k={<span>Perte globale clients (%) <Info text="Total perdus / Total acquis (≠ taux mensuel configuré)."/></span>} v={pct(stats.churnPctClients)} />
        <K k={<span>Moy. clients/consultant (fin) <Info text="Clients actifs / Consultants actifs (fin)."/></span>} v={stats.avgEnd.toFixed(2)} />
        <K k={<span>Moy. clients/consultant (période) <Info text="Moyenne des ratios mensuels."/></span>} v={stats.avgOverPeriod.toFixed(2)} />
        <K k={<span>Consultants actifs (fin) <Info text="Consultants actifs à la fin de la période."/></span>} v={num(stats.activeConsultantsEnd)} />
        <K k={<span>Consultants uniques (total) <Info text="INITIAL + BASE + ROCO (période)."/></span>} v={num(stats.totalConsultantsUnique)} />
        <K k={<span>Exits consultants (total) <Info text="Somme des départs de consultants."/></span>} v={num(stats.totalExits)} />
        <K k={<span>Exits consultants (%) <Info text="Exits / Consultants uniques."/></span>} v={pct(stats.exitsPctConsultants)} />
        <K k={<span>Créés BASE <Info text="Recrutement lissé mensuellement."/></span>} v={num(stats.totalBase)} />
        <K k={<span>Créés ROCO <Info text="Recommandations (seuil + conversion)."/></span>} v={num(stats.totalRoco)} />
        <K k={<span>Perdus (attachés) <Info text="Churn des clients attachés."/></span>} v={num(stats.totalLostAttach)} />
        <K k={<span>Perdus (sorties) <Info text="Pertes quand le consultant part avec (ou partiel)."/></span>} v={num(stats.totalLostExit)} />
        <K k={<span>Churn (pool) <Info text="Churn des clients sans consultant."/></span>} v={num(stats.totalPoolChurn)} />
      </div>
    </div>
  )
}

function computeStats(rows: any[], startConsultants:number){
  if (!rows || rows.length===0){
    return { totalGained:0,totalLost:0,totalLostAttach:0,totalLostExit:0,totalPoolChurn:0,totalExits:0,totalBase:0,totalRoco:0,totalConsultantsUnique:startConsultants,avgEnd:0,avgOverPeriod:0,churnPctClients:0,exitsPctConsultants:0, activeClientsEnd:0, activeConsultantsEnd:0 }
  }
  const sum = (k:string)=> rows.reduce((a,r)=> a + (r[k] as number), 0)
  const totalGained = sum('clientsGained')
  const totalLostAttach = sum('clientsLostAttachedChurn')
  const totalLostExit = sum('clientsLostExitWith') + sum('clientsLostExitPartial')
  const totalPoolChurn = sum('poolChurned')
  const totalLost = totalLostAttach + totalLostExit + totalPoolChurn
  const totalExits = sum('consultantsExited')
  const totalBase = sum('baseRecruitsAdded')
  const totalRoco = sum('rocoRecruitsAdded')
  const totalConsultantsUnique = startConsultants + totalBase + totalRoco
  const last = rows[rows.length-1]
  const avgEnd = last.activeConsultants ? last.activeAttachedClients / last.activeConsultants : 0
  let s=0,c=0; for (const r of rows){ if (r.activeConsultants>0){ s += r.activeAttachedClients / r.activeConsultants; c++ } }
  const avgOverPeriod = c? s/c : 0
  const churnPctClients = totalGained>0 ? totalLost / totalGained : 0
  const exitsPctConsultants = totalConsultantsUnique>0 ? totalExits / totalConsultantsUnique : 0
  const activeClientsEnd = last.activeAttachedClients
  const activeConsultantsEnd = last.activeConsultants
  return { totalGained, totalLost, totalLostAttach, totalLostExit, totalPoolChurn, totalExits, totalBase, totalRoco, totalConsultantsUnique, avgEnd, avgOverPeriod, churnPctClients, exitsPctConsultants, activeClientsEnd, activeConsultantsEnd }
}

function K({k,v}:{k:React.ReactNode,v:string}){
  return <div className="p-3 rounded-xl border border-line bg-white"><div className="text-xs text-slate-500 flex items-center gap-1">{k}</div><div className="text-lg font-semibold">{v}</div></div>
}
