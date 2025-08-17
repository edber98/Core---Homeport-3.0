import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { MonacoJsonEditorComponent } from '../../dynamic-form/components/monaco-json-editor.component';
import { UiTokensService } from '../services/ui-tokens.service';
import { UiBreakpoint } from '../services/ui-breakpoints.service';
import { UiClassStyleService, UiState } from '../services/ui-class-style.service';

@Component({
  selector: 'ui-class-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzSelectModule, NzModalModule, NzButtonModule, MonacoJsonEditorComponent],
  template: `
  <div class="cls">
    <div class="panel-heading"><div class="card-title"><div class="t">Classes</div><div class="s">Manager</div></div></div>
    <div class="row new-row">
      <input nz-input class="inp" placeholder=".class ou combo .btn.primary" [(ngModel)]="newName" />
      <button class="btn" (click)="create()" title="Ajouter"><i class="fa-solid fa-plus"></i></button>
      <button class="btn" (click)="openCssEditor()" title="Éditer CSS"><i class="fa-solid fa-code"></i></button>
    </div>
    <div class="classes">
      <button class="chip" *ngFor="let c of classes" (click)="select(c.name)" [class.sel]="c.name===selected" title="{{c.name}}">{{c.name}}</button>
    </div>
    <div class="editor" *ngIf="selected; else noSel">
      <div class="row">
        <input nz-input class="inp" [(ngModel)]="renameTo" />
        <button class="btn" (click)="rename()" title="Renommer"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="btn danger" (click)="remove()" title="Supprimer"><i class="fa-regular fa-trash-can"></i></button>
        <button class="btn" (click)="clearSelection()" title="Désélectionner"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="row mt-8">
        <div class="sub">Scope</div>
        <nz-select class="sel" [(ngModel)]="state" (ngModelChange)="reloadStyles()" nzPlaceHolder="Scope">
          <nz-option nzValue="base" nzLabel="Base"></nz-option>
          <nz-option nzValue="hover" nzLabel=":hover"></nz-option>
          <nz-option nzValue="active" nzLabel=":active"></nz-option>
          <nz-option nzValue="focus" nzLabel=":focus"></nz-option>
        </nz-select>
      </div>
      <div class="mt-8">
        <div class="sub">Styles ({{bp}})</div>
        <div class="kv" *ngFor="let kv of styleList; let i = index">
          <input nz-input class="inp" placeholder="clé (ex: color)" [(ngModel)]="kv.k" (ngModelChange)="reEmit()" />
          <input nz-input class="inp" placeholder="valeur (ex: var(--color-primary))" [(ngModel)]="kv.v" (ngModelChange)="reEmit()" list="tokenList" />
          <nz-select class="u" [(ngModel)]="kv.u" (ngModelChange)="applyUnit(i, kv.u || '')" nzAllowClear nzPlaceHolder="—">
            <nz-option nzValue="px" nzLabel="px"></nz-option>
            <nz-option nzValue="%" nzLabel="%"></nz-option>
            <nz-option nzValue="rem" nzLabel="rem"></nz-option>
            <nz-option nzValue="vw" nzLabel="vw"></nz-option>
            <nz-option nzValue="vh" nzLabel="vh"></nz-option>
          </nz-select>
          <button class="btn" (click)="removeStyle(i)" title="Retirer"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <datalist id="tokenList">
          <option *ngFor="let t of tokenKeys" [value]="'var(' + t + ')'"></option>
        </datalist>
        <button class="mini" (click)="addStyle()"><i class="fa-solid fa-plus"></i> Style</button>
      </div>
      <div class="mt-12">
        <div class="sub">Appliquer à l’élément sélectionné</div>
        <div class="row">
          <input nz-input class="inp" placeholder="classe à ajouter" [(ngModel)]="applyName" />
          <button class="btn" (click)="applyToSelection()" title="Ajouter à l’élément"><i class="fa-solid fa-plus"></i></button>
          <button class="btn" (click)="removeFromSelection()" title="Retirer de l’élément"><i class="fa-solid fa-minus"></i></button>
      </div>
      </div>
    </div>
    <ng-template #noSel>
      <div class="hint">Sélectionnez une classe pour l’éditer.</div>
    </ng-template>
  </div>
  
  <nz-modal [(nzVisible)]="showCssModal" nzTitle="Édition CSS des classes" (nzOnCancel)="cancelCssEditor()" (nzOnOk)="saveCssEditor()" [nzOkText]="'Sauvegarder'" [nzCancelText]="'Annuler'">
    <monaco-json-editor [(value)]="cssText" [language]="'css'" [height]="360"></monaco-json-editor>
    <div style="margin-top:8px; font-size:12px; color:#64748b;">Note: éditeur CSS simple, états/media non pris en charge ici.</div>
  </nz-modal>
  `,
  styles: [`
  .cls {  }
  .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
  .row { display:flex; gap:8px; align-items:center; }
  .new-row { background: #fff; padding-bottom: 6px; }
  .inp { flex:1; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; font-size:12px; }
  .sel { border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; font-size:12px; }
  :host ::ng-deep .sel.ant-select.ant-select-focused .ant-select-selector,
  :host ::ng-deep .sel.ant-select.ant-select-open .ant-select-selector { border-top: 2px solid #e5e7eb !important; }
  .btn { border:1px solid #e5e7eb; background:#fff; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; }
  .danger { color:#b91c1c; }
  .classes { display:flex; flex-wrap:wrap; gap:6px; margin:6px 0; }
  .classes .chip { border:1px solid #e5e7eb; border-radius:999px; padding:4px 8px; font-size:12px; background:#fff; cursor:pointer; }
  .classes .chip.sel { border-color:#1677ff; color:#1677ff; }
  .kv { display:grid; grid-template-columns: 1fr 1fr 58px auto; gap:6px; align-items:center; margin-bottom:6px; }
  .u { border:1px solid #e5e7eb; border-radius:6px; padding:4px 6px; font-size:12px; width:58px; }
  .mini { font-size:12px; padding:4px 8px; }
  .sub { font-weight:600; font-size:12px; color:#111; margin: 6px 0; }
  .mt-8 { margin-top:8px; }
  .mt-12 { margin-top:12px; }
  .hint { font-size:12px; color:#64748b; }
  `]
})
export class UiClassManagerComponent {
  @Input() bp: UiBreakpoint | 'auto' = 'auto';
  @Input() selectionClasses: string[] = [];
  @Output() selectionAddClass = new EventEmitter<string>();
  @Output() selectionRemoveClass = new EventEmitter<string>();
  @Output() stylesChange = new EventEmitter<void>();
  constructor(public cls: UiClassStyleService, private tokens: UiTokensService) {}
  newName = '';
  renameTo = '';
  selected = '';
  state: UiState = 'base';
  styleList: Array<{k:string; v:string; u?: string}> = [];
  applyName = '';
  collapsed = false;
  showCssModal = false;
  cssText = '';
  @Output() cssEdited = new EventEmitter<void>();

  get classes() { return this.cls.list(); }
  create() { const name = (this.newName || '').trim().replace(/^\./,''); if (!name) return; this.cls.ensure(name); this.newName=''; }
  // Toggle selection when clicking the same chip
  select(name: string) {
    if (this.selected === name) { this.clearSelection(); return; }
    this.selected = name; this.renameTo = name; this.reloadStyles();
  }
  clearSelection() { this.selected = ''; this.renameTo=''; this.styleList = []; }
  rename() { if (!this.selected) return; const nn = (this.renameTo||'').trim(); if (!nn) return; this.cls.rename(this.selected, nn); this.selected = nn; }
  remove() { if (!this.selected) return; this.cls.remove(this.selected); this.selected=''; this.styleList=[]; }
  addStyle() { this.styleList.push({ k:'', v:'' }); }
  removeStyle(i: number) { this.styleList.splice(i,1); this.reEmit(); }
  openCssEditor() { this.cssText = this.exportClassesAsCss(); this.showCssModal = true; }
  saveCssEditor() { this.importCss(this.cssText); this.showCssModal = false; this.stylesChange.emit(); this.cssEdited.emit(); }
  cancelCssEditor() { this.showCssModal = false; }
  private exportClassesAsCss(): string {
    const lines: string[] = [];
    for (const c of this.cls.list()) {
      const base = this.cls.getStyles(c.name, 'base', 'auto');
      const keys = Object.keys(base);
      if (!keys.length) continue;
      lines.push(`.${c.parts.join('.') } {`);
      for (const k of keys) lines.push(`  ${k}: ${base[k]};`);
      lines.push('');
      lines.push('}');
    }
    return lines.join('\n');
  }
  private importCss(css: string) {
    const re = /\.([\w\-.]+)\s*\{([^}]+)\}/g; let m: RegExpExecArray | null;
    while ((m = re.exec(css))) {
      const clsName = m[1].trim().replace(/\./g, '.');
      const body = m[2];
      const styles: Record<string,string> = {};
      body.split(';').forEach(rule => {
        const [k, v] = rule.split(':');
        if (!k || !v) return;
        const key = k.trim(); const val = v.trim();
        if (key) styles[key] = val;
      });
      if (Object.keys(styles).length) this.cls.setStyles(clsName, 'base', 'auto', styles);
    }
  }
  reloadStyles() {
    const styles = this.cls.getStyles(this.selected, this.state, this.bp);
    this.styleList = Object.keys(styles).map(k => ({ k, v: styles[k] }));
  }
  reEmit() {
    if (!this.selected) return;
    const obj: Record<string,string> = {};
    for (const {k,v} of this.styleList) { if (k) obj[k] = this.formatValue(k, v); }
    this.cls.setStyles(this.selected, this.state, this.bp, obj);
    this.stylesChange.emit();
  }
  applyToSelection() { const name = (this.applyName||this.selected||'').trim(); if (!name) return; this.selectionAddClass.emit(name); }
  removeFromSelection() { const name = (this.applyName||this.selected||'').trim(); if (!name) return; this.selectionRemoveClass.emit(name); }
  get tokenKeys(): string[] { return Object.keys(this.tokens.tokens); }
  applyUnit(i: number, unit: string) {
    const it = this.styleList[i]; if (!it) return;
    const raw = String(it.v || '').trim();
    if (!raw) return;
    if (/^[-+]?[0-9]*\.?[0-9]+$/.test(raw)) it.v = raw + unit;
    else if (unit && !raw.endsWith(unit)) it.v = raw + unit;
    this.reEmit();
  }
  private formatValue(k: string, v: string): string {
    const raw = String(v ?? '').trim();
    if (!raw) return '';
    const lengthRe = /(width|height|min|max|margin|padding|top|right|bottom|left|gap|font|radius|letter|line)/i;
    if (/^[-+]?[0-9]*\.?[0-9]+$/.test(raw) && lengthRe.test(k)) return raw + 'px';
    return raw;
  }
}
