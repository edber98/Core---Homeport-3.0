import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { RadarBackendService, RadarBoard, RadarCard } from '../../services/radar-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { UiMessageService } from '../../services/ui-message.service';
import { RadarEventsService } from '../../services/radar-events.service';
import { RadarChatService } from './radar-chat.service';

// Dashboard Radar (onglet) — board server-driven : le superviseur IA compose
// les cards, cette vue les rend par type et renvoie les réponses utilisateur.

@Component({
  selector: 'radar-board',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzTagModule, NzEmptyModule, NzSpinModule,
    NzIconModule, NzToolTipModule, NzPopconfirmModule, NzInputModule, NzModalModule,
  ],
  template: `
  <div class="board-toolbar">
    <span class="board-meta" *ngIf="board">
      <strong>{{ board.openCount }}</strong> élément(s) à l'attention —
      mis à jour {{ board.generatedAt | date:'HH:mm' }}
    </span>
    <button nz-button nzSize="small" (click)="reload()">
      <span nz-icon nzType="reload"></span> Actualiser
    </button>
  </div>

  <nz-spin [nzSpinning]="loading">
    <ng-container *ngIf="board">
      <nz-empty *ngIf="!board.sections.length"
                nzNotFoundContent="Rien à signaler — le radar veille. Les éléments à traiter apparaîtront ici."></nz-empty>

      <div class="board-section" *ngFor="let section of board.sections">
        <h3 class="section-title">{{ section.title }}</h3>
        <div class="cards">
          <div class="card" *ngFor="let c of section.cards"
               [class.card-alert]="c.type === 'alert'"
               [class.card-critical]="c.payload.severity === 'critical'"
               [class.card-proposal]="c.type === 'action_proposal'"
               [class.card-question]="c.type === 'question'">
            <div class="card-head">
              <span class="card-type-icon" nz-icon [nzType]="iconFor(c)" nzTheme="outline"></span>
              <span class="card-title">{{ c.title }}</span>
              <nz-tag class="card-tag" [nzColor]="tagColorFor(c)">{{ typeLabel(c.type) }}</nz-tag>
            </div>

            <div class="card-body markdown" *ngIf="c.payload.markdown"
                 [class.clamped]="!cardOpen[c.id]" [innerHTML]="md(c.payload.markdown)"></div>
            <a class="more-link" *ngIf="c.payload.markdown && c.payload.markdown.length > 280"
               (click)="cardOpen[c.id] = !cardOpen[c.id]">{{ cardOpen[c.id] ? 'Voir moins' : 'Voir plus' }}</a>
            <div class="card-body" *ngIf="c.type === 'question' && c.payload.question">{{ c.payload.question }}</div>
            <div class="proposed-action" *ngIf="c.type === 'action_proposal' && c.payload.proposedAction">
              <span nz-icon nzType="thunderbolt" nzTheme="outline"></span>
              <span><strong>Action proposée :</strong> {{ c.payload.proposedAction }}</span>
            </div>
            <div class="card-body" *ngIf="c.type === 'mission_status' && c.payload.statusText">{{ c.payload.statusText }}</div>

            <div class="card-actions" *ngIf="c.type === 'action_proposal'">
              <button nz-button nzType="primary" class="primary" [nzLoading]="busy[c.id]" (click)="respond(c, 'validate')">
                <span nz-icon nzType="check"></span> Valider
              </button>
              <button nz-button (click)="toggleModify(c.id)">
                <span nz-icon nzType="edit"></span> Modifier
              </button>
              <button nz-button nzDanger nz-popconfirm nzPopconfirmTitle="Refuser cette proposition ?" (nzOnConfirm)="respond(c, 'dismiss')">
                <span nz-icon nzType="close"></span> Refuser
              </button>
            </div>
            <div class="modify-zone" *ngIf="modifying[c.id]">
              <textarea nz-input rows="3" [(ngModel)]="drafts[c.id]"
                        placeholder="Vos ajustements (ils seront pris en compte avant exécution)…"></textarea>
              <button nz-button nzType="primary" class="primary" [disabled]="!drafts[c.id]?.trim()" [nzLoading]="busy[c.id]"
                      (click)="respond(c, 'modify', drafts[c.id])">Envoyer la version modifiée</button>
            </div>
            <div class="modify-zone" *ngIf="c.type === 'question'">
              <textarea nz-input rows="2" [(ngModel)]="drafts[c.id]" placeholder="Votre réponse…"></textarea>
              <button nz-button nzType="primary" class="primary" [disabled]="!drafts[c.id]?.trim()" [nzLoading]="busy[c.id]"
                      (click)="respond(c, 'answer', drafts[c.id])">Répondre</button>
            </div>

            <div class="card-foot">{{ c.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
          </div>
        </div>
      </div>

      <div class="closed-zone" *ngIf="board.recentClosed.length">
        <h3 class="section-title muted">Récemment traité</h3>
        <div class="closed-row" *ngFor="let c of board.recentClosed" (click)="openCard(c)">
          <nz-tag [nzColor]="stateColor(c.state)">{{ stateLabel(c.state) }}</nz-tag>
          <span class="closed-title">{{ c.title }}</span>
          <span class="closed-note" *ngIf="c.closedNote || c.userResponse?.note">{{ c.closedNote || c.userResponse?.note }}</span>
          <span class="closed-open" nz-icon nzType="expand-alt"></span>
        </div>
      </div>
    </ng-container>
  </nz-spin>

  <nz-modal [(nzVisible)]="cardDetailVisible" [nzTitle]="cardDetail?.title || ''" [nzWidth]="780" [nzFooter]="null" (nzOnCancel)="cardDetailVisible = false">
    <ng-container *nzModalContent>
      <ng-container *ngIf="cardDetail">
        <div class="cd-row">
          <nz-tag [nzColor]="tagColorFor(cardDetail)">{{ typeLabel(cardDetail.type) }}</nz-tag>
          <nz-tag [nzColor]="stateColor(cardDetail.state)">{{ stateLabel(cardDetail.state) }}</nz-tag>
          <span class="cd-date">{{ cardDetail.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
        <div class="card-body markdown" *ngIf="cardDetail.payload.markdown" [innerHTML]="md(cardDetail.payload.markdown)"></div>
        <div class="proposed-action" *ngIf="cardDetail.payload.proposedAction">
          <span nz-icon nzType="thunderbolt"></span>
          <span><strong>Action proposée :</strong> {{ cardDetail.payload.proposedAction }}</span>
        </div>
        <p *ngIf="cardDetail.payload.question"><strong>Question :</strong> {{ cardDetail.payload.question }}</p>
        <div class="cd-block" *ngIf="cardDetail.userResponse?.action">
          <strong>Votre réponse :</strong> {{ stateLabel(cardDetail.state) }}
          <p *ngIf="cardDetail.userResponse?.note">{{ cardDetail.userResponse?.note }}</p>
          <p *ngIf="cardDetail.userResponse?.answer">{{ cardDetail.userResponse?.answer }}</p>
        </div>
        <p class="cd-closed" *ngIf="cardDetail.closedNote"><strong>Clôture :</strong> {{ cardDetail.closedNote }}</p>
        <button nz-button class="cd-talk-btn" (click)="askAboutCard()">
          <span nz-icon nzType="message"></span> En parler au radar
        </button>
      </ng-container>
    </ng-container>
  </nz-modal>
  `,
  styles: [`
    :host { display: block; }
    .cd-talk-btn { margin-top: 14px; }
    .cd-row { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; }
    .cd-date { color: #8c8c8c; font-size: 12px; }
    .cd-block { margin-top: 10px; background: #fafafa; border-radius: 8px; padding: 8px 12px; font-size: 13px; }
    .cd-closed { color: #595959; font-size: 13px; margin-top: 8px; }
    .closed-row { cursor: pointer; border-radius: 6px; padding: 5px 6px; }
    .closed-row:hover { background: #fafafa; }
    .closed-open { color: #bfbfbf; font-size: 11px; margin-left: auto; }
    .board-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; flex-wrap: wrap; }
    .board-meta { color: #8c8c8c; font-size: 13px; }
    .section-title { margin: 18px 0 10px; font-size: 15px; font-weight: 600; }
    .section-title.muted { color: #8c8c8c; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(440px, 1fr)); gap: 12px; align-items: start; }
    @media (max-width: 600px) { .cards { grid-template-columns: 1fr; } }
    .card { border: 1px solid #ececec; border-radius: 12px; padding: 16px 18px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.03); transition: box-shadow .15s; }
    .card:hover { box-shadow: 0 3px 10px rgba(0,0,0,.06); }
    .card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .card-title { font-weight: 600; flex: 1; }
    .card-body { font-size: 13.5px; color: #595959; }
    .card-body.clamped { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
    .more-link { font-size: 12px; color: #e61982; cursor: pointer; display: inline-block; margin-top: 4px; }
    .card-body.markdown ::ng-deep p { margin: 4px 0; }
    .card-body.markdown ::ng-deep ul { margin: 4px 0; padding-left: 18px; }
    .card-body.markdown ::ng-deep table { border-collapse: collapse; margin: 8px 0; }
    .card-body.markdown ::ng-deep th, .card-body.markdown ::ng-deep td { border: 1px solid #f0f0f0; padding: 4px 10px; font-size: 12.5px; }
    .proposed-action { display: flex; gap: 8px; align-items: flex-start; background: #fafafa; border-radius: 8px; padding: 10px 12px; margin-top: 10px; font-size: 13px; }
    .card-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .card-actions .primary, .modify-zone .primary { background:#e61982; border-color:#e61982; color:#fff; }
    .modify-zone { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .modify-zone textarea { width: 100%; }
    .card-foot { margin-top: 10px; font-size: 11px; color: #bfbfbf; }
    .closed-zone { margin-top: 28px; border-top: 1px dashed #f0f0f0; padding-top: 8px; }
    .closed-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; flex-wrap: wrap; }
    .closed-title { font-weight: 500; }
    .closed-note { color: #8c8c8c; font-size: 12px; }
  `],
})
export class RadarBoardComponent implements OnInit, OnDestroy {
  board: RadarBoard | null = null;
  loading = false;
  cardDetailVisible = false;
  cardDetail: RadarCard | null = null;
  busy: Record<string, boolean> = {};
  cardOpen: Record<string, boolean> = {};
  modifying: Record<string, boolean> = {};
  drafts: Record<string, string> = {};
  private sub = new Subscription();

  constructor(
    private radar: RadarBackendService,
    private acl: AccessControlService,
    private sanitizer: DomSanitizer,
    private msg: UiMessageService,
    private radarEvents: RadarEventsService,
    private chatSvc: RadarChatService,
  ) {}

  ngOnInit(): void {
    this.reload();
    this.sub.add(interval(30_000).subscribe(() => this.reload(true)));
    // Temps réel : toute évolution du board → recharge immédiate silencieuse
    this.sub.add(this.radarEvents.events$.subscribe(ev => {
      if (ev.type === 'board.changed' || ev.type === 'notification.created') this.reload(true);
    }));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  reload(silent = false): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    if (!silent) this.loading = true;
    this.radar.getBoard(wsId).subscribe({
      next: (b) => { this.board = b; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  respond(card: RadarCard, action: 'validate' | 'modify' | 'dismiss' | 'answer', text?: string): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    this.busy[card.id] = true;
    const body: any = { action };
    if (action === 'modify') body.note = text;
    if (action === 'answer') body.answer = text;
    this.radar.respondToCard(wsId, card.id, body).subscribe({
      next: () => {
        this.busy[card.id] = false;
        this.modifying[card.id] = false;
        delete this.drafts[card.id];
        this.msg.success(action === 'dismiss' ? 'Proposition refusée' : action === 'answer' ? 'Réponse transmise au radar' : 'Transmis au radar — il prend le relais');
        this.reload(true);
      },
      error: (e) => { this.busy[card.id] = false; this.msg.error(e?.error?.message || 'Échec de la réponse'); },
    });
  }

  toggleModify(cardId: string): void { this.modifying[cardId] = !this.modifying[cardId]; }

  openCard(c: RadarCard): void { this.cardDetail = c; this.cardDetailVisible = true; }

  askAboutCard(): void {
    if (!this.cardDetail) return;
    this.chatSvc.open({ contextLabel: this.cardDetail.title, cardId: this.cardDetail.id, missionId: this.cardDetail.missionId });
    this.cardDetailVisible = false;
  }

  md(src: string): SafeHtml {
    try {
      const html = marked.parse(String(src || ''), { breaks: true, gfm: true }) as string;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch { return src || ''; }
  }

  iconFor(c: RadarCard): string {
    switch (c.type) {
      case 'briefing': return 'coffee';
      case 'alert': return 'warning';
      case 'action_proposal': return 'thunderbolt';
      case 'question': return 'question-circle';
      case 'mission_status': return 'rocket';
      case 'digest': return 'history';
      default: return 'file';
    }
  }

  tagColorFor(c: RadarCard): string {
    switch (c.type) {
      case 'alert': return c.payload.severity === 'critical' ? 'red' : 'orange';
      case 'action_proposal': return 'magenta';
      case 'question': return 'purple';
      case 'mission_status': return 'cyan';
      default: return 'default';
    }
  }

  typeLabel(t: string): string {
    return ({ briefing: 'Briefing', alert: 'Alerte', action_proposal: 'À valider', question: 'Question', mission_status: 'Mission', digest: 'Activité' } as any)[t] || t;
  }

  stateLabel(s: string): string {
    return ({ validated: 'Validé', modified: 'Modifié', dismissed: 'Refusé', answered: 'Répondu', done: 'Traité', expired: 'Expiré' } as any)[s] || s;
  }

  stateColor(s: string): string {
    return ({ validated: 'green', modified: 'blue', dismissed: 'red', answered: 'purple', done: 'green', expired: 'default' } as any)[s] || 'default';
  }
}
