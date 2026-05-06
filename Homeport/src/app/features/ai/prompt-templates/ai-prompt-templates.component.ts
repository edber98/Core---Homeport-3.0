import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService } from '../ai.service';

interface PromptTpl {
  id: string; name: string; description?: string; prompt: string;
  category?: string; tags?: string[]; shared?: boolean; useCount?: number;
  createdBy?: string; _id?: string;
}

@Component({
  selector: 'ai-prompt-templates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule,
    NzSelectModule, NzTagModule, NzEmptyModule, NzPopconfirmModule, NzToolTipModule, NzSwitchModule,
  ],
  template: `
    <div class="pt-root">
      <div class="pt-toolbar">
        <nz-input-group [nzPrefix]="searchIcon" class="search">
          <input nz-input placeholder="Rechercher un template…" [(ngModel)]="q" (ngModelChange)="refresh()" />
        </nz-input-group>
        <ng-template #searchIcon><span nz-icon nzType="search"></span></ng-template>
        <nz-select [(ngModel)]="category" (ngModelChange)="refresh()" nzPlaceHolder="Toutes catégories" nzAllowClear style="min-width: 180px;">
          <nz-option nzValue="général" nzLabel="Général"></nz-option>
          <nz-option nzValue="code" nzLabel="Code"></nz-option>
          <nz-option nzValue="analyse" nzLabel="Analyse"></nz-option>
          <nz-option nzValue="rédaction" nzLabel="Rédaction"></nz-option>
          <nz-option nzValue="data" nzLabel="Data"></nz-option>
          <nz-option nzValue="projet" nzLabel="Projet"></nz-option>
          <nz-option nzValue="autre" nzLabel="Autre"></nz-option>
        </nz-select>
        <nz-select [(ngModel)]="sort" (ngModelChange)="refresh()" style="min-width: 140px;">
          <nz-option nzValue="popular" nzLabel="Plus utilisés"></nz-option>
          <nz-option nzValue="recent" nzLabel="Récents"></nz-option>
          <nz-option nzValue="alpha" nzLabel="Alphabétique"></nz-option>
        </nz-select>
        <button nz-button nzType="primary" (click)="openDialog(null)">
          <span nz-icon nzType="plus"></span> Nouveau template
        </button>
      </div>

      <div class="pt-grid" *ngIf="templates().length; else emptyTpl">
        <div class="pt-card" *ngFor="let t of templates()">
          <div class="pt-head">
            <nz-tag [nzColor]="categoryColor(t.category)" class="pt-cat">{{ t.category || 'général' }}</nz-tag>
            <span class="pt-uses" *ngIf="t.useCount">
              <span nz-icon nzType="fire" nzTheme="outline"></span> {{ t.useCount }}
            </span>
            <span class="pt-spacer"></span>
            <span class="pt-share" *ngIf="!t.shared" nz-tooltip nzTooltipTitle="Privé (visible uniquement par toi)">
              <span nz-icon nzType="lock" nzTheme="outline"></span>
            </span>
          </div>
          <div class="pt-name">{{ t.name }}</div>
          <div class="pt-desc" *ngIf="t.description">{{ t.description }}</div>
          <div class="pt-preview">{{ t.prompt }}</div>
          <div class="pt-tags" *ngIf="t.tags?.length">
            <nz-tag *ngFor="let tag of t.tags">{{ tag }}</nz-tag>
          </div>
          <div class="pt-actions">
            <button nz-button nzType="primary" nzSize="small" (click)="useTemplate(t)" class="pt-use-btn">
              <span nz-icon nzType="send"></span> Utiliser
            </button>
            <button nz-button nzType="text" nzSize="small" (click)="openDialog(t)" nz-tooltip nzTooltipTitle="Modifier">
              <span nz-icon nzType="edit"></span>
            </button>
            <button nz-button nzType="text" nzSize="small" nzDanger
                    nz-popconfirm nzPopconfirmTitle="Supprimer ce template ?"
                    (nzOnConfirm)="remove(t)"
                    nz-tooltip nzTooltipTitle="Supprimer">
              <span nz-icon nzType="delete"></span>
            </button>
          </div>
        </div>
      </div>

      <ng-template #emptyTpl>
        <nz-empty nzNotFoundContent="Aucun template — crée ton premier prompt réutilisable."></nz-empty>
      </ng-template>
    </div>

    <!-- Modal édition -->
    <div class="pt-dialog" *ngIf="editing" (click)="onBackdrop($event)">
      <div class="pt-dialog-inner">
        <h3>{{ editing.id ? 'Modifier le template' : 'Nouveau template' }}</h3>
        <label>Nom</label>
        <input nz-input [(ngModel)]="editing.name" placeholder="Ex: Analyse juridique" />
        <label>Description (optionnelle)</label>
        <input nz-input [(ngModel)]="editing.description" placeholder="À quoi sert ce template ?" />
        <label>Prompt</label>
        <textarea nz-input [(ngModel)]="editing.prompt" [nzAutosize]="{ minRows: 5, maxRows: 16 }" placeholder="Le texte du prompt réutilisable. Utilise {variable} pour les placeholders."></textarea>
        <label>Catégorie</label>
        <nz-select [(ngModel)]="editing.category" nzPlaceHolder="Catégorie">
          <nz-option nzValue="général" nzLabel="Général"></nz-option>
          <nz-option nzValue="code" nzLabel="Code"></nz-option>
          <nz-option nzValue="analyse" nzLabel="Analyse"></nz-option>
          <nz-option nzValue="rédaction" nzLabel="Rédaction"></nz-option>
          <nz-option nzValue="data" nzLabel="Data"></nz-option>
          <nz-option nzValue="projet" nzLabel="Projet"></nz-option>
          <nz-option nzValue="autre" nzLabel="Autre"></nz-option>
        </nz-select>
        <label>Tags</label>
        <nz-select [(ngModel)]="editing.tags" nzMode="tags" nzPlaceHolder="Ex: client, reporting…"></nz-select>
        <label class="pt-switch-row">
          <span>Partager avec le workspace</span>
          <nz-switch [(ngModel)]="editing.shared"></nz-switch>
        </label>
        <div class="pt-dialog-actions">
          <button nz-button (click)="editing = null">Annuler</button>
          <button nz-button nzType="primary" (click)="save()" [disabled]="!editing.name?.trim() || !editing.prompt?.trim()">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pt-root { display: flex; flex-direction: column; gap: 14px; }
    .pt-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .pt-toolbar .search { max-width: 300px; flex: 1; }
    .pt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .pt-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; transition: border-color .15s, box-shadow .15s; }
    .pt-card:hover { border-color: #d9d9d9; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .pt-head { display: flex; align-items: center; gap: 6px; }
    .pt-spacer { flex: 1; }
    .pt-cat { margin: 0; font-size: 11px; text-transform: capitalize; }
    .pt-uses { font-size: 11px; color: #fa8c16; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; }
    .pt-share { color: #8c8c8c; font-size: 12px; }
    .pt-name { font-weight: 600; font-size: 14px; color: #262626; line-height: 1.3; }
    .pt-desc { font-size: 12px; color: #8c8c8c; line-height: 1.4; }
    .pt-preview {
      font-size: 11px; color: #595959; background: #fafafa; border-radius: 6px;
      padding: 6px 8px; font-family: ui-monospace, monospace;
      overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
      -webkit-line-clamp: 3; -webkit-box-orient: vertical; line-height: 1.4;
    }
    .pt-tags { display: flex; flex-wrap: wrap; gap: 3px; }
    .pt-tags nz-tag { margin: 0; font-size: 10px; }
    .pt-actions { display: flex; gap: 4px; margin-top: auto; padding-top: 4px; border-top: 1px dashed #f0f0f0; }
    .pt-use-btn { flex: 1; }

    .pt-dialog {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 9999;
      backdrop-filter: blur(2px);
    }
    .pt-dialog-inner {
      background: #fff; border-radius: 10px; padding: 20px 24px;
      width: 640px; max-width: 90vw; max-height: 90vh; overflow-y: auto;
      display: flex; flex-direction: column; gap: 8px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    }
    .pt-dialog-inner h3 { margin: 0 0 8px; font-size: 16px; }
    .pt-dialog-inner label { font-size: 12px; font-weight: 500; color: #595959; margin-top: 4px; }
    .pt-switch-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #262626; margin-top: 6px; }
    .pt-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  `],
})
export class AiPromptTemplatesComponent implements OnInit {
  private ai = inject(AiService);
  private nzMsg = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  q = '';
  category: string | null = null;
  sort: 'popular' | 'recent' | 'alpha' = 'popular';
  templates = signal<PromptTpl[]>([]);

  editing: Partial<PromptTpl> | null = null;

  ngOnInit() { this.refresh(); }

  refresh() {
    this.ai.listPromptTemplates({ q: this.q, category: this.category || undefined, sort: this.sort })
      .subscribe({
        next: (res: any) => {
          const list = (res?.data || res || []) as PromptTpl[];
          this.templates.set(list);
          this.cdr.markForCheck();
        },
        error: () => this.templates.set([]),
      });
  }

  openDialog(t: PromptTpl | null) {
    this.editing = t
      ? { ...t }
      : { name: '', description: '', prompt: '', category: 'général', tags: [], shared: true };
  }

  onBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('pt-dialog')) this.editing = null;
  }

  save() {
    if (!this.editing) return;
    const e = this.editing;
    if (!e.name?.trim() || !e.prompt?.trim()) return;
    const obs = e.id
      ? this.ai.updatePromptTemplate(e.id, e)
      : this.ai.createPromptTemplate(e);
    obs.subscribe({
      next: () => { this.nzMsg.success(e.id ? 'Template mis à jour' : 'Template créé'); this.editing = null; this.refresh(); },
      error: (err) => this.nzMsg.error(err?.error?.error?.message || 'Erreur enregistrement'),
    });
  }

  remove(t: PromptTpl) {
    this.ai.deletePromptTemplate(t.id).subscribe({
      next: () => { this.nzMsg.success('Template supprimé'); this.refresh(); },
      error: () => this.nzMsg.error('Erreur suppression'),
    });
  }

  useTemplate(t: PromptTpl) {
    this.ai.usePromptTemplate(t.id).subscribe({
      next: (res: any) => {
        const prompt = res?.data?.prompt || res?.prompt || t.prompt;
        (this.ai as any).promptTemplateApply$?.next?.(prompt);
        this.nzMsg.info(`Template "${t.name}" inséré dans le chat`);
      },
      error: () => this.nzMsg.error('Erreur'),
    });
  }

  categoryColor(cat?: string): string {
    return ({
      'général': 'default', 'code': 'geekblue', 'analyse': 'purple',
      'rédaction': 'magenta', 'data': 'cyan', 'projet': 'orange', 'autre': 'default',
    } as any)[cat || 'général'] || 'default';
  }
}
