import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FlowViewerComponent } from './flow-viewer.component';

@Component({
  selector: 'flow-execution',
  standalone: true,
  imports: [CommonModule, FlowViewerComponent],
  template: `
  <div class="flow-exec">
    <aside class="side executions">
      <h4>Executions</h4>
      <ul class="exec-list">
        <li *ngFor="let e of demoExecs">{{ e }}</li>
      </ul>
    </aside>
    <section class="viewer">
      <flow-viewer class="viewer-canvas" [demo]="true" [showBottomBar]="true" [showRun]="false" [showSave]="false" [showCenterFlow]="true"></flow-viewer>
    </section>
  </div>
  `,
  styles: [`
    .flow-exec { position: relative; display:grid; grid-template-columns: 320px 1fr; gap: 0; height:100%; }
    .side.executions { border: none; border-radius: 0; padding: 12px; background: #ffffff; overflow: auto; }
    .side.executions h4 { margin: 0 0 8px; font-weight: 600; }
    .exec-list { list-style: none; padding: 0; margin: 0; display:flex; flex-direction:column; gap:6px; }
    .exec-list li { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; }
    .viewer { height:100%; overflow: hidden; }
    .viewer-canvas { height: 100%; display:block; }
  `]
})
export class FlowExecutionComponent {
  demoExecs = [
    'Exécution #10342 — il y a 2 min',
    'Exécution #10341 — il y a 10 min',
    'Exécution #10340 — il y a 32 min'
  ];
  exampleGraph = {
    nodes: [
      {
        id: 'node_send',
        point: { x: 380, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_send',
            name: 'SendMail',
            template: 'tmpl_sendmail',
            templateObj: {
              id: 'tmpl_sendmail',
              name: 'SendMail',
              type: 'function',
              icon: 'fa-solid fa-envelope',
              title: 'Send mail',
              subtitle: 'Exemple',
              output: [],
              args: {}
            },
            context: {},
            invalid: false
          }
        }
      },
      {
        id: 'node_fn2',
        point: { x: 180, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_fn2',
            name: 'Function2',
            template: 'tmpl_fn2',
            templateObj: {
              id: 'tmpl_fn2',
              name: 'Function2',
              type: 'function',
              icon: 'fa-solid fa-bolt',
              title: 'Function 2 outputs',
              subtitle: 'Demo',
              output: ['Oui','Non'],
              args: {}
            },
            context: {}
          }
        }
      },
      {
        id: 'node_cond',
        point: { x: 600, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_cond',
            name: 'Condition',
            template: 'tmpl_condition',
            templateObj: {
              id: 'tmpl_condition',
              name: 'Condition',
              type: 'condition',
              icon: 'fa-solid fa-code-branch',
              title: 'Condition',
              subtitle: 'Multi-branch',
              args: {},
              output_array_field: 'items'
            },
            context: { items: ['A','B','C'] }
          }
        }
      }
    ],
    edges: []
  };
}
