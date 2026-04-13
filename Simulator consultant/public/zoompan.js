export class ZoomPanCanvas{
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;
    this.offset = {x:0,y:0};
    this.dragging = false; this.last = {x:0,y:0};
    canvas.addEventListener('wheel', e=>{
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left);
      const my = (e.clientY - rect.top);
      const delta = -Math.sign(e.deltaY) * 0.1;
      const newScale = Math.min(4, Math.max(0.25, this.scale * (1 + delta)));
      const sx = mx/this.scale - this.offset.x;
      const sy = my/this.scale - this.offset.y;
      this.scale = newScale;
      this.offset.x = mx/this.scale - sx;
      this.offset.y = my/this.scale - sy;
      this.onChange?.();
    }, {passive:false});
    canvas.addEventListener('mousedown', e=>{
      this.dragging = true; this.last = {x:e.clientX, y:e.clientY};
    });
    window.addEventListener('mouseup', ()=> this.dragging=false);
    window.addEventListener('mousemove', e=>{
      if (!this.dragging) return;
      const dx = (e.clientX - this.last.x)/this.scale;
      const dy = (e.clientY - this.last.y)/this.scale;
      this.offset.x += dx; this.offset.y += dy; this.last = {x:e.clientX, y:e.clientY};
      this.onChange?.();
    });
  }
  clear(){
    const {ctx, canvas} = this; ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }
  withTransform(fn){
    const {ctx} = this; ctx.save();
    ctx.setTransform(this.scale,0,0,this.scale,0,0);
    ctx.translate(this.offset.x, this.offset.y);
    fn(ctx);
    ctx.restore();
  }
  screenToWorld(x,y){
    return { x: x/this.scale - this.offset.x, y: y/this.scale - this.offset.y };
  }
}

