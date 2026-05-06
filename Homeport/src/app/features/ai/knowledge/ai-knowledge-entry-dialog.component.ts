import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule, NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiProjectKnowledgeEntry, AiProjectKnowledgeType } from '../ai.service';

export interface AiKnowledgeDialogData {
  entry?: AiProjectKnowledgeEntry | null;
  existingKeys?: string[];
}

@Component({
  selector: 'ai-knowledge-entry-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzModalModule, NzFormModule, NzInputModule, NzInputNumberModule,
    NzSelectModule, NzDatePickerModule, NzCheckboxModule, NzButtonModule, NzTagModule, NzIconModule,
  ],
  template: `
    <form nz-form nzLayout="vertical" class="kdialog">
      <nz-form-item>
        <nz-form-label nzRequired>Clé</nz-form-label>
        <nz-form-control [nzErrorTip]="keyError">
          <input nz-input [(ngModel)]="key" name="key" placeholder="client.name"
                 [disabled]="!!data.entry" (ngModelChange)="onKeyChange()" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Type</nz-form-label>
        <nz-form-control>
          <nz-select [(ngModel)]="type" name="type" style="width:100%" (ngModelChange)="onTypeChange($event)">
            <nz-option nzValue="text" nzLabel="Texte"></nz-option>
            <nz-option nzValue="number" nzLabel="Nombre"></nz-option>
            <nz-option nzValue="date" nzLabel="Date"></nz-option>
            <nz-option nzValue="url" nzLabel="URL"></nz-option>
            <nz-option nzValue="email" nzLabel="Email"></nz-option>
            <nz-option nzValue="boolean" nzLabel="Vrai/Faux"></nz-option>
            <nz-option nzValue="list" nzLabel="Liste"></nz-option>
            <nz-option nzValue="json" nzLabel="JSON"></nz-option>
            <nz-option nzValue="file" nzLabel="Fichier"></nz-option>
          </nz-select>
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label nzRequired>Valeur</nz-form-label>
        <nz-form-control [nzErrorTip]="valueError">
          <!-- text / email / file -->
          <input *ngIf="type === 'text' || type === 'email' || type === 'file'"
                 nz-input [(ngModel)]="valueStr" name="value"
                 [type]="type === 'email' ? 'email' : 'text'" />

          <!-- url -->
          <input *ngIf="type === 'url'" nz-input [(ngModel)]="valueStr" name="value"
                 type="url" placeholder="https://..." />

          <!-- number -->
          <nz-input-number *ngIf="type === 'number'"
                           [(ngModel)]="valueNum" name="value" style="width:100%"></nz-input-number>

          <!-- date -->
          <nz-date-picker *ngIf="type === 'date'"
                          [(ngModel)]="valueDate" name="value" style="width:100%"></nz-date-picker>

          <!-- boolean -->
          <label *ngIf="type === 'boolean'" nz-checkbox [(ngModel)]="valueBool" name="value">Vrai</label>

          <!-- list -->
          <div *ngIf="type === 'list'" class="list-input">
            <nz-tag *ngFor="let item of valueList; let i = index" nzMode="closeable"
                    (nzOnClose)="removeListItem(i)">{{ item }}</nz-tag>
            <input nz-input class="list-add" [(ngModel)]="listDraft" name="listDraft"
                   placeholder="Ajouter puis Entrée" (keydown.enter)="addListItem(); $event.preventDefault()" />
          </div>

          <!-- json -->
          <textarea *ngIf="type === 'json'" nz-input [(ngModel)]="valueStr" name="value"
                    [nzAutosize]="{ minRows: 4, maxRows: 12 }"
                    placeholder='{ "key": "value" }'></textarea>
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Description</nz-form-label>
        <nz-form-control>
          <textarea nz-input [(ngModel)]="description" name="description"
                    [nzAutosize]="{ minRows: 2, maxRows: 4 }"
                    placeholder="Contexte de cette info (optionnel)"></textarea>
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Tags</nz-form-label>
        <nz-form-control>
          <div class="list-input">
            <nz-tag *ngFor="let t of tags; let i = index" nzMode="closeable"
                    (nzOnClose)="removeTag(i)">{{ t }}</nz-tag>
            <input nz-input class="list-add" [(ngModel)]="tagDraft" name="tagDraft"
                   placeholder="Ajouter tag puis Entrée" (keydown.enter)="addTag(); $event.preventDefault()" />
          </div>
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-control>
          <label nz-checkbox [(ngModel)]="pinned" name="pinned">
            <span nz-icon nzType="pushpin" nzTheme="outline"></span>
            Épingler (toujours visible en haut)
          </label>
        </nz-form-control>
      </nz-form-item>

      <div class="kdialog-footer">
        <button nz-button (click)="cancel()">Annuler</button>
        <button nz-button nzType="primary" (click)="save()">{{ data.entry ? 'Mettre à jour' : 'Ajouter' }}</button>
      </div>
    </form>
  `,
  styles: [`
    .kdialog { display: block; padding: 4px 0; }
    .kdialog-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
    .list-input { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 4px; border: 1px solid #d9d9d9; border-radius: 6px; min-height: 36px; }
    .list-input .list-add { flex: 1; min-width: 160px; border: none; box-shadow: none !important; padding: 0 4px; }
  `],
})
export class AiKnowledgeEntryDialogComponent implements OnInit {
  data: AiKnowledgeDialogData = inject(NZ_MODAL_DATA) || {};
  private modalRef = inject(NzModalRef);
  private msg = inject(NzMessageService);

  key = '';
  type: AiProjectKnowledgeType = 'text';
  description = '';
  pinned = false;
  tags: string[] = [];
  tagDraft = '';

  // Typed values
  valueStr = '';
  valueNum: number | null = null;
  valueDate: Date | null = null;
  valueBool = false;
  valueList: string[] = [];
  listDraft = '';

  keyError = '';
  valueError = '';

  ngOnInit() {
    const e = this.data.entry;
    if (e) {
      this.key = e.key;
      this.type = (e.type as AiProjectKnowledgeType) || 'text';
      this.description = e.description || '';
      this.pinned = !!e.pinned;
      this.tags = [...(e.tags || [])];
      this.setValueFromEntry(e.value);
    }
  }

  private setValueFromEntry(v: any) {
    switch (this.type) {
      case 'number': this.valueNum = typeof v === 'number' ? v : parseFloat(v); break;
      case 'date': this.valueDate = v ? new Date(v) : null; break;
      case 'boolean': this.valueBool = !!v; break;
      case 'list': this.valueList = Array.isArray(v) ? [...v] : (v ? [String(v)] : []); break;
      case 'json': this.valueStr = typeof v === 'string' ? v : JSON.stringify(v ?? '', null, 2); break;
      default: this.valueStr = v == null ? '' : String(v);
    }
  }

  onTypeChange(_t: string) {
    // Keep existing typed values but clear error
    this.valueError = '';
  }

  onKeyChange() {
    this.keyError = '';
  }

  addListItem() {
    const v = (this.listDraft || '').trim();
    if (!v) return;
    this.valueList = [...this.valueList, v];
    this.listDraft = '';
  }
  removeListItem(i: number) { this.valueList.splice(i, 1); }

  addTag() {
    const v = (this.tagDraft || '').trim();
    if (!v) return;
    if (v.length > 40) { this.msg.warning('Tag trop long (max 40)'); return; }
    if (!this.tags.includes(v)) this.tags = [...this.tags, v];
    this.tagDraft = '';
  }
  removeTag(i: number) { this.tags.splice(i, 1); }

  private buildValue(): any {
    switch (this.type) {
      case 'number': return this.valueNum;
      case 'date': return this.valueDate ? this.valueDate.toISOString() : null;
      case 'boolean': return !!this.valueBool;
      case 'list': return [...this.valueList];
      case 'json':
        try { return this.valueStr ? JSON.parse(this.valueStr) : null; }
        catch { throw new Error('JSON invalide'); }
      case 'email':
        if (this.valueStr && !/^\S+@\S+\.\S+$/.test(this.valueStr)) throw new Error('Email invalide');
        return this.valueStr;
      case 'url':
        if (this.valueStr && !/^https?:\/\//i.test(this.valueStr)) throw new Error('URL invalide (http/https)');
        return this.valueStr;
      default: return this.valueStr;
    }
  }

  validate(): boolean {
    this.keyError = '';
    this.valueError = '';
    // Flush any pending tag/list drafts so user doesn't lose them silently
    if (this.tagDraft.trim()) this.addTag();
    if (this.type === 'list' && this.listDraft.trim()) this.addListItem();

    const key = (this.key || '').trim();
    if (!key) { this.keyError = 'Clé requise'; return false; }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(key)) {
      this.keyError = 'Format : alphanumérique + . _ - (max 100)';
      return false;
    }
    if (!this.data.entry && (this.data.existingKeys || []).includes(key)) {
      this.keyError = 'Cette clé existe déjà';
      return false;
    }
    try {
      const v = this.buildValue();
      if (v === null || v === undefined || v === '') {
        if (this.type !== 'boolean' && !(this.type === 'list' && this.valueList.length === 0)) {
          this.valueError = 'Valeur requise';
          return false;
        }
      }
    } catch (e: any) {
      this.valueError = e?.message || 'Valeur invalide';
      return false;
    }
    return true;
  }

  save() {
    if (!this.validate()) return;
    const entry: AiProjectKnowledgeEntry = {
      key: this.key.trim(),
      value: this.buildValue(),
      type: this.type,
      description: this.description || '',
      pinned: this.pinned,
      tags: this.tags,
    };
    if (this.data.entry?._id) entry._id = this.data.entry._id;
    this.modalRef.close(entry);
  }

  cancel() { this.modalRef.close(null); }
}
