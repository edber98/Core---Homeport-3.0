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
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService } from '../ai.service';

interface UserSkill {
  id: string; name: string; description?: string; language?: string; code: string;
  tags?: string[]; shared?: boolean; useCount?: number; forkCount?: number;
  createdBy?: string; forkedFrom?: string;
}

@Component({
  selector: 'ai-user-skills',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule,
    NzSelectModule, NzTagModule, NzEmptyModule, NzPopconfirmModule, NzToolTipModule, NzSwitchModule,
  ],
  template: `
    <div class="us-root">
      <div class="us-toolbar">
        <nz-input-group [nzPrefix]="searchIcon" class="search">
          <input nz-input placeholder="Rechercher un skill…" [(ngModel)]="q" (ngModelChange)="refresh()" />
        </nz-input-group>
        <ng-template #searchIcon><span nz-icon nzType="search"></span></ng-template>
        <nz-select [(ngModel)]="language" (ngModelChange)="refresh()" nzPlaceHolder="Tous langages" nzAllowClear style="min-width: 150px;">
          <nz-option nzValue="python" nzLabel="Python"></nz-option>
          <nz-option nzValue="javascript" nzLabel="JavaScript"></nz-option>
          <nz-option nzValue="bash" nzLabel="Bash"></nz-option>
          <nz-option nzValue="sql" nzLabel="SQL"></nz-option>
          <nz-option nzValue="mermaid" nzLabel="Mermaid"></nz-option>
          <nz-option nzValue="other" nzLabel="Autre"></nz-option>
        </nz-select>
        <nz-select [(ngModel)]="sort" (ngModelChange)="refresh()" style="min-width: 140px;">
          <nz-option nzValue="popular" nzLabel="Plus utilisés"></nz-option>
          <nz-option nzValue="recent" nzLabel="Récents"></nz-option>
          <nz-option nzValue="alpha" nzLabel="Alphabétique"></nz-option>
        </nz-select>
        <button nz-button nzType="primary" (click)="openDialog(null)">
          <span nz-icon nzType="plus"></span> Nouveau skill
        </button>
      </div>

      <div class="us-grid" *ngIf="skills().length; else emptyTpl">
        <div class="us-card" *ngFor="let s of skills()">
          <div class="us-head">
            <nz-tag [nzColor]="langColor(s.language)">{{ s.language }}</nz-tag>
            <span class="us-stats" *ngIf="s.useCount">
              <span nz-icon nzType="fire" nzTheme="outline"></span> {{ s.useCount }}
            </span>
            <span class="us-stats" *ngIf="s.forkCount">
              <span nz-icon nzType="branches" nzTheme="outline"></span> {{ s.forkCount }}
            </span>
            <span class="us-spacer"></span>
            <span *ngIf="s.forkedFrom" class="us-fork-hint" nz-tooltip nzTooltipTitle="Fork d'un autre skill">
              <span nz-icon nzType="branches" nzTheme="outline"></span>
            </span>
            <span *ngIf="!s.shared" class="us-lock" nz-tooltip nzTooltipTitle="Privé">
              <span nz-icon nzType="lock" nzTheme="outline"></span>
            </span>
          </div>
          <div class="us-name">{{ s.name }}</div>
          <div class="us-desc" *ngIf="s.description">{{ s.description }}</div>
          <pre class="us-code">{{ s.code }}</pre>
          <div class="us-tags" *ngIf="s.tags?.length">
            <nz-tag *ngFor="let t of s.tags">{{ t }}</nz-tag>
          </div>
          <div class="us-actions">
            <button nz-button nzType="primary" nzSize="small" (click)="useSkill(s)" class="us-use-btn">
              <span nz-icon nzType="copy"></span> Copier
            </button>
            <button nz-button nzSize="small" (click)="fork(s)"
                    nz-tooltip nzTooltipTitle="Dupliquer dans mon espace">
              <span nz-icon nzType="branches"></span>
            </button>
            <button nz-button nzType="text" nzSize="small" (click)="openDialog(s)"
                    nz-tooltip nzTooltipTitle="Modifier">
              <span nz-icon nzType="edit"></span>
            </button>
            <button nz-button nzType="text" nzSize="small" nzDanger
                    nz-popconfirm nzPopconfirmTitle="Supprimer ce skill ?"
                    (nzOnConfirm)="remove(s)"
                    nz-tooltip nzTooltipTitle="Supprimer">
              <span nz-icon nzType="delete"></span>
            </button>
          </div>
        </div>
      </div>

      <ng-template #emptyTpl>
        <nz-empty nzNotFoundContent="Aucun skill partagé — crée ton premier snippet."></nz-empty>
      </ng-template>
    </div>

    <div class="us-dialog" *ngIf="editing" (click)="onBackdrop($event)">
      <div class="us-dialog-inner">
        <h3>{{ editing.id ? 'Modifier le skill' : 'Nouveau skill' }}</h3>
        <label>Nom</label>
        <input nz-input [(ngModel)]="editing.name" placeholder="Ex: Parse PDF facture avec pdfplumber" />
        <label>Description</label>
        <input nz-input [(ngModel)]="editing.description" placeholder="À quoi sert ce skill ?" />
        <label>Langage</label>
        <nz-select [(ngModel)]="editing.language">
          <nz-option nzValue="python" nzLabel="Python"></nz-option>
          <nz-option nzValue="javascript" nzLabel="JavaScript"></nz-option>
          <nz-option nzValue="bash" nzLabel="Bash"></nz-option>
          <nz-option nzValue="sql" nzLabel="SQL"></nz-option>
          <nz-option nzValue="mermaid" nzLabel="Mermaid"></nz-option>
          <nz-option nzValue="other" nzLabel="Autre"></nz-option>
        </nz-select>
        <label>Code</label>
        <textarea nz-input [(ngModel)]="editing.code"
                  [nzAutosize]="{ minRows: 8, maxRows: 20 }"
                  placeholder="Le snippet complet, prêt à copier."
                  style="font-family: ui-monospace, monospace; font-size: 12px;"></textarea>
        <label>Tags</label>
        <nz-select [(ngModel)]="editing.tags" nzMode="tags" nzPlaceHolder="Ex: parse, pdf, finance…"></nz-select>
        <label class="us-switch-row">
          <span>Partager avec le workspace</span>
          <nz-switch [(ngModel)]="editing.shared"></nz-switch>
        </label>
        <div class="us-dialog-actions">
          <button nz-button (click)="editing = null">Annuler</button>
          <button nz-button nzType="primary" (click)="save()" [disabled]="!editing.name?.trim() || !editing.code?.trim()">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .us-root { display: flex; flex-direction: column; gap: 14px; }
    .us-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .us-toolbar .search { max-width: 300px; flex: 1; }
    .us-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .us-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; transition: border-color .15s, box-shadow .15s; }
    .us-card:hover { border-color: #d9d9d9; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .us-head { display: flex; align-items: center; gap: 6px; }
    .us-spacer { flex: 1; }
    .us-stats { font-size: 11px; color: #8c8c8c; display: inline-flex; align-items: center; gap: 2px; }
    .us-fork-hint, .us-lock { color: #bfbfbf; font-size: 12px; }
    .us-name { font-weight: 600; font-size: 14px; color: #262626; line-height: 1.3; }
    .us-desc { font-size: 12px; color: #8c8c8c; line-height: 1.4; }
    .us-code {
      font-family: ui-monospace, monospace; font-size: 11px;
      background: #1e1e1e; color: #d4d4d4; border-radius: 6px;
      padding: 8px 10px; max-height: 160px; overflow: auto; margin: 0;
      white-space: pre;
    }
    .us-tags { display: flex; flex-wrap: wrap; gap: 3px; }
    .us-tags nz-tag { margin: 0; font-size: 10px; }
    .us-actions { display: flex; gap: 4px; margin-top: auto; padding-top: 4px; border-top: 1px dashed #f0f0f0; }
    .us-use-btn { flex: 1; }

    .us-dialog { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(2px); }
    .us-dialog-inner { background: #fff; border-radius: 10px; padding: 20px 24px; width: 720px; max-width: 90vw; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
    .us-dialog-inner h3 { margin: 0 0 8px; font-size: 16px; }
    .us-dialog-inner label { font-size: 12px; font-weight: 500; color: #595959; margin-top: 4px; }
    .us-switch-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #262626; margin-top: 6px; }
    .us-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  `],
})
export class AiUserSkillsComponent implements OnInit {
  private ai = inject(AiService);
  private nzMsg = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  q = '';
  language: string | null = null;
  sort: 'popular' | 'recent' | 'alpha' = 'popular';
  skills = signal<UserSkill[]>([]);
  editing: Partial<UserSkill> | null = null;

  ngOnInit() { this.refresh(); }

  refresh() {
    this.ai.listUserSkills({ q: this.q, language: this.language || undefined, sort: this.sort })
      .subscribe({
        next: (res: any) => {
          this.skills.set((res?.data || res || []) as UserSkill[]);
          this.cdr.markForCheck();
        },
        error: () => this.skills.set([]),
      });
  }

  openDialog(s: UserSkill | null) {
    this.editing = s
      ? { ...s }
      : { name: '', description: '', language: 'python', code: '', tags: [], shared: true };
  }

  onBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('us-dialog')) this.editing = null;
  }

  save() {
    if (!this.editing?.name?.trim() || !this.editing?.code?.trim()) return;
    const obs = this.editing.id
      ? this.ai.updateUserSkill(this.editing.id, this.editing)
      : this.ai.createUserSkill(this.editing);
    obs.subscribe({
      next: () => { this.nzMsg.success('Skill enregistré'); this.editing = null; this.refresh(); },
      error: (err) => this.nzMsg.error(err?.error?.error?.message || 'Erreur enregistrement'),
    });
  }

  remove(s: UserSkill) {
    this.ai.deleteUserSkill(s.id).subscribe({
      next: () => { this.nzMsg.success('Skill supprimé'); this.refresh(); },
      error: () => this.nzMsg.error('Erreur suppression'),
    });
  }

  fork(s: UserSkill) {
    this.ai.forkUserSkill(s.id).subscribe({
      next: () => { this.nzMsg.success(`"${s.name}" dupliqué dans ton espace`); this.refresh(); },
      error: () => this.nzMsg.error('Erreur fork'),
    });
  }

  useSkill(s: UserSkill) {
    this.ai.useUserSkill(s.id).subscribe({
      next: (res: any) => {
        const code = res?.data?.code || res?.code || s.code;
        try { navigator.clipboard.writeText(code); } catch {}
        this.nzMsg.success(`Code "${s.name}" copié dans le presse-papier`);
      },
      error: () => this.nzMsg.error('Erreur'),
    });
  }

  langColor(l?: string): string {
    return ({
      python: 'blue', javascript: 'gold', bash: 'green',
      sql: 'purple', mermaid: 'magenta', other: 'default',
    } as any)[l || 'other'] || 'default';
  }
}
