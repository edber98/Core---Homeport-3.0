import { indexToYM } from '../core/rng'
import type { SimResult } from '../core/types'

export function ymFromIndex(res: SimResult, idx: number | null | undefined){
  if (idx==null) return ''
  return indexToYM(res.params.startDate, idx)
}

