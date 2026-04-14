import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService, AiThread } from '../ai.service';

@Component({
  selector: 'ai-thread-share-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzButtonModule, NzIconModule, NzSelectModule,
    NzCheckboxModule, NzAvatarModule, NzTagModule, NzPopconfirmModule, NzAlertModule,
  ],
  template: `
    <div class="share-body">
      <nz-alert *ngIf="warning" [nzMessage]="warning" nzType="warning" nzShowIcon style="margin-bottom:12px"></nz-alert>

      <div class="share-section">
        <label>Ajouter des membres</label>
        <div class="share-add-row">
          <nz-select
            [(ngModel)]="newUserIds"
            nzMode="multiple"
            nzPlaceHolder="Sélectionner des membres"
            style="flex:1">
            <nz-option *ngFor="let m of availableMembers()" [nzValue]="m.userId" [nzLabel]="m.name || m.email"></nz-option>
          </nz-select>
          <nz-select [(ngModel)]="newPermission" style="width:140px">
            <nz-option nzValue="view" nzLabel="Lecture"></nz-option>
            <nz-option nzValue="comment" nzLabel="Commenter"></nz-option>
            <nz-option nzValue="edit" nzLabel="Édition"></nz-option>
          </nz-select>
        </div>
        <div class="share-add-actions">
          <label nz-checkbox [(ngModel)]="notify">Notifier par email</label>
          <button nz-button nzType="primary" nzSize="small" [disabled]="!newUserIds.length" (click)="addShares()">
            <span nz-icon nzType="plus" nzTheme="outline"></span> Partager
          </button>
        </div>
        <button nz-button nzType="link" nzSize="small" (click)="shareWithAll()" style="margin-top:6px">
          Partager avec tous les membres
        </button>
      </div>

      <div class="share-section" *ngIf="shares.length">
        <label>Accès actuels</label>
        <div class="share-list">
          <div class="share-row" *ngFor="let s of shares">
            <nz-avatar nzIcon="user" [nzSize]="28"></nz-avatar>
            <span class="share-name">{{ userName(s.userId) }}</span>
            <nz-select [ngModel]="s.permission" style="width:120px"
              (ngModelChange)="updatePermission(s.userId, $event)">
              <nz-option nzValue="view" nzLabel="Lecture"></nz-option>
              <nz-option nzValue="comment" nzLabel="Commenter"></nz-option>
              <nz-option nzValue="edit" nzLabel="Édition"></nz-option>
            </nz-select>
            <button nz-button nzType="text" nzSize="small" nzDanger
              nz-popconfirm nzPopconfirmTitle="Révoquer l'accès ?"
              (nzOnConfirm)="revoke(s.userId)">
              <span nz-icon nzType="delete" nzTheme="outline"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="share-actions">
        <button nz-button (click)="close.emit()">Fermer</button>
      </div>
    </div>
  `,
  styles: [`
    .share-body { padding: 12px; min-width: 420px; }
    .share-section { margin-bottom: 14px; }
    .share-section label { display: block; font-size: 12px; font-weight: 500; color: #666; margin-bottom: 6px; }
    .share-add-row { display: flex; gap: 8px; margin-bottom: 6px; }
    .share-add-actions { display: flex; justify-content: space-between; align-items: center; }
    .share-list { border: 1px solid #f0f0f0; border-radius: 6px; }
    .share-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #f5f5f5; }
    .share-row:last-child { border-bottom: none; }
    .share-name { flex: 1; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .share-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; padding-top: 10px; border-top: 1px solid #f5f5f5; }
  `],
})
export class AiThreadShareDialogComponent implements OnInit {
  @Input() thread!: AiThread;
  @Output() close = new EventEmitter<void>();

  public ai = inject(AiService);
  private nzMsg = inject(NzMessageService);

  members: any[] = [];
  shares: any[] = [];
  newUserIds: string[] = [];
  newPermission: 'view' | 'comment' | 'edit' = 'view';
  notify = true;
  warning = '';

  ngOnInit() {
    this.loadMembers();
    this.loadShares();
    this.computeWarning();
  }

  loadMembers() {
    this.ai.listWorkspaceMembers().subscribe({
      next: (list: any) => { this.members = list?.data || list || []; },
      error: () => {},
    });
  }

  loadShares() {
    if (!this.thread?._id && !this.thread?.id) return;
    const id = this.thread._id || this.thread.id;
    this.ai.listShares(id).subscribe({
      next: (list: any) => { this.shares = list?.data || list || []; },
      error: () => {},
    });
  }

  computeWarning() {
    const msgCount = this.ai.messages().length;
    const attCount = this.ai.messages().reduce((acc, m) => acc + (m.attachments?.length || 0), 0);
    if (msgCount > 100 || attCount > 10) {
      this.warning = `Cette conversation contient ${msgCount} messages et ${attCount} fichiers. Vérifiez le contenu avant de partager.`;
    }
  }

  availableMembers(): any[] {
    const sharedIds = new Set(this.shares.map(s => s.userId));
    return this.members.filter(m => !sharedIds.has(m.userId || m._id));
  }

  userName(userId: string): string {
    const m = this.members.find(x => (x.userId || x._id) === userId);
    return m?.name || m?.email || userId;
  }

  addShares() {
    if (!this.newUserIds.length) return;
    const id = this.thread._id || this.thread.id;
    this.ai.shareThread(id, this.newUserIds, this.newPermission, this.notify).subscribe({
      next: () => {
        this.nzMsg.success('Partagé');
        this.newUserIds = [];
        this.loadShares();
      },
      error: (e) => this.nzMsg.error(e?.message || 'Erreur'),
    });
  }

  shareWithAll() {
    const sharedIds = new Set(this.shares.map(s => s.userId));
    const userIds = this.members.map(m => m.userId || m._id).filter(id => !sharedIds.has(id));
    if (!userIds.length) {
      this.nzMsg.info('Tous les membres ont déjà accès');
      return;
    }
    const tid = this.thread._id || this.thread.id;
    this.ai.shareThread(tid, userIds, this.newPermission, this.notify).subscribe({
      next: () => { this.nzMsg.success('Partagé avec tous les membres'); this.loadShares(); },
      error: (e) => this.nzMsg.error(e?.message || 'Erreur'),
    });
  }

  updatePermission(userId: string, permission: 'view' | 'comment' | 'edit') {
    const tid = this.thread._id || this.thread.id;
    this.ai.updateShare(tid, userId, permission).subscribe({
      next: () => { this.nzMsg.success('Permission mise à jour'); this.loadShares(); },
      error: (e) => this.nzMsg.error(e?.message || 'Erreur'),
    });
  }

  revoke(userId: string) {
    const tid = this.thread._id || this.thread.id;
    this.ai.revokeShare(tid, userId).subscribe({
      next: () => { this.nzMsg.success('Accès révoqué'); this.loadShares(); },
      error: (e) => this.nzMsg.error(e?.message || 'Erreur'),
    });
  }
}
