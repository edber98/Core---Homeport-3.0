import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSimStore } from '../store/simStore'
import { IconCharts, IconClients, IconDashboard, IconExport, IconMenu, IconSettings, IconSim, IconUsers } from './Icons'

export default function AppLayout(){
  const run = useSimStore(s=>s.run)
  useEffect(()=>{ run() }, [run])
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const title = {
    '/': 'Tableau de bord', '/simulation':'Simulation', '/consultants':'Consultants', '/clients-pool':'Clients & Pool', '/analytics':'Analytique', '/exports':'Exports & Journal', '/settings':'Paramètres'
  }[loc.pathname] || 'Simulation'
  return (
    <div className="grid" style={{gridTemplateColumns: collapsed? '72px 1fr' : '280px 1fr', height:'100vh'}}>
      <aside className="hidden lg:flex flex-col border-r border-line bg-white">
        <div className="p-4 text-xl font-semibold">{collapsed? 'SS' : 'SaaS Simulator'}</div>
        <nav className="px-2 space-y-1">
          <Nav to="/" label="Tableau de bord" icon={<IconDashboard className="w-5 h-5"/>} collapsed={collapsed}/>
          <Nav to="/simulation" label="Simulation" icon={<IconSim className="w-5 h-5"/>} collapsed={collapsed}/>
          <Nav to="/consultants" label="Consultants" icon={<IconUsers className="w-5 h-5"/>} collapsed={collapsed}/>
          <Nav to="/clients-pool" label="Clients & Pool" icon={<IconClients className="w-5 h-5"/>} collapsed={collapsed}/>
          <Nav to="/analytics" label="Analytique" icon={<IconCharts className="w-5 h-5"/>} collapsed={collapsed}/>
          <Nav to="/results" label="Résultats" icon={<IconCharts className="w-5 h-5"/>} collapsed={collapsed}/>
          <Nav to="/targets" label="Objectifs" icon={<IconCharts className="w-5 h-5"/>} collapsed={collapsed}/>
          <Nav to="/exports" label="Exports & Journal" icon={<IconExport className="w-5 h-5"/>} collapsed={collapsed}/>
          <Nav to="/settings" label="Paramètres" icon={<IconSettings className="w-5 h-5"/>} collapsed={collapsed}/>
        </nav>
      </aside>
      <main className="min-h-0 flex flex-col">
        <header className="border-b border-line bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="lg:inline-flex hidden p-2 border border-line rounded" onClick={()=>setCollapsed(v=>!v)} title={collapsed?'Agrandir la barre':'Réduire la barre'}>
              <IconMenu className="w-5 h-5"/>
            </button>
            <div className="text-lg font-semibold">{title}</div>
          </div>
          <ScenarioBar />
        </header>
        <section className="min-h-0 flex-1 overflow-auto p-3 lg:p-4">
          <Outlet />
        </section>
      </main>
    </div>
  )
}

function Nav({to,label,icon,collapsed}:{to:string,label:string,icon:React.ReactNode,collapsed:boolean}){
  return (
    <NavLink to={to} className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive?'bg-blue-600 text-white':'hover:bg-slate-100'}`} title={collapsed?label:undefined}>
      {icon}
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}

function ScenarioBar(){
  const { params, setParams, run, result, selectedMonth, setMonth } = useSimStore()
  return (
    <div className="flex items-center gap-3 text-sm flex-wrap justify-end">
      <label className="hidden md:flex items-center gap-1">Seed <input className="border border-line rounded px-2 py-1 w-28" value={params.seed} onChange={e=>setParams({seed:e.target.value})}/></label>
      <label className="hidden md:flex items-center gap-1">Début <input className="border border-line rounded px-2 py-1" type="month" value={params.startDate} onChange={e=>setParams({startDate:e.target.value})}/></label>
      <label className="hidden md:flex items-center gap-1">Mois <input className="border border-line rounded px-2 py-1 w-20" type="number" min={12} max={240} value={params.monthsTotal} onChange={e=>setParams({monthsTotal: Number(e.target.value)})}/></label>
      {result && (
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={result.months.length-1} value={selectedMonth} onChange={e=>setMonth(Number(e.target.value))} />
          <span className="text-slate-600">{result.months[selectedMonth]}</span>
        </div>
      )}
      <select className="border border-line rounded px-2 py-1" defaultValue="realistic" onChange={e=>{
        const k = e.target.value
        if (k==='pess'){ setParams({ recruitsPerYear:3, recruitGrowthPct:0.1, referralConv:0.5, clientChurnPct:0.03, consultantChurnPct:0.03 }) }
        if (k==='realistic'){ setParams({ recruitsPerYear:5, recruitGrowthPct:0.2, referralConv:0.7, clientChurnPct:0.02, consultantChurnPct:0.025 }) }
        if (k==='amb'){ setParams({ recruitsPerYear:8, recruitGrowthPct:0.3, referralConv:0.8, clientChurnPct:0.015, consultantChurnPct:0.02 }) }
      }}>
        <option value="pess">Pessimiste</option>
        <option value="realistic">Réaliste</option>
        <option value="amb">Ambitieux</option>
      </select>
      <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={run}>Lancer</button>
    </div>
  )
}
