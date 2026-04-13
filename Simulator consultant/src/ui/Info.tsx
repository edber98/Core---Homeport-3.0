import { useState } from 'react'

export function Info({text}:{text:string}){
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button type="button" aria-label="Info" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} className="ml-1 inline-flex items-center justify-center w-4 h-4 text-slate-600 bg-slate-100 rounded-full text-[10px]">i</button>
      {open && (
        <div className="absolute z-50 top-6 left-0 w-64 p-2 text-xs bg-white border border-line rounded shadow-soft">
          {text}
        </div>
      )}
    </span>
  )
}

