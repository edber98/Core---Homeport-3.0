import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AiWorkflowAgentV2Service, WorkflowAgentV2Event } from '../../../services/ai-workflow-agent-v2.service';
import { AccessControlService } from '../../../services/access-control.service';

@Component({
  selector: 'ai-workflow-v2-console',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzSelectModule],
  template: `
  <div class="v2-root">
    <div class="row">
      <select [(ngModel)]="action">
        <option value="modify">modify</option>
        <option value="insert">insert</option>
        <option value="replace">replace</option>
        <option value="layout">layout</option>
      </select>
      <input [(ngModel)]="prompt" placeholder="Instruction (optionnel)" />
      <button nz-button nzType="primary" (click)="run()" [disabled]="busy">Appliquer au flow</button>
    </div>
    <div class="log">
      <div *ngFor="let l of logs">{{ l }}</div>
    </div>
  </div>
  `,
  styles: [`
    .v2-root { display:flex; flex-direction:column; gap:8px; }
    .row { display:flex; gap:8px; }
    .row input { flex:1 1 auto; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; }
    .log { background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:8px; height: 180px; overflow:auto; font-size:12px; }
  `]
})
export class AiWorkflowV2ConsoleComponent {
  prompt = '';
  action: string = 'modify';
  busy = false;
  logs: string[] = [];
  constructor(private v2: AiWorkflowAgentV2Service, private acl: AccessControlService) {}

  run(){
    this.logs = [];
    this.busy = true;
    const flowId = (this as any).acl.currentFlowId?.() || null;
    const s = this.v2.stream({ prompt: this.prompt, flowId: flowId || undefined, action: this.action });
    const sub = s.events$.subscribe({
      next: (ev: WorkflowAgentV2Event) => {
        if (!ev) return;
        if (ev.type === 'message') this.logs.push(ev.text || '');
        if (ev.type === 'patch') this.logs.push('[patch] ' + ((ev as any).ops?.length || 0) + ' op(s)');
        if (ev.type === 'snapshot') this.logs.push('[snapshot] nodes=' + (((ev as any).graph?.nodes?.length)||0) + ' edges=' + (((ev as any).graph?.edges?.length)||0));
        if (ev.type === 'error') this.logs.push('[error] ' + ((ev as any).message || (ev as any).code));
        if (ev.type === 'done') { this.logs.push('[done]'); this.busy = false; try { sub.unsubscribe(); } catch {} }
      },
      error: () => { this.busy = false; try { sub.unsubscribe(); } catch {} },
      complete: () => { this.busy = false; try { sub.unsubscribe(); } catch {} }
    });
  }
}
