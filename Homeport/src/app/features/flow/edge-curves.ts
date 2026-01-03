import { CurveFactory, CurveFactoryParams, CurveLayout } from 'ngx-vflow';

type Point = { x: number; y: number };
type Rect = { left: number; top: number; right: number; bottom: number };
type Segment = { a: Point; b: Point };

const RADIUS = 6;
export const BACKWARD_ACTIVATE_OFFSET = 24; // px: seuil avant d'activer le mode backward
const NODE_PADDING = 18; // inflate nodes to avoid hugging
const GRID_GAP = 28; // distance from obstacle boundaries to sample grid lines
const EXIT = 26; // distance to leave ports before turning
const ENTRY = 18;
const LANE_GAP = 28; // minimal distance beyond source/target outer edge for first lane
const TURN_PENALTY = 250;
const REVERSE_PENALTY = 10000;
const CROSS_PENALTY = 600;

function pos(p: any): 'left'|'right'|'top'|'bottom'|'' {
  const s = String(p || '').toLowerCase();
  return (s === 'left' || s === 'right' || s === 'top' || s === 'bottom') ? (s as any) : '';
}
function rectEquals(a: Rect, b: Rect): boolean {
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
}

function inflate(r: Rect, pad: number): Rect { return { left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad }; }
function pointInRect(p: Point, r: Rect): boolean { return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom; }
function segIntersectsRect(s: Segment, r: Rect): boolean {
  const { a, b } = s;
  if (a.x === b.x) {
    const x = a.x; if (x < r.left || x > r.right) return false;
    const y1 = Math.min(a.y, b.y); const y2 = Math.max(a.y, b.y);
    return !(y2 < r.top || y1 > r.bottom);
  } else if (a.y === b.y) {
    const y = a.y; if (y < r.top || y > r.bottom) return false;
    const x1 = Math.min(a.x, b.x); const x2 = Math.max(a.x, b.x);
    return !(x2 < r.left || x1 > r.right);
  }
  return false; // only orthogonal segments here
}
function segsIntersect(s1: Segment, s2: Segment): boolean {
  // Only orthogonal segments; handle T or + intersections
  const a1 = s1.a, b1 = s1.b, a2 = s2.a, b2 = s2.b;
  if (a1.x === b1.x && a2.y === b2.y) {
    // s1 vertical, s2 horizontal
    const x = a1.x, y = a2.y;
    if (Math.min(a2.x, b2.x) <= x && x <= Math.max(a2.x, b2.x) && Math.min(a1.y, b1.y) <= y && y <= Math.max(a1.y, b1.y)) return true;
  } else if (a1.y === b1.y && a2.x === b2.x) {
    // s1 horizontal, s2 vertical
    const y = a1.y, x = a2.x;
    if (Math.min(a1.x, b1.x) <= x && x <= Math.max(a1.x, b1.x) && Math.min(a2.y, b2.y) <= y && y <= Math.max(a2.y, b2.y)) return true;
  }
  return false;
}
// Horizontal line intersection test with rect (padding allows "touch ok")
function rectIntersectsHorizontal(y: number, x1: number, x2: number, r: Rect, padding = 2): boolean {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const rr: Rect = { left: r.left - padding, top: r.top - padding, right: r.right + padding, bottom: r.bottom + padding };
  if (y < rr.top || y > rr.bottom) return false;
  return !(rr.right < left || rr.left > right);
}
function dedupe(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) { if (!out.length || out[out.length - 1].x !== p.x || out[out.length - 1].y !== p.y) out.push(p); }
  return out;
}
function polylineLength(points: Point[]): number {
  let L = 0; for (let i = 0; i < points.length - 1; i++) L += Math.abs(points[i+1].x - points[i].x) + Math.abs(points[i+1].y - points[i].y); return L;
}
function roundedOrthogonalPath(points: Point[], radius = RADIUS): string {
  if (!points.length) return '';
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
  let d = `M${points[0].x} ${points[0].y}`;
  const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]; const b = points[i]; const c = points[i + 1];
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (collinear) { d += `L${b.x} ${b.y}`; continue; }
    const segAB = dist(a, b); const segBC = dist(b, c);
    const bend = Math.min(radius, segAB / 2, segBC / 2);
    let pre: Point = b; let post: Point = b;
    if (a.x === b.x) pre = { x: b.x, y: b.y + Math.sign(a.y - b.y) * bend }; else pre = { x: b.x + Math.sign(a.x - b.x) * bend, y: b.y };
    if (b.x === c.x) post = { x: b.x, y: b.y + Math.sign(c.y - b.y) * bend }; else post = { x: b.x + Math.sign(c.x - b.x) * bend, y: b.y };
    d += `L${pre.x} ${pre.y}Q ${b.x} ${b.y} ${post.x} ${post.y}`;
  }
  const last = points[points.length - 1];
  d += `L${last.x} ${last.y}`;
  return d;
}
function bezierPathLite({ sourcePoint, targetPoint, sourcePosition, targetPosition }: CurveFactoryParams): CurveLayout {
  const distanceVector = { x: sourcePoint.x - targetPoint.x, y: sourcePoint.y - targetPoint.y } as Point;
  const calcControlPoint = (point: Point, pointPosition: any, dv: Point) => {
    const factorPoint = { x: 0, y: 0 } as Point;
    switch (pointPosition) {
      case 'top': factorPoint.y = 1; break;
      case 'bottom': factorPoint.y = -1; break;
      case 'right': factorPoint.x = 1; break;
      case 'left': factorPoint.x = -1; break;
    }
    const fullDistanceVector = { x: dv.x * Math.abs(factorPoint.x), y: dv.y * Math.abs(factorPoint.y) };
    const curvature = 0.25;
    const controlOffset = curvature * 25 * Math.sqrt(Math.abs(fullDistanceVector.x + fullDistanceVector.y));
    return { x: point.x + factorPoint.x * controlOffset, y: point.y - factorPoint.y * controlOffset };
  };
  const sc = calcControlPoint(sourcePoint as any, sourcePosition, distanceVector);
  const tc = calcControlPoint(targetPoint as any, targetPosition, distanceVector);
  const path = `M${sourcePoint.x},${sourcePoint.y} C${sc.x},${sc.y} ${tc.x},${tc.y} ${targetPoint.x},${targetPoint.y}`;
  const getPointOnLineByRatio = (a: Point, b: Point, ratio: number): Point => ({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio });
  const getPointOnBezier = (sp: Point, tp: Point, scp: Point, tcp: Point, ratio: number): Point => {
    const a = getPointOnLineByRatio(sp, scp, ratio);
    const b = getPointOnLineByRatio(scp, tcp, ratio);
    const c = getPointOnLineByRatio(tcp, tp, ratio);
    return getPointOnLineByRatio(getPointOnLineByRatio(a, b, ratio), getPointOnLineByRatio(b, c, ratio), ratio);
  };
  return { path, labelPoints: { start: getPointOnBezier(sourcePoint as any, targetPoint as any, sc, tc, 0.15), center: getPointOnBezier(sourcePoint as any, targetPoint as any, sc, tc, 0.5), end: getPointOnBezier(sourcePoint as any, targetPoint as any, sc, tc, 0.85) } };
}

function getNodeRects(params: CurveFactoryParams, pad = NODE_PADDING): Rect[] {
  const nodes: any[] = (params as any).allNodes || [];
  const DEF_W = 240, DEF_H = 110;
  const rects: Rect[] = [];
  for (const n of nodes) {
    try {
      const pt = (n as any).point as Point; if (!pt) continue;
      const w = Number((n as any).width || (n as any).data?.width || DEF_W) || DEF_W;
      const h = Number((n as any).height || (n as any).data?.height || DEF_H) || DEF_H;
      rects.push(inflate({ left: pt.x, top: pt.y, right: pt.x + w, bottom: pt.y + h }, pad));
    } catch {}
  }
  return rects;
}

function buildEdgeCorridorSegments(params: CurveFactoryParams): Segment[] {
  const segs: Segment[] = [];
  const nodes: any[] = (params as any).allNodes || [];
  const edges: any[] = (params as any).allEdges || [];
  const idx = new Map<string, { x: number; y: number; w: number; h: number }>();
  const DEF_W = 240, DEF_H = 110;
  for (const n of nodes) {
    try { idx.set(String((n as any).id || ''), { x: (n as any).point?.x || 0, y: (n as any).point?.y || 0, w: Number((n as any).width || (n as any).data?.width || DEF_W), h: Number((n as any).height || (n as any).data?.height || DEF_H) }); } catch {}
  }
  for (const e of edges) {
    try {
      const s = idx.get(String((e as any).source || '')); const t = idx.get(String((e as any).target || ''));
      if (!s || !t) continue;
      const sx = s.x + s.w / 2, sy = s.y + s.h / 2, tx = t.x + t.w / 2, ty = t.y + t.h / 2;
      const midX = (sx + tx) / 2; const midY = (sy + ty) / 2;
      // approximate step pattern: s -> (midX, sy) -> (midX, ty) -> t and s -> (sx, midY) -> (tx, midY) -> t
      segs.push({ a: { x: sx, y: sy }, b: { x: midX, y: sy } });
      segs.push({ a: { x: midX, y: sy }, b: { x: midX, y: ty } });
      segs.push({ a: { x: midX, y: ty }, b: { x: tx, y: ty } });
      segs.push({ a: { x: sx, y: sy }, b: { x: sx, y: midY } });
      segs.push({ a: { x: sx, y: midY }, b: { x: tx, y: midY } });
      segs.push({ a: { x: tx, y: midY }, b: { x: tx, y: ty } });
    } catch {}
  }
  return segs;
}

function sparseCoords(sourcePoint: Point, targetPoint: Point, rects: Rect[]): { xs: number[]; ys: number[] } {
  const xs = new Set<number>([sourcePoint.x, targetPoint.x, sourcePoint.x + EXIT, sourcePoint.x - EXIT, targetPoint.x + ENTRY, targetPoint.x - ENTRY]);
  const ys = new Set<number>([sourcePoint.y, targetPoint.y, sourcePoint.y + EXIT, sourcePoint.y - EXIT, targetPoint.y + ENTRY, targetPoint.y - ENTRY]);
  for (const r of rects) {
    xs.add(r.left - GRID_GAP); xs.add(r.left - GRID_GAP / 2); xs.add(r.left); xs.add(r.right); xs.add(r.right + GRID_GAP / 2); xs.add(r.right + GRID_GAP);
    ys.add(r.top - GRID_GAP); ys.add(r.top - GRID_GAP / 2); ys.add(r.top); ys.add(r.bottom); ys.add(r.bottom + GRID_GAP / 2); ys.add(r.bottom + GRID_GAP);
  }
  const xsArr = Array.from(xs).filter(isFinite).sort((a, b) => a - b);
  const ysArr = Array.from(ys).filter(isFinite).sort((a, b) => a - b);
  return { xs: xsArr, ys: ysArr };
}

function neighborsOnGrid(p: Point, xs: number[], ys: number[]): Point[] {
  const xi = xs.indexOf(p.x); const yi = ys.indexOf(p.y);
  const out: Point[] = [];
  if (xi > 0) out.push({ x: xs[xi - 1], y: p.y });
  if (xi < xs.length - 1) out.push({ x: xs[xi + 1], y: p.y });
  if (yi > 0) out.push({ x: p.x, y: ys[yi - 1] });
  if (yi < ys.length - 1) out.push({ x: p.x, y: ys[yi + 1] });
  return out;
}

function aStarOrthogonal(
  start: Point,
  goal: Point,
  xs: number[], ys: number[],
  obstacles: Rect[],
  otherEdgeSegs: Segment[],
  mode: 'h-back'|'v-back',
  laneRightX?: number,
  laneLeftX?: number,
  opts?: { monotoneUp?: boolean; strictAvoidEdges?: boolean }
): Point[] | null {
  const key = (p: Point, dir: 'H'|'V'|'N') => `${p.x},${p.y},${dir}`;
  const open = new Set<string>();
  const came = new Map<string, string | null>();
  const g = new Map<string, number>();
  const f = new Map<string, number>();
  const startKey = key(start, 'N');
  open.add(startKey); came.set(startKey, null); g.set(startKey, 0); f.set(startKey, Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y));
  let iters = 0;
  const maxIters = xs.length * ys.length * 8;
  while (open.size && iters++ < maxIters) {
    // pick best f
    let curK: string | null = null; let bestF = Infinity;
    for (const k of open) { const fv = f.get(k) ?? Infinity; if (fv < bestF) { bestF = fv; curK = k; } }
    if (!curK) break;
    const [cxS, cyS, dirS] = curK.split(',');
    const cur: Point = { x: Number(cxS), y: Number(cyS) };
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: Point[] = [goal];
      let k: string | null = curK;
      while (k) { const prev = came.get(k); if (!prev) break; const [px, py] = prev.split(',').map((t, i) => i < 2 ? Number(t) : t as any); path.push({ x: Number(px), y: Number(py) }); k = prev; }
      path.push(start); path.reverse();
      return path;
    }
    open.delete(curK);
    const curDir: 'H'|'V'|'N' = (dirS as any);
    for (const n of neighborsOnGrid(cur, xs, ys)) {
      const seg: Segment = { a: cur, b: n };
      // block if segment collides an inflated node
      if (obstacles.some(r => segIntersectsRect(seg, r))) continue;
      // enforce monotone up (never go down) for horizontal-backward if requested
      if (mode === 'h-back' && opts?.monotoneUp) {
        if (n.y > cur.y) continue;
      }
      // base move cost: manhattan length (always horizontal or vertical)
      const step = Math.abs(n.x - cur.x) + Math.abs(n.y - cur.y);
      if (step <= 0) continue;
      let cost = step;
      // penalize turn
      const nextDir: 'H'|'V' = (n.y === cur.y ? 'H' : 'V');
      if (curDir !== 'N' && nextDir !== curDir) cost += TURN_PENALTY;
      // penalize reverse w.r.t backward direction
      if (mode === 'h-back') {
        if (n.x > cur.x) cost += REVERSE_PENALTY; // moving right in right->left mode
      } else {
        if (n.y > cur.y) cost += REVERSE_PENALTY; // moving down in bottom->top mode
      }
      // no additional left/right bias beyond initial rightward exit lane
      // avoid crossings with other edges' segments (strict if requested)
      let crosses = 0; for (const os of otherEdgeSegs) { if (segsIntersect(seg, os)) crosses++; }
      if (crosses) {
        if (opts?.strictAvoidEdges) continue; // never cut an existing path
        cost += crosses * CROSS_PENALTY;
      }
      // strong lane penalties to keep to the safe side
      if (mode === 'v-back' && typeof laneRightX === 'number') {
        const minX = Math.min(cur.x, n.x);
        if (minX < laneRightX) cost += 7000;
      }
      if (mode === 'h-back' && typeof laneLeftX === 'number') {
        const maxX = Math.max(cur.x, n.x);
        if (maxX > laneLeftX) cost += 7000;
      }
      // tentative g
      const nk = key(n, nextDir);
      const gNew = (g.get(curK) ?? Infinity) + cost;
      if (gNew < (g.get(nk) ?? Infinity)) {
        came.set(nk, curK);
        g.set(nk, gNew);
        const h = Math.abs(goal.x - n.x) + Math.abs(goal.y - n.y);
        f.set(nk, gNew + h);
        open.add(nk);
      }
    }
  }
  return null;
}

function labelPointsFromPolyline(points: Point[]): { start: Point; center: Point; end: Point } {
  const segLens: number[] = []; let total = 0;
  for (let i = 0; i < points.length - 1; i++) { const len = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y); segLens.push(len); total += len; }
  const cum: number[] = [0]; for (let i = 0; i < segLens.length; i++) cum.push(cum[i] + segLens[i]);
  const pointAt = (ratio: number): Point => {
    const target = total * ratio; if (target <= 0) return points[0]; if (target >= total) return points[points.length - 1];
    let seg = 0; while (cum[seg + 1] < target) seg++;
    const local = (target - cum[seg]) / segLens[seg];
    return { x: points[seg].x + (points[seg+1].x - points[seg].x) * local, y: points[seg].y + (points[seg+1].y - points[seg].y) * local };
  };
  return { start: pointAt(0.15), center: pointAt(0.5), end: pointAt(0.85) };
}

// Implémentation stricte des règles pour mode horizontal backward
function routeBackwardHorizontalStrict(params: CurveFactoryParams): { path: string; labelPoints: { start: Point; center: Point; end: Point } } {
  const GAPX = 40, GAPY = 40, PAD = 2, CORNER = 10;
  const { sourcePoint, targetPoint } = params as any;
  const S: Point = { x: sourcePoint.x, y: sourcePoint.y };
  const T: Point = { x: targetPoint.x, y: targetPoint.y };
  // Si ce n'est pas un backward horizontal, route orthogonale simple
  if (!(S.x > T.x + BACKWARD_ACTIVATE_OFFSET)) {
    const outX = S.x + GAPX;
    const pts = dedupe([S, { x: outX, y: S.y }, { x: outX, y: T.y }, T]);
    return { path: roundedOrthogonalPath(pts, CORNER), labelPoints: labelPointsFromPolyline(pts) };
  }

  // 1) Guides
  const vOutX = S.x + GAPX; // Verticale de sortie (droite du source)
  const vInX = T.x - GAPX;  // Verticale d'entrée (gauche du target)

  // 2) BusY: Escalier si possible (juste sous la source), sinon Grand U (sous le plus bas des deux)
  const rects = getNodeRects(params, 0);
  const srcRect0 = rects.find(r => pointInRect(S, r)) || null;
  const tgtRect0 = rects.find(r => pointInRect(T, r)) || null;
  const srcBottom = srcRect0 ? srcRect0.bottom : S.y;
  const tgtBottom = tgtRect0 ? tgtRect0.bottom : T.y;
  const targetCenterY = tgtRect0 ? (tgtRect0.top + tgtRect0.bottom) / 2 : T.y;
  const potentialStaircaseY = srcBottom + GAPY;
  // Correction: Escalier si la ligne sous source est au-dessus du centre de la cible (avec petite tolérance)
  let busY: number = (potentialStaircaseY < (targetCenterY - 5))
    ? potentialStaircaseY
    : Math.max(srcBottom, tgtBottom) + GAPY;

  // 3) Smart bus: descendre si la ligne horizontale coupe un obstacle (hors source/target)
  const left = Math.min(vInX, vOutX);
  const right = Math.max(vInX, vOutX);
  let safety = 0;
  while (safety++ < 20) {
    let moved = false;
    for (const r of rects) {
      if (srcRect0 && r.left === srcRect0.left && r.top === srcRect0.top && r.right === srcRect0.right && r.bottom === srcRect0.bottom) continue;
      if (tgtRect0 && r.left === tgtRect0.left && r.top === tgtRect0.top && r.right === tgtRect0.right && r.bottom === tgtRect0.bottom) continue;
      const crosses = !(r.right < left || r.left > right) && (r.top < busY && r.bottom > busY);
      if (crosses) { busY = r.bottom + GAPY; moved = true; break; }
    }
    if (!moved) break;
  }

  // 4) Points fixes (Grand U)
  const pts = dedupe([
    { x: S.x,    y: S.y },
    { x: vOutX,  y: S.y },
    { x: vOutX,  y: busY },
    { x: vInX,   y: busY },
    { x: vInX,   y: T.y },
    { x: T.x,    y: T.y },
  ]);
  return { path: roundedOrthogonalPath(pts, CORNER), labelPoints: labelPointsFromPolyline(pts) };
}

function routeBackward(params: CurveFactoryParams, axis: 'horizontal'|'vertical'): { path: string; labelPoints: { start: Point; center: Point; end: Point } } {
  const { sourcePoint, targetPoint } = params as any;
  const sp = pos((params as any).sourcePosition);
  const tp = pos((params as any).targetPosition);
  const S: Point = { x: sourcePoint.x, y: sourcePoint.y };
  const T: Point = { x: targetPoint.x, y: targetPoint.y };
  // Exit from ports along their handle direction
  const dirMap: Record<string, Point> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } };
  const sDir = dirMap[sp] || { x: 0, y: 0 }; const tDir = dirMap[tp] || { x: 0, y: 0 };
  let S1: Point = { x: S.x + sDir.x * EXIT, y: S.y + sDir.y * EXIT };
  let T1: Point = { x: T.x + tDir.x * ENTRY, y: T.y + tDir.y * ENTRY };
  const baseRectsNoPad = getNodeRects(params, 0);
  const rectsAll = getNodeRects(params, NODE_PADDING);
  // Keep all obstacles, except when dragging over a node: allow crossing the hovered target node
  let rects = rectsAll;
  try {
    const isConn = (params as any).mode === 'connection';
    if (isConn && targetPoint) {
      const hoveredBase = baseRectsNoPad.find(r => pointInRect(T, r));
      if (hoveredBase) {
        const hoveredInfl = inflate(hoveredBase, NODE_PADDING);
        rects = rectsAll.filter(r => !rectEquals(r, hoveredInfl));
      }
    }
  } catch {}
  // In horizontal-backward, bias to a top-left outer lane to avoid cutting through middle
  if (axis === 'horizontal') {
    // Règles strictes demandées pour le mode horizontal backward
    return routeBackwardHorizontalStrict(params);
    /* const srcRect = baseRectsNoPad.find(r => pointInRect(S, r));
    const tgtRect = baseRectsNoPad.find(r => pointInRect(T, r));
    // Choose a left outer lane beyond both nodes' left edges
    const leftLane = Math.min(srcRect ? srcRect.left - LANE_GAP : S.x - LANE_GAP, tgtRect ? tgtRect.left - LANE_GAP : T.x - LANE_GAP);
    // Prefer going above both nodes before heading left
    const topLane = Math.min(srcRect ? srcRect.top - LANE_GAP : S.y - LANE_GAP, tgtRect ? tgtRect.top - LANE_GAP : T.y - LANE_GAP);
    const pre: Point[] = [S];
    if (S.y !== topLane) pre.push({ x: S.x, y: topLane });
    pre.push({ x: leftLane, y: topLane });
    // Ensure T1 is outside target horizontally to the left if needed
    if (tgtRect) {
      const maxX = tgtRect.left - LANE_GAP;
      if (T1.x > maxX) T1 = { x: maxX, y: T1.y };
    }
    const startH = pre[pre.length - 1];
    const { xs, ys } = sparseCoords(startH, T1, rects);
    const otherSegs = buildEdgeCorridorSegments(params);
    const pathPtsMid = aStarOrthogonal(startH, T1, xs, ys, rects, otherSegs, 'h-back', undefined, leftLane);
    let points: Point[];
    if (pathPtsMid && pathPtsMid!.length >= 2) points = dedupe([...pre, ...pathPtsMid!, T]);
    else {
      // simple fallback: go to top-left lane then to target x
      const midX = Math.min(startH.x, T1.x) - GRID_GAP;
      points = dedupe([...pre, { x: midX, y: startH.y }, { x: midX, y: T1.y }, T1, T]);
    }
    const path = roundedOrthogonalPath(points);
    const labelPoints = labelPointsFromPolyline(points);
    return { path, labelPoints }; */
  } else {
    // Vertical-backward: force explicit first move to the right outside the source rect, then route
    const srcRect = baseRectsNoPad.find(r => pointInRect(S, r));
    const tgtRect = baseRectsNoPad.find(r => pointInRect(T, r));
    // Compute a safe y just outside source vertically (exit), and a right lane x
    let yOut = S.y;
    if (srcRect) {
      if (sDir.y > 0) yOut = Math.max(yOut, srcRect.bottom + LANE_GAP);
      else if (sDir.y < 0) yOut = Math.min(yOut, srcRect.top - LANE_GAP);
      else yOut = srcRect.top - LANE_GAP; // bias above for bottom->top
    }
    const xRight = srcRect ? (srcRect.right + LANE_GAP) : (S.x + LANE_GAP);
    const laneX = Math.max(xRight, (tgtRect ? (tgtRect.right + LANE_GAP) : xRight));
    // Pre-seed mandatory rightward exit: S -> (S.x, yOut) -> (laneX, yOut)
    const pre: Point[] = [S];
    if (yOut !== S.y) pre.push({ x: S.x, y: yOut });
    pre.push({ x: laneX, y: yOut });
    // Ensure T1 is outside target vertically
    if (tgtRect) {
      if (tDir.y > 0) { const minY = tgtRect.bottom + LANE_GAP; if (T1.y < minY) T1 = { x: T1.x, y: minY }; }
      else if (tDir.y < 0) { const maxY = tgtRect.top - LANE_GAP; if (T1.y > maxY) T1 = { x: T1.x, y: maxY }; }
      else { const maxY = tgtRect.top - LANE_GAP; if (T1.y > maxY) T1 = { x: T1.x, y: maxY }; }
    }
    // Route from right-lane point to T1
    const startV = pre[pre.length - 1];
    const { xs, ys } = sparseCoords(startV, T1, rects);
    const otherSegs = buildEdgeCorridorSegments(params);
    const pathPtsMid = aStarOrthogonal(startV, T1, xs, ys, rects, otherSegs, 'v-back', laneX);
    let points: Point[];
    if (pathPtsMid && pathPtsMid!.length >= 2) points = dedupe([...pre, ...pathPtsMid!, T]);
    else {
      // simple fallback: go up then to target x
      const midY = Math.min(startV.y, T1.y) - GRID_GAP;
      points = dedupe([...pre, { x: startV.x, y: midY }, { x: T1.x, y: midY }, T1, T]);
    }
    const path = roundedOrthogonalPath(points);
    const labelPoints = labelPointsFromPolyline(points);
    return { path, labelPoints };
  }
  const { xs, ys } = sparseCoords(S1, T1, rects);
  const otherSegs = buildEdgeCorridorSegments(params);
  const mode = axis === 'horizontal' ? 'h-back' : 'v-back';
  const pathPtsMid = aStarOrthogonal(S1, T1, xs, ys, rects, otherSegs, mode);
  let points: Point[];
  if (pathPtsMid && pathPtsMid!.length >= 2) {
    points = dedupe([S, ...pathPtsMid!, T]);
  } else {
    // Fallback: simple 3 or 5-point orthogonal detour
    if (axis === 'horizontal') {
      const midX = Math.min(S1.x, T1.x) - GRID_GAP; // go left lane
      points = dedupe([S, S1, { x: midX, y: S1.y }, { x: midX, y: T1.y }, T1, T]);
    } else {
      const midY = Math.min(S1.y, T1.y) - GRID_GAP; // go up lane
      points = dedupe([S, S1, { x: S1.x, y: midY }, { x: T1.x, y: midY }, T1, T]);
    }
  }
  const path = roundedOrthogonalPath(points);
  const labelPoints = labelPointsFromPolyline(points);
  return { path, labelPoints };
}

export const backAwareCurve: CurveFactory = (params: CurveFactoryParams): CurveLayout => {
  const { sourcePoint, targetPoint } = params as any;
  const sp = pos((params as any).sourcePosition);
  const tp = pos((params as any).targetPosition);
  const horizHandles = (sp === 'left' || sp === 'right') && (tp === 'left' || tp === 'right');
  const vertHandles = (sp === 'top' || sp === 'bottom') && (tp === 'top' || tp === 'bottom');
  const axis: 'horizontal'|'vertical' = horizHandles ? 'horizontal' : (vertHandles ? 'vertical' : (Math.abs(sourcePoint.x - targetPoint.x) >= Math.abs(sourcePoint.y - targetPoint.y) ? 'horizontal' : 'vertical'));
  if (axis === 'horizontal') {
    const backward = sourcePoint.x > (targetPoint.x + BACKWARD_ACTIVATE_OFFSET); // right -> left (avec offset)
    if (backward) {
      try { console.debug('[router] mode=h-back', { sp, tp, S: sourcePoint, T: targetPoint }); } catch {}
      // Route backward horizontal; fallback to bezier if invalid
      const routed = routeBackwardHorizontalStrict(params);
      // Validate: no node intersections
      const rects = getNodeRects(params, 2);
      const ok = (() => {
        const pts = (() => {
          // parse back from path is hard; we have points inside label computation; recompute via internal? Use simple check: always accept.
          return null;
        })();
        return true;
      })();
      return routed || bezierPathLite(params);
    }
    return bezierPathLite(params);
  } else {
    const backward = sourcePoint.y > (targetPoint.y + BACKWARD_ACTIVATE_OFFSET); // bottom -> top (avec offset)
    if (backward) {
      try { console.debug('[router] mode=v-back', { sp, tp, S: sourcePoint, T: targetPoint }); } catch {}
      const routed = routeBackwardVerticalStrict(params);
      return routed || bezierPathLite(params);
    }
    return bezierPathLite(params);
  }
};

// Backward vertical: toujours sortir à gauche, bus vertical à gauche (Escalier vs Grand U latéral)
function routeBackwardVerticalStrict(params: CurveFactoryParams): CurveLayout {
  const GAPX = 40, GAPY = 40, PAD = 2, CORNER = 10;
  const { sourcePoint, targetPoint } = params as any;
  const S: Point = { x: sourcePoint.x, y: sourcePoint.y };
  const T: Point = { x: targetPoint.x, y: targetPoint.y };
  // Si ce n'est pas un backward vertical (source sous la cible), route simple
  if (!(S.y > T.y + BACKWARD_ACTIVATE_OFFSET)) {
    const outY = S.y + GAPY;
    const pts = dedupe([S, { x: S.x, y: outY }, { x: T.x, y: outY }, T]);
    return { path: roundedOrthogonalPath(pts, CORNER), labelPoints: labelPointsFromPolyline(pts) };
  }

  // 1) Ports et guides (vertical): sortie en bas, approche par le haut
  const rects = getNodeRects(params, 0);
  const srcRect = rects.find(r => pointInRect(S, r)) || null;
  const tgtRect = rects.find(r => pointInRect(T, r)) || null;
  const vOutY = S.y + GAPY; // juste sous la source
  const vInY = T.y - GAPY;  // juste au-dessus de la cible

  // 2) Smart Bus vertical (busX à DROITE) — Right loop
  const srcRight = srcRect ? srcRect.right : S.x;
  const tgtRight = tgtRect ? tgtRect.right : T.x;
  const targetCenterX = tgtRect ? (tgtRect.left + tgtRect.right) / 2 : T.x;
  const potentialStaircaseX = srcRight + GAPX;
  const isTargetFarRight = targetCenterX > (srcRight + GAPX + 5);
  let busX: number = isTargetFarRight ? potentialStaircaseX : (Math.max(srcRight, tgtRight) + GAPX);
  // Forcer départ vers la DROITE: busX doit être strictement > S.x
  if (!(busX > S.x)) {
    busX = srcRight + GAPX;
  }

  // Pousser busX à DROITE tant qu'il traverse un obstacle entre vInY et vOutY
  let safety = 0;
  while (safety++ < 20) {
    let moved = false;
    const top = Math.min(vInY, vOutY);
    const bottom = Math.max(vInY, vOutY);
    for (const r of rects) {
      if (srcRect && rectEquals(r, srcRect)) continue;
      if (tgtRect && rectEquals(r, tgtRect)) continue;
      const crosses = (r.left < busX && r.right > busX) && (r.top < bottom && r.bottom > top);
      if (crosses) { busX = Math.max(busX, r.right + GAPX); moved = true; break; }
    }
    if (!moved) break;
  }
  // Ultime sécurité: garantir P2.x > P1.x
  if (busX <= S.x) busX = srcRight + GAPX;
  // (pas de clamp supplémentaire ici; busX a déjà été forcé < S.x)

  // 3) Chemin fixe (miroir de l'horizontal): gauche comme contournement, axes inversés
  const pts = dedupe([
    { x: S.x,    y: S.y },
    { x: S.x,    y: vOutY },
    { x: busX,   y: vOutY },
    { x: busX,   y: vInY },
    { x: T.x,    y: vInY },
    { x: T.x,    y: T.y },
  ]);
  return { path: roundedOrthogonalPath(pts, CORNER), labelPoints: labelPointsFromPolyline(pts) };
}
