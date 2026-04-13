import { useEffect, useRef } from 'react'
import { useSimStore } from '../store/simStore'

export default function BubbleVizCanvas(){
  const ref = useRef<HTMLCanvasElement>(null)
  const { result, selectedMonth, selectConsultant, selectedConsultantId } = useSimStore()

  // simple zoom/pan state
  const state = useRef({ scale: 1, offX: 0, offY: 0, dragging: false, lastX:0, lastY:0 })
  const clickable = useRef<{x:number,y:number,r:number,id:number}[]>([])

  useEffect(()=>{
    const canvas = ref.current!
    const dpr = window.devicePixelRatio || 1
    const height = 520
    canvas.width = canvas.clientWidth * dpr
    canvas.height = height * dpr
    canvas.style.height = height+'px'
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, selectedMonth, selectedConsultantId])

  function draw(){
    const r = result; if (!r) return
    const s = state.current
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!
    const snap = r.cacheByMonth[selectedMonth]
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.setTransform(s.scale,0,0,s.scale,0,0)
    ctx.translate(s.offX, s.offY)
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-200,-200,4000,4000)

    // Toujours trier par ordre d'arrivée (mois de création), puis par id
    const cons = snap.consultants
      .slice()
      .sort((a,b)=> (a.createdMonthIndex - b.createdMonthIndex) || (a.id - b.id))
    const cols = Math.ceil(Math.sqrt(cons.length)); const gap=40; const cell=160
    const nodes: {x:number,y:number,data:any}[] = []
    cons.forEach((c,i)=>{ const row = Math.floor(i/cols), col=i%cols; nodes.push({ x: col*(cell+gap), y: row*(cell+gap), data: c }) })
    clickable.current = []
    const baseR=24; const scaleR=(cnt:number)=> baseR + 2.2*Math.sqrt(cnt)
    for (const n of nodes){
      const c = n.data; const radius = scaleR(c.clientsCount)
      const isSel = selectedConsultantId===c.id
      ctx.beginPath(); ctx.arc(n.x, n.y, radius+8, 0, Math.PI*2)
      ctx.fillStyle = isSel?'rgba(37,99,235,0.18)':'rgba(2,6,23,0.05)'; ctx.fill()
      ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI*2)
      ctx.fillStyle = c.isActive ? '#22c55e' : '#94a3b8'; ctx.fill()
      ctx.fillStyle = '#0f172a'; ctx.font = '12px Poppins, sans-serif'; ctx.textAlign='center'
      const status = c.isActive?'':' • sorti'
      ctx.fillText(`#${c.id} • ${c.clientsCount} clients${status}`, n.x, n.y+radius+14)
      // dots
      const dots = Math.min(c.clientsCount, 120); const dcols = Math.ceil(Math.sqrt(dots)); const sp = Math.min(10, radius*1.3/dcols)
      const sx = n.x - (dcols-1)*sp/2; const sy = n.y + radius*0.2
      ctx.fillStyle = '#1f2937'
      for(let i=0;i<dots;i++){ const r = Math.floor(i/dcols), col=i%dcols; ctx.fillRect(sx+col*sp-1, sy+r*sp-1, 2,2) }
      clickable.current.push({ x:n.x, y:n.y, r:radius, id:c.id })
    }

    // Pool zone
    const heightRows = Math.ceil(cons.length/cols); const poolY = heightRows*(cell+gap)+40
    ctx.fillStyle='#f1f5f9'; ctx.fillRect(-20,poolY-30, 700,220); ctx.strokeStyle='#e2e8f0'; ctx.strokeRect(-20,poolY-30,700,220)
    ctx.fillStyle='#334155'; ctx.font='14px Poppins, sans-serif'; ctx.fillText(`Sans consultant (pool) — ${snap.pool.length}`, 0, poolY-40)
    ctx.fillStyle='#60a5fa'; const maxDots=Math.min(snap.pool.length,1000); const pc=40; const psp=14
    for (let i=0;i<maxDots;i++){ const r=Math.floor(i/pc), col=i%pc; ctx.fillRect(0+col*psp, poolY+r*psp, 3,3) }
  }

  useEffect(()=>{
    const el = ref.current!
    const s = state.current
    const onWheel = (e: WheelEvent)=>{
      e.preventDefault()
      const rect = el.getBoundingClientRect(); const mx=e.clientX-rect.left; const my=e.clientY-rect.top
      const delta = -Math.sign(e.deltaY)*0.1; const newScale = Math.min(4, Math.max(0.25, s.scale*(1+delta)))
      const sx = mx/s.scale - s.offX; const sy = my/s.scale - s.offY
      s.scale = newScale; s.offX = mx/s.scale - sx; s.offY = my/s.scale - sy
      draw()
    }
    const onDown = (e: MouseEvent)=>{ s.dragging=true; s.lastX=e.clientX; s.lastY=e.clientY }
    const onUp = ()=>{ s.dragging=false }
    const onMove = (e: MouseEvent)=>{ if(!s.dragging) return; s.offX += (e.clientX - s.lastX)/s.scale; s.offY += (e.clientY - s.lastY)/s.scale; s.lastX=e.clientX; s.lastY=e.clientY; draw() }
    const onClick = (e: MouseEvent)=>{
      const rect = el.getBoundingClientRect(); const x=(e.clientX-rect.left)/state.current.scale - state.current.offX; const y=(e.clientY-rect.top)/state.current.scale - state.current.offY
      for (const n of clickable.current){ const dx=x-n.x, dy=y-n.y; if (dx*dx+dy*dy<=n.r*n.r){ selectConsultant(n.id); break } }
    }
    el.addEventListener('wheel', onWheel, { passive:false })
    el.addEventListener('mousedown', onDown); window.addEventListener('mouseup', onUp); window.addEventListener('mousemove', onMove); el.addEventListener('click', onClick)
    return ()=>{ el.removeEventListener('wheel', onWheel); el.removeEventListener('mousedown', onDown); window.removeEventListener('mouseup', onUp); window.removeEventListener('mousemove', onMove); el.removeEventListener('click', onClick) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, selectedMonth])

  return <canvas ref={ref} className="w-full" />
}
