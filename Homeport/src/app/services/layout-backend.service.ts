import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class LayoutBackendService {
  constructor(private api: ApiClientService) {}

  layoutGraph(
    graph: any,
    orientation: 'vertical'|'horizontal',
    opts: { width?: number; height?: number; gapX?: number; gapY?: number; adjustByOutputs?: boolean; perOutputYOffset?: number; perOutputXOffset?: number; outputsCount?: Record<string, number>; outputsOnlyForIds?: string[]; outputsMode?: 'max'|'sum'|'edge' } = {}
  ): Observable<{ positions: Record<string, { x: number; y: number }>, orientation: string }>{
    const body: any = { graph, orientation };
    if (opts?.width) body.nodeWidth = opts.width;
    if (opts?.height) body.nodeHeight = opts.height;
    if (opts?.gapX) body.gapX = opts.gapX;
    if (opts?.gapY) body.gapY = opts.gapY;
    if (opts?.adjustByOutputs) body.adjustByOutputs = true;
    if (opts?.perOutputYOffset != null) body.perOutputYOffset = opts.perOutputYOffset;
    if (opts?.perOutputXOffset != null) body.perOutputXOffset = opts.perOutputXOffset;
    if (opts?.outputsCount) body.outputsCount = opts.outputsCount;
    if (opts?.outputsOnlyForIds) body.outputsOnlyForIds = opts.outputsOnlyForIds;
    if (opts?.outputsMode) body.outputsMode = opts.outputsMode;
    return this.api.post<any>('/api/layout/graph', body);
  }
}
