import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { UiNode, UiTag } from '../ui-model.service';

@Component({
  selector: 'ui-inspector-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzSelectModule],
  template: `
  <div class="inspector">
    <div class="panel-heading"><div class="card-title"><div class="t">Inspector</div><div class="s">Propriétés</div></div></div>
    <div *ngIf="node; else noSel">
      <label class="lbl">Tag</label>
      <nz-select [(ngModel)]="_tag" (ngModelChange)="onTagChange($event)" nzPlaceHolder="tag">
        <nz-option *ngFor="let t of tags" [nzValue]="t" [nzLabel]="t"></nz-option>
      </nz-select>

      <div *ngIf="supportsText(_tag)" class="mt-8">
        <label class="lbl">Texte</label>
        <input nz-input type="text" [(ngModel)]="_text" (ngModelChange)="emitPatch({ text: _text })" />
      </div>

      <div class="mt-8">
        <label class="lbl">Classes (séparées par espace)</label>
        <input nz-input type="text" [(ngModel)]="_classes" (ngModelChange)="emitPatch({ classes: parseClasses(_classes) })" />
      </div>

      <div class="mt-12">
        <div class="sub">Attributs</div>
        <div class="kv" *ngFor="let kv of attrList; let i = index">
          <input nz-input placeholder="clé (ex: id)" [(ngModel)]="kv.k" (ngModelChange)="onAttrChange()" />
          <input nz-input placeholder="valeur" [(ngModel)]="kv.v" (ngModelChange)="onAttrChange()" />
          <button type="button" (click)="removeAttr(i)">×</button>
        </div>
        <button type="button" class="mini" (click)="addAttr()">+ Ajouter attribut</button>
      </div>

      <div class="mt-12">
        <div class="sub">Style (clé/valeur)</div>
        <div class="kv" *ngFor="let kv of styleList; let i = index">
          <input nz-input list="style-keys" placeholder="clé (ex: display)" [(ngModel)]="kv.k" (ngModelChange)="onStyleChange()" />
          <input nz-input placeholder="valeur (ex: flex)" [(ngModel)]="kv.v" (ngModelChange)="onStyleChange()" />
          <button type="button" (click)="removeStyle(i)">×</button>
        </div>
        <datalist id="style-keys">
          <option *ngFor="let s of styleKeys" [value]="s"></option>
        </datalist>
        <button type="button" class="mini" (click)="addStyle()">+ Ajouter style</button>
      </div>

      <div class="mt-12">
        <div class="sub">Flex Layout</div>
        <div class="row2">
          <label><input type="checkbox" [checked]="styleMap['display']==='flex'" (change)="setStyle('display',$event.target.checked?'flex':null)"/> Flex</label>
          <nz-select [(ngModel)]="styleMap['flexDirection']" (ngModelChange)="setStyle('flexDirection', $event)" nzAllowClear nzPlaceHolder="direction">
            <nz-option nzValue="row" nzLabel="row"></nz-option>
            <nz-option nzValue="column" nzLabel="column"></nz-option>
          </nz-select>
          <input nz-input placeholder="gap (px)" type="number" [(ngModel)]="styleMap['gap']" (ngModelChange)="setStyle('gap', $event? ('' + $event + 'px'): null)" />
        </div>
        <div class="row2">
          <nz-select [(ngModel)]="styleMap['justifyContent']" (ngModelChange)="setStyle('justifyContent', $event)" nzAllowClear nzPlaceHolder="justify">
            <nz-option *ngFor="let o of justify" [nzValue]="o" [nzLabel]="o"></nz-option>
          </nz-select>
          <nz-select [(ngModel)]="styleMap['alignItems']" (ngModelChange)="setStyle('alignItems', $event)" nzAllowClear nzPlaceHolder="align">
            <nz-option *ngFor="let o of align" [nzValue]="o" [nzLabel]="o"></nz-option>
          </nz-select>
        </div>
      </div>

      <div class="row mt-8">
        <button type="button" (click)="moveUp.emit()">Monter</button>
        <button type="button" (click)="moveDown.emit()">Descendre</button>
        <button type="button" class="danger" (click)="remove.emit()" [disabled]="node && node.id==='root'">Supprimer</button>
      </div>
    </div>
    <ng-template #noSel>
      <div class="hint">Sélectionnez un élément pour l’éditer.</div>
    </ng-template>
  </div>
  `,
  styles: [`
  .inspector { padding: 12px; }
  .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
  .lbl { display:block; font-size:12px; color:#64748b; margin-bottom:4px; }
  input, select { width:100%; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; font-size:12px; }
  .row { display:flex; gap:8px; }
  .row2 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; align-items:center; }
  .mt-8 { margin-top: 8px; }
  .mt-12 { margin-top: 12px; }
  .sub { font-weight:600; font-size:12px; color:#111; margin-bottom:6px; }
  .kv { display:grid; grid-template-columns: 1fr 1fr auto; gap:6px; align-items:center; margin-bottom:6px; }
  .mini { font-size:12px; padding:4px 8px; border:1px solid #e5e7eb; background:#fff; border-radius:6px; cursor:pointer; }
  .danger { background:#b91c1c; color:#fff; }
  button { border:1px solid #e5e7eb; background:#fff; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; }
  `]
})
export class UiInspectorPanelComponent {
  @Input() node: UiNode | null = null;
  @Input() bp: 'auto'|'xs'|'sm'|'md'|'lg'|'xl' = 'auto';
  @Output() patch = new EventEmitter<Partial<UiNode>>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  tags: UiTag[] = ['div','section','header','footer','h1','h2','h3','p','span','label','input','button','img','ul','li'];
  _tag: UiTag = 'div';
  _text = '';
  _classes = '';
  attrList: Array<{k:string; v:string}> = [];
  styleList: Array<{k:string; v:string}> = [];
  styleMap: Record<string, any> = {};
  styleKeys: string[] = ['display','flexDirection','flexWrap','gap','justifyContent','alignItems','alignContent','width','height','padding','margin','color','backgroundColor','border','borderRadius'];
  justify = ['flex-start','center','space-between','space-around','space-evenly','flex-end'];
  align = ['stretch','flex-start','center','flex-end','baseline'];

  ngOnChanges() {
    this._tag = (this.node?.tag || 'div') as UiTag;
    this._text = this.node?.text || '';
    this._classes = (this.node?.classes || []).join(' ');
    const attrs = this.node?.attrs || {};
    this.attrList = Object.keys(attrs).map(k => ({ k, v: attrs[k] }));
    const st = this.getStyleTarget();
    this.styleList = Object.keys(st).map(k => ({ k, v: st[k] as any }));
    this.styleMap = { ...st } as any;
  }

  supportsText(tag: string): boolean {
    return ['h1','h2','h3','p','span','label','button','li'].includes(tag);
  }
  parseClasses(v: string): string[] { return (v || '').split(/\s+/).map(s => s.trim()).filter(Boolean); }
  emitPatch(p: Partial<UiNode>) { this.patch.emit(p); }
  onTagChange(v: any) { const val = String(v) as UiTag; this._tag = val; this.patch.emit({ tag: val }); }
  addAttr() { this.attrList.push({ k: '', v: '' }); }
  removeAttr(i: number) { this.attrList.splice(i,1); this.onAttrChange(); }
  onAttrChange() {
    const obj: Record<string,string> = {};
    for (const {k,v} of this.attrList) { if (k) obj[k] = v ?? ''; }
    this.patch.emit({ attrs: obj });
  }
  addStyle() { this.styleList.push({ k: '', v: '' }); }
  removeStyle(i: number) { this.styleList.splice(i,1); this.onStyleChange(); }
  onStyleChange() {
    const obj: Record<string,string> = {};
    for (const {k,v} of this.styleList) { if (k) obj[k] = v ?? ''; }
    this.emitStyle(obj);
  }
  setStyle(k: string, v: string | null | undefined) {
    const base = this.getStyleTarget();
    const obj = { ...base } as any;
    if (v == null || v === '') delete obj[k]; else obj[k] = v;
    this.styleList = Object.keys(obj).map(x => ({ k: x, v: obj[x] }));
    this.styleMap = { ...obj };
    this.emitStyle(obj);
  }
  private getStyleTarget(): Record<string,string> {
    if (!this.node) return {};
    if (this.bp && this.bp !== 'auto') {
      return (this.node.styleBp?.[this.bp] || {}) as any;
    }
    return this.node.style || {};
  }
  private emitStyle(obj: Record<string,string>) {
    if (this.bp && this.bp !== 'auto') {
      const styleBp = { ...(this.node?.styleBp || {}) } as any;
      styleBp[this.bp] = obj;
      this.patch.emit({ styleBp });
    } else {
      this.patch.emit({ style: obj });
    }
  }
}
