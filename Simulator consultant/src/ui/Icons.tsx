export function IconDashboard(props:any){ return (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}><path d="M3 12h7V3H3v9Zm0 9h7v-7H3v7Zm11 0h7V12h-7v9Zm0-18v7h7V3h-7Z"/></svg>) }
export function IconSim(props:any){ return (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}><circle cx="7" cy="12" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9.5 10.5 14.5 8.5M9.5 13.5 14.5 15.5"/></svg>) }
export function IconUsers(props:any){ return (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}><path d="M16 14a4 4 0 1 0-8 0v2H3v3h18v-3h-5v-2Z"/><circle cx="12" cy="7" r="3"/></svg>) }
export function IconClients(props:any){ return (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M11 7h2v10h-2z"/></svg>) }
export function IconCharts(props:any){ return (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}><path d="M4 20V4m0 16h16"/><rect x="6" y="12" width="3" height="6"/><rect x="11" y="8" width="3" height="10"/><rect x="16" y="5" width="3" height="13"/></svg>) }
export function IconExport(props:any){ return (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}><path d="M12 3v12m0-12 4 4m-4-4-4 4"/><rect x="4" y="13" width="16" height="8" rx="2"/></svg>) }
export function IconSettings(props:any){ return (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M19.4 15a7.96 7.96 0 0 0 0-6M4.6 9a7.96 7.96 0 0 0 0 6"/></svg>) }
export function IconMenu(props:any){ return (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>) }

export function BadgeOrigin({origin}:{origin:'INITIAL'|'BASE'|'ROCO'}){
  const map = { INITIAL: { cls:'bg-slate-100 text-slate-800', label:'INITIAL: existants au démarrage' }, BASE: { cls:'bg-amber-100 text-amber-800', label:'BASE: recrutement base (lissé mensuel)' }, ROCO: { cls:'bg-emerald-100 text-emerald-800', label:'ROCO: par recommandation (seuil + conversion)' } }
  const m = (map as any)[origin]
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.cls}`} title={m.label}>{origin}</span>
}

