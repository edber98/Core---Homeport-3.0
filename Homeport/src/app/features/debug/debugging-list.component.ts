import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'debugging-list',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Debugging</h1>
          <p>Accès rapide aux builders et vues techniques.</p>
        </div>
      </div>
      <div class="grid">
        <div class="card" (click)="go('/ui-builder')">
          <div class="leading"><div class="avatar">UI</div></div>
          <div class="content"><div class="title-row"><div class="name">UI Builder</div><span class="chip">/ui-builder</span></div><div class="desc">Éditeur d’interface</div></div>
        </div>
        <div class="card" (click)="go('/flow-builder/editor')">
          <div class="leading"><div class="avatar">FB</div></div>
          <div class="content"><div class="title-row"><div class="name">Flow Builder</div><span class="chip">/flow-builder</span></div><div class="desc">Éditeur de flows</div></div>
        </div>
        <div class="card" (click)="go('/dynamic-form')">
          <div class="leading"><div class="avatar">DF</div></div>
          <div class="content"><div class="title-row"><div class="name">Dynamic Form Builder</div><span class="chip">/dynamic-form</span></div><div class="desc">Éditeur de formulaires</div></div>
        </div>
        <div class="card" (click)="go('/debug/expr-json')">
          <div class="leading"><div class="avatar">EX</div></div>
          <div class="content"><div class="title-row"><div class="name">Expr + JSON</div><span class="chip">/debug/expr-json</span></div><div class="desc">Tester JSON Viewer + Expression Editor</div></div>
        </div>
        <div class="card" (click)="go('/debug/form-viewers')">
          <div class="leading"><div class="avatar">FV</div></div>
          <div class="content"><div class="title-row"><div class="name">Form Viewers</div><span class="chip">/debug/form-viewers</span></div><div class="desc">Tester df-table-viewer et df-records-table</div></div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
    .card { display:flex; align-items:center; gap:14px; padding:14px 14px; border-radius:14px; cursor:pointer; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; box-shadow: 0 8px 24px rgba(0,0,0,0.04); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); border-color:#e5e7eb; }
    .leading .avatar { width:40px; height:40px; border-radius: 12px; display:flex; align-items:center; justify-content:center; font-weight:600; color:#111; background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); border: 1px solid #e5e7eb; }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .desc { color:#6b7280; font-size: 12.5px; margin-top:4px; overflow: hidden; text-overflow: ellipsis; }
  `]
})
export class DebuggingListComponent {
  constructor(private router: Router) {}
  go(url: string) { this.router.navigateByUrl(url); }
}
