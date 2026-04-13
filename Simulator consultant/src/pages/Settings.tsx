import { useSimStore } from '../store/simStore'
import { Info } from '../ui/Info'
import { useMemo } from 'react'

export default function SettingsPage(){
  const { params, setParams, run } = useSimStore()
  const summary = useMemo(()=> buildSummary(params), [params])
  const field = (label:string, id:keyof typeof params, type='number', step?:number)=> (
    <label className="text-sm grid gap-1">
      <span className="text-slate-600">{label}</span>
      <input className="border border-line rounded px-2 py-1" type={type} step={step} value={(params as any)[id]} onChange={e=>{
        const v = type==='number' ? Number(e.target.value) : e.target.value
        setParams({ [id]: v } as any)
      }} />
    </label>
  )
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="panel p-3 grid grid-cols-2 gap-3">
        {field('Start date','startDate','month')}
        {field('Months','monthsTotal')}
        {field('Seed','seed','text')}
        {field('Consultants init.','startConsultants')}
        {field('Recruits / year','recruitsPerYear')}
        {field('Recruit growth %','recruitGrowthPct', 'number', 0.01)}
        {field('Ramp (months)','rampMonths')}
        {field('Activity mean','activityMean', 'number', 0.01)}
        {field('Min clients / mo','minClientsPerMonth')}
        {field('Max clients / mo','maxClientsPerMonth')}
        {field('Max portfolio','maxPortfolio')}
        {field('Client churn %','clientChurnPct', 'number', 0.001)}
        {field('Pool churn multiplier','poolChurnMultiplier', 'number', 0.01)}
        {field('Consultant churn %','consultantChurnPct', 'number', 0.001)}
        {field('Leave with %','leaveWithClientsPct', 'number', 0.01)}
        {field('Partial retention %','partialRetentionPct', 'number', 0.01)}
        {field('Partial share (0-1)','partialRetentionShare', 'number', 0.05)}
        <label className="text-sm grid gap-1"><span>ROCO: tous les X projets <Info text="Seuil de projets gagnés par un consultant avant de déclencher une recommandation (ROCO)."/></span><input className="border border-line rounded px-2 py-1" type="number" value={params.projectsPerReferral} onChange={e=>setParams({ projectsPerReferral: Number(e.target.value) })} /></label>
        <label className="text-sm grid gap-1"><span>ROCO: taux de conversion (0–1) <Info text="Probabilité qu’un déclencheur ROCO crée réellement un nouveau consultant (ex: 0.7 = 70%)."/></span><input className="border border-line rounded px-2 py-1" type="number" step={0.01} value={params.referralConv} onChange={e=>setParams({ referralConv: Number(e.target.value) })} /></label>
        {field('Marketplace %','marketplacePct', 'number', 0.01)}
        {field('€ per client / mo','marketplaceEurPerClient')}
        {field('Speed (ms/mo)','speedMs')}
        <label className="text-sm grid gap-1">
          <span className="text-slate-600">Layout</span>
          <select className="border border-line rounded px-2 py-1" value={params.layoutMode} onChange={e=>setParams({ layoutMode: e.target.value as any })}>
            <option value="seniority">Par ancienneté (grille)</option>
            <option value="seniority-exited-right">Ancienneté + sortis à droite</option>
          </select>
        </label>
      </div>
      <div className="panel p-3">
        <div className="font-semibold mb-2">Presets</div>
        <div className="flex gap-2 flex-wrap">
          <button className="bg-slate-800 text-white rounded px-3 py-1" onClick={()=>setParams({ recruitsPerYear:3, recruitGrowthPct:0.1, referralConv:0.5, clientChurnPct:0.03, consultantChurnPct:0.03 })}>Pessimiste</button>
          <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={()=>setParams({ recruitsPerYear:5, recruitGrowthPct:0.2, referralConv:0.7, clientChurnPct:0.02, consultantChurnPct:0.025 })}>Réaliste</button>
          <button className="bg-amber-500 text-white rounded px-3 py-1" onClick={()=>setParams({ recruitsPerYear:8, recruitGrowthPct:0.3, referralConv:0.8, clientChurnPct:0.015, consultantChurnPct:0.02 })}>Ambitieux</button>
          <button className="bg-green-600 text-white rounded px-3 py-1" onClick={()=>setParams({ seed: String(Math.floor(Math.random()*1e9)) })}>Random seed</button>
          <button className="bg-indigo-600 text-white rounded px-3 py-1" onClick={run}>Run</button>
        </div>
      </div>
      <div className="panel p-3">
        <div className="font-semibold mb-2">Paramètres (JSON)</div>
        <pre className="bg-slate-50 border border-line rounded p-2 text-sm overflow-auto max-h-[420px]">{JSON.stringify(params, null, 2)}</pre>
      </div>
      <div className="panel p-3 xl:col-span-3">
        <div className="font-semibold mb-2">Synthèse textuelle</div>
        <p className="text-sm leading-6 bg-slate-50 border border-line rounded p-3">{summary}</p>
      </div>
    </div>
  )
}

function buildSummary(p: any){
  const fmtMonth = (ym:string)=>{
    try {
      const [y,m] = ym.split('-').map((x:string)=>Number(x))
      const d = new Date(y, m-1, 1)
      return d.toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
        .replace(/^(\w)/, (c)=>c.toUpperCase())
    } catch { return ym }
  }
  const parts = [] as string[]
  parts.push(`Simulation de ${fmtMonth(p.startDate)} pour ${p.monthsTotal} mois`)
  parts.push(`Seed ${p.seed}`)
  parts.push(`${p.startConsultants} consultant${p.startConsultants>1?'s':''} initial${p.startConsultants>1?'aux':''}`)
  parts.push(`${p.recruitsPerYear} recrutements BASE/an avec ${Math.round(p.recruitGrowthPct*100)}% de croissance annuelle`)
  parts.push(`Ramp-up ${p.rampMonths} mois, activité moyenne ${Math.round(p.activityMean*100)}%`)
  parts.push(`Production ${p.minClientsPerMonth}–${p.maxClientsPerMonth} clients/mois, portefeuille max ${p.maxPortfolio} clients`)
  parts.push(`Churn clients ${Math.round(p.clientChurnPct*1000)/10}%/mois, pool ×${p.poolChurnMultiplier}`)
  parts.push(`Churn consultant ${Math.round(p.consultantChurnPct*1000)/10}%/mois (part avec ${Math.round(p.leaveWithClientsPct*100)}%, partiel ${Math.round(p.partialRetentionPct*100)}%)`)
  parts.push(`ROCO: tous les ${p.projectsPerReferral} projets, conversion ${Math.round(p.referralConv*100)}%`)
  parts.push(`Marketplace: ${Math.round(p.marketplacePct*100)}% des vivants à ${p.marketplaceEurPerClient} €/client/mois`)
  return parts.join(' · ')
}
