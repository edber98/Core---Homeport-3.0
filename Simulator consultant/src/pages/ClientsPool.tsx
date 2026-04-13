import { useSimStore } from '../store/simStore'

export default function ClientsPoolPage(){
  const { result, selectedMonth } = useSimStore()
  if (!result) return null
  const snap = result.cacheByMonth[selectedMonth]
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="panel p-3">
        <div className="font-semibold mb-2">Pool (mois courant)</div>
        <div className="tableWrap">
          <table className="w-full text-sm">
            <thead className="stickyHead"><tr>
              <th className="border-b border-line p-2 text-left">ClientID</th>
              <th className="border-b border-line p-2 text-left">Origin consultant</th>
              <th className="border-b border-line p-2 text-left">Pool start</th>
              <th className="border-b border-line p-2 text-left">Exit consultant M</th>
            </tr></thead>
            <tbody>
              {snap.pool.slice(0,5000).map(p=> (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="border-b border-line p-2">{p.id}</td>
                  <td className="border-b border-line p-2">{p.originConsultantId??''}</td>
                  <td className="border-b border-line p-2">{p.poolStartMonthIndex!=null? useSimStore.getState().result?.months[p.poolStartMonthIndex]:''}</td>
                  <td className="border-b border-line p-2">{p.poolFromConsultantExitMonth!=null? useSimStore.getState().result?.months[p.poolFromConsultantExitMonth]:''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel p-3">
        <div className="font-semibold mb-2">Clients (tous)</div>
        <div className="tableWrap">
          <table className="w-full text-sm">
            <thead className="stickyHead"><tr>
              <th className="border-b border-line p-2 text-left">ID</th>
              <th className="border-b border-line p-2 text-left">Origin</th>
              <th className="border-b border-line p-2 text-left">Attached</th>
              <th className="border-b border-line p-2 text-left">Start M</th>
              <th className="border-b border-line p-2 text-left">End M</th>
              <th className="border-b border-line p-2 text-left">End reason</th>
            </tr></thead>
            <tbody>
              {result.clientsAll.slice(0,10000).map(c=> (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="border-b border-line p-2">{c.id}</td>
                  <td className="border-b border-line p-2">{c.originConsultantId??''}</td>
                  <td className="border-b border-line p-2">{c.attachedConsultantId??''}</td>
                  <td className="border-b border-line p-2">{useSimStore.getState().result?.months[c.startMonthIndex]}</td>
                  <td className="border-b border-line p-2">{c.endMonthIndex!=null? useSimStore.getState().result?.months[c.endMonthIndex]:''}</td>
                  <td className="border-b border-line p-2">{c.endReason??''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
