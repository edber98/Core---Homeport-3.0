import { useMemo, useState } from 'react'
import { useSimStore } from '../store/simStore'
import { BadgeOrigin } from '../ui/Icons'
import ConsultantInspector from '../ui/ConsultantInspector'

export default function ConsultantsPage(){
  const { result, selectedMonth, selectConsultant } = useSimStore()
  const snap = useMemo(()=> result?.cacheByMonth[selectedMonth], [result, selectedMonth])
  const [filter, setFilter] = useState<'ALL'|'INITIAL'|'BASE'|'ROCO'>('ALL')
  const [status, setStatus] = useState<'ALL'|'ALIVE'|'EXITED'>('ALL')
  if (!result || !snap) return null
  let rows = snap.consultants.slice()
  if (filter!=='ALL') rows = rows.filter(r=>r.origin===filter)
  if (status==='ALIVE') rows = rows.filter(r=>r.isActive)
  if (status==='EXITED') rows = rows.filter(r=>!r.isActive)
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
      <div className="panel p-3 min-h-0 overflow-auto">
      <div className="mb-3 text-sm text-slate-600">
        <span className="mr-2">Légende:</span>
        <BadgeOrigin origin="INITIAL"/> <span className="mx-1"/> <BadgeOrigin origin="BASE"/> <span className="mx-1"/> <BadgeOrigin origin="ROCO"/>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <select className="border border-line rounded px-2 py-1" value={filter} onChange={e=>setFilter(e.target.value as any)}>
          <option value="ALL">Toutes origines</option>
          <option value="INITIAL">INITIAL</option>
          <option value="BASE">BASE</option>
          <option value="ROCO">ROCO</option>
        </select>
        <select className="border border-line rounded px-2 py-1" value={status} onChange={e=>setStatus(e.target.value as any)}>
          <option value="ALL">Tous statuts</option>
          <option value="ALIVE">Actifs</option>
          <option value="EXITED">Sortis</option>
        </select>
      </div>
      <div className="tableWrap">
        <table className="w-full text-sm">
          <thead className="stickyHead">
            <tr>
              <th className="border-b border-line p-2 text-left">ID</th>
              <th className="border-b border-line p-2 text-left">Origine</th>
              <th className="border-b border-line p-2 text-left">Créé</th>
              <th className="border-b border-line p-2 text-left">Fin</th>
              <th className="border-b border-line p-2 text-left">Actif</th>
              <th className="border-b border-line p-2 text-left">Clients actifs</th>
              <th className="border-b border-line p-2 text-left">Projets</th>
              <th className="border-b border-line p-2 text-left">ROCO créés</th>
              <th className="border-b border-line p-2 text-left">Churn</th>
              <th className="border-b border-line p-2 text-left">Perdus sortie</th>
              <th className="border-b border-line p-2 text-left">Vers pool</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c)=> (
              <tr key={c.id} className={`hover:bg-slate-50 cursor-pointer ${c.isActive?'':'text-slate-400'}`} onClick={()=>selectConsultant(c.id)}>
                <td className="border-b border-line p-2">{c.id}</td>
                <td className="border-b border-line p-2"><BadgeOrigin origin={c.origin as any}/></td>
                <td className="border-b border-line p-2">{useSimStore.getState().result?.months[c.createdMonthIndex]}</td>
                <td className="border-b border-line p-2">{c.exitMonthIndex!=null? useSimStore.getState().result?.months[c.exitMonthIndex] : ''}</td>
                <td className="border-b border-line p-2">{c.isActive?1:0}</td>
                <td className="border-b border-line p-2">{c.clientsCount}</td>
                <td className="border-b border-line p-2">{c.projectsWon}</td>
                <td className="border-b border-line p-2">{c.rocoCreatedTotal}</td>
                <td className="border-b border-line p-2">{c.churnedByConsultant}</td>
                <td className="border-b border-line p-2">{c.lostAtExit}</td>
                <td className="border-b border-line p-2">{c.transferredToPool}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      <div className="panel p-3 min-h-0 overflow-auto">
        <div className="font-semibold mb-2">Détails consultant</div>
        <ConsultantInspector />
      </div>
    </div>
  )
}
