import { create } from 'zustand'
import { defaultParams, simulate } from '../core/simulate'
import type { SimParams, SimResult } from '../core/types'

type State = {
  params: SimParams
  result: SimResult | null
  selectedMonth: number
  selectedConsultantId: number | null
}

type Actions = {
  setParams: (p: Partial<SimParams>) => void
  run: () => void
  setMonth: (m: number) => void
  selectConsultant: (id: number | null) => void
}

export const useSimStore = create<State & Actions>((set, get) => ({
  params: defaultParams,
  result: null,
  selectedMonth: 0,
  selectedConsultantId: null,
  setParams: (p) => set(s => ({ params: { ...s.params, ...p } })),
  run: () => {
    const res = simulate(get().params)
    set({ result: res, selectedMonth: 0 })
  },
  setMonth: (m) => set({ selectedMonth: m }),
  selectConsultant: (id) => {
    const res = get().result
    if (!res || id==null){ set({ selectedConsultantId: id }); return }
    // Ensure month >= creation month so details exist in current snapshot
    const foundInLatest = res.cacheByMonth.at(-1)?.consultants.find(c=>c.id===id)
    const createdM = foundInLatest?.createdMonthIndex
    if (createdM!=null && get().selectedMonth < createdM){
      set({ selectedConsultantId: id, selectedMonth: createdM })
    } else {
      set({ selectedConsultantId: id })
    }
  }
}))
