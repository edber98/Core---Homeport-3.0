// Seeded RNG utilities for determinism
export function hashStringToSeed(str){
  let h = 2166136261 >>> 0;
  for (let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// sfc32 PRNG
export function sfc32(a, b, c, d){
  return function(){
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

export class Random{
  constructor(seedStr){
    const base = hashStringToSeed(seedStr);
    // derive 4 seeds deterministically
    const a = base ^ 0x9e3779b9;
    const b = (base * 0x85ebca6b) >>> 0;
    const c = (base ^ 0xc2b2ae35) >>> 0;
    const d = (base + 0x27d4eb2f) >>> 0;
    this.rng = sfc32(a,b,c,d);
  }
  next(){ return this.rng(); }
  float(min=0, max=1){ return min + (max-min)*this.next(); }
  int(min, max){ return Math.floor(this.float(min, max+1)); }
  chance(p){ return this.next() < p; }
  pick(arr){ return arr[Math.floor(this.next()*arr.length)]; }
  shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(this.next()*(i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export function ymToIndex(startYM, ym){
  const [sy, sm] = startYM.split('-').map(Number);
  const [y,m] = ym.split('-').map(Number);
  return (y - sy) * 12 + (m - sm);
}

export function indexToYM(startYM, idx){
  const [y, m] = startYM.split('-').map(Number);
  const y2 = y + Math.floor((m - 1 + idx)/12);
  const m2 = ((m - 1 + idx) % 12) + 1;
  return `${y2}-${String(m2).padStart(2,'0')}`;
}

export function formatEuro(n){
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
}

export function download(filename, content, type='text/csv;charset=utf-8;'){ 
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

