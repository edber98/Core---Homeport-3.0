import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NodeDef { id: string; label: string; x: number; y: number; color: string; }

@Component({
  selector: 'demo-connect-nodes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dcn" #host>
      <div class="dcn-instruction">
        Tirez une ligne du handle de sortie (droite) du nœud « Start » vers le handle d'entrée (gauche) du nœud « Email ».
      </div>
      <svg #svg class="dcn-svg" [attr.viewBox]="'0 0 ' + svgW + ' ' + svgH">
        <!-- Existing connection preview -->
        <line *ngIf="dragging" class="dcn-line dcn-line-preview"
              [attr.x1]="dragFrom.x" [attr.y1]="dragFrom.y"
              [attr.x2]="dragTo.x" [attr.y2]="dragTo.y" />
        <!-- Completed connections -->
        <line *ngFor="let conn of connections" class="dcn-line dcn-line-done"
              [attr.x1]="conn.x1" [attr.y1]="conn.y1"
              [attr.x2]="conn.x2" [attr.y2]="conn.y2" />

        <!-- Nodes -->
        <g *ngFor="let node of nodes">
          <rect [attr.x]="node.x" [attr.y]="node.y" width="120" height="44" rx="8" ry="8"
                [attr.fill]="node.color" class="dcn-node-rect" />
          <text [attr.x]="node.x + 60" [attr.y]="node.y + 27" text-anchor="middle"
                class="dcn-node-label">{{ node.label }}</text>

          <!-- Input handle (left) -->
          <circle *ngIf="node.id !== 'start'" [attr.cx]="node.x" [attr.cy]="node.y + 22" r="7"
                  class="dcn-handle dcn-handle-in"
                  (mousedown)="$event.stopPropagation()"
                  (mouseup)="onHandleUp(node, 'in', $event)"
                  (touchend)="onHandleUp(node, 'in', $event)" />

          <!-- Output handle (right) -->
          <circle *ngIf="node.id !== 'email'" [attr.cx]="node.x + 120" [attr.cy]="node.y + 22" r="7"
                  class="dcn-handle dcn-handle-out"
                  (mousedown)="onHandleDown(node, 'out', $event)"
                  (touchstart)="onHandleDown(node, 'out', $event)" />
        </g>
      </svg>
      <div *ngIf="connected" class="dcn-result success">
        Connexion établie ! Les données circuleront de Start vers Email.
      </div>
    </div>
  `,
  styles: [`
    .dcn { padding: 16px; height: 100%; display: flex; flex-direction: column; }
    .dcn-instruction { font-size: 14px; color: #666; margin-bottom: 10px; }
    .dcn-svg { flex: 1; width: 100%; background: #fff; border-radius: 8px; border: 1px solid #e8e8e8; cursor: default; }
    .dcn-node-rect { stroke: rgba(0,0,0,0.08); stroke-width: 1; }
    .dcn-node-label { fill: #fff; font-size: 14px; font-weight: 600; pointer-events: none; }
    .dcn-handle { fill: #fff; stroke: #999; stroke-width: 2; cursor: crosshair; transition: all 0.15s; }
    .dcn-handle:hover { stroke: #e61982; fill: #e6f7ff; r: 9; }
    .dcn-handle-out { stroke: #52c41a; }
    .dcn-handle-in { stroke: #e61982; }
    .dcn-line { stroke-width: 2.5; stroke-linecap: round; fill: none; }
    .dcn-line-preview { stroke: #bbb; stroke-dasharray: 6,4; }
    .dcn-line-done { stroke: #52c41a; }
    .dcn-result {
      margin-top: 10px; padding: 8px 14px; border-radius: 6px; font-size: 13px;
    }
    .dcn-result.success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
  `]
})
export class DemoConnectNodesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('svg') svgRef!: ElementRef<SVGSVGElement>;

  svgW = 440;
  svgH = 200;

  nodes: NodeDef[] = [
    { id: 'start', label: 'Start', x: 40, y: 78, color: '#52c41a' },
    { id: 'email', label: 'Email', x: 280, y: 78, color: '#722ed1' },
  ];

  connections: { x1: number; y1: number; x2: number; y2: number }[] = [];
  connected = false;

  dragging = false;
  dragFrom = { x: 0, y: 0 };
  dragTo = { x: 0, y: 0 };
  private dragSourceNode: NodeDef | null = null;

  private mouseMoveHandler = (e: MouseEvent) => this.onMouseMove(e);
  private touchMoveHandler = (e: TouchEvent) => this.onTouchMove(e);
  private mouseUpHandler = () => this.cancelDrag();
  private touchEndHandler = () => this.cancelDrag();

  ngAfterViewInit(): void {
    // Global listeners for drag tracking
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    document.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    document.addEventListener('touchend', this.touchEndHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
    document.removeEventListener('touchmove', this.touchMoveHandler);
    document.removeEventListener('touchend', this.touchEndHandler);
  }

  onHandleDown(node: NodeDef, type: 'out', event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.dragging = true;
    this.dragSourceNode = node;
    const pt = this.getSvgPoint(event);
    this.dragFrom = { x: node.x + 120, y: node.y + 22 };
    this.dragTo = pt;
  }

  onHandleUp(node: NodeDef, type: 'in', event: MouseEvent | TouchEvent): void {
    if (!this.dragging || !this.dragSourceNode) return;
    if (this.dragSourceNode.id !== node.id) {
      this.connections.push({
        x1: this.dragFrom.x, y1: this.dragFrom.y,
        x2: node.x, y2: node.y + 22,
      });
      if (this.dragSourceNode.id === 'start' && node.id === 'email') {
        this.connected = true;
      }
    }
    this.dragging = false;
    this.dragSourceNode = null;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;
    this.dragTo = this.getSvgPoint(e);
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.dragging) return;
    e.preventDefault();
    this.dragTo = this.getSvgPoint(e);
  }

  private cancelDrag(): void {
    this.dragging = false;
    this.dragSourceNode = null;
  }

  private getSvgPoint(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const svg = this.svgRef?.nativeElement;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in event ? (event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? 0) : event.clientX;
    const clientY = 'touches' in event ? (event.touches[0]?.clientY ?? event.changedTouches[0]?.clientY ?? 0) : event.clientY;
    return {
      x: (clientX - rect.left) / rect.width * this.svgW,
      y: (clientY - rect.top) / rect.height * this.svgH,
    };
  }
}
