import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { MonacoJsonEditorComponent } from '../dynamic-form/components/monaco-json-editor.component';
import { FormTableViewerComponent } from '../../modules/dynamic-form/components/table-viewer/table-viewer';
import { RecordsTableComponent } from '../../modules/dynamic-form/components/records-table/records-table';

@Component({
  selector: 'debug-form-viewers',
  standalone: true,
  imports: [CommonModule, FormsModule, NzCardModule, NzButtonModule, MonacoJsonEditorComponent, FormTableViewerComponent, RecordsTableComponent],
  template: `
    <div class="page">
      <h1>Debug — Form Viewers</h1>
      <p>Tester les viewers génériques avec un schéma et des données.</p>
      <div class="row">
        <nz-card class="card">
          <h3>Schema (FormSchema JSON)</h3>
          <monaco-json-editor [value]="schemaText" (valueChange)="onSchema($event)" [height]="220"></monaco-json-editor>
        </nz-card>
        <nz-card class="card">
          <h3>Value (Record JSON)</h3>
          <monaco-json-editor [value]="valueText" (valueChange)="onValue($event)" [height]="220"></monaco-json-editor>
        </nz-card>
        <nz-card class="card">
          <h3>Values (Array JSON)</h3>
          <monaco-json-editor [value]="recordsText" (valueChange)="onRecords($event)" [height]="220"></monaco-json-editor>
        </nz-card>
      </div>
      <div class="row">
        <nz-card class="card wide">
          <h3>Détail (df-table-viewer)</h3>
          <df-table-viewer [schema]="schema" [value]="value"></df-table-viewer>
        </nz-card>
      </div>
      <div class="row">
        <nz-card class="card wide">
          <h3>Table (df-records-table)</h3>
          <df-records-table [schema]="schema" [records]="records"></df-records-table>
        </nz-card>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 12px; max-width: 1200px; margin: 0 auto; }
    .row { display:flex; gap:10px; margin-bottom: 10px; flex-wrap: wrap; }
    .card { flex: 1 1 360px; }
    .card.wide { flex: 1 1 100%; }
    h3 { margin: 4px 0 8px; }
  `]
})
export class DebugFormViewersComponent {
  schema: any = { title: 'Example', ui: { layout: 'vertical' }, fields: [ { type: 'text', key: 'apiKey', label: 'API Key', secret: true }, { type: 'text', key: 'email', label: 'Email' } ] };
  value: any = { apiKey: 'top-secret', email: 'john@doe.tld' };
  records: any[] = [ { __name: 'Primary', apiKey: 'xxx', email: 'john@doe.tld' }, { __name: 'Backup', apiKey: 'yyy', email: 'backup@doe.tld' } ];
  schemaText = JSON.stringify(this.schema, null, 2);
  valueText = JSON.stringify(this.value, null, 2);
  recordsText = JSON.stringify(this.records, null, 2);

  onSchema(t: string) { try { this.schema = JSON.parse(t || '{}'); this.schemaText = t; } catch {} }
  onValue(t: string)  { try { this.value = JSON.parse(t || '{}'); this.valueText = t; } catch {} }
  onRecords(t: string) { try { this.records = JSON.parse(t || '[]'); this.recordsText = t; } catch {} }
}

