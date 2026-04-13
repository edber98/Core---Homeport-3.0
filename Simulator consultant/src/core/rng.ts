export function hashStringToSeed(str: string){
  let h = 2166136261 >>> 0
  for (let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function sfc32(a: number, b: number, c: number, d: number){
  return function(){
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0
    let t = (a + b) | 0
    a = b ^ b >>> 9
    b = c + (c << 3) | 0
    c = (c << 21 | c >>> 11)
    d = d + 1 | 0
    t = t + d | 0
    c = c + t | 0
    return (t >>> 0) / 4294967296
  }
}

export class Random{
  private rng: () => number
  constructor(seedStr: string){
    const base = hashStringToSeed(seedStr)
    const a = base ^ 0x9e3779b9
    const b = (base * 0x85ebca6b) >>> 0
    const c = (base ^ 0xc2b2ae35) >>> 0
    const d = (base + 0x27d4eb2f) >>> 0
    this.rng = sfc32(a,b,c,d)
  }
  next(){ return this.rng() }
  float(min=0, max=1){ return min + (max-min)*this.next() }
  int(min: number, max: number){ return Math.floor(this.float(min, max+1)) }
  chance(p: number){ return this.next() < p }
  pick<T>(arr: T[]){ return arr[Math.floor(this.next()*arr.length)] }
  shuffle<T>(arr: T[]){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(this.next()*(i+1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
}

export function indexToYM(startYM: string, idx: number){
  const [y, m] = startYM.split('-').map(Number)
  const y2 = y + Math.floor((m - 1 + idx)/12)
  const m2 = ((m - 1 + idx) % 12) + 1
  return `${y2}-${String(m2).padStart(2,'0')}`
}

