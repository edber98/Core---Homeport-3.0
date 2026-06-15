import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Calendar } from '@fullcalendar/core';
import frLocale from '@fullcalendar/core/locales/fr';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { RadarBackendService } from '../../services/radar-backend.service';
import { AccessControlService } from '../../services/access-control.service';

// Agenda du Radar — FullCalendar (mois/semaine/jour/liste, locale FR complète,
// flèches de navigation) + vue Chronologie par ressources (lignes Missions /
// Signaux / Rappels / Board sur l'axe du temps), responsive.

export interface AgendaItem {
  kind: 'mission' | 'signal' | 'wakeup' | 'card';
  id: string; date: string; label: string; status?: string;
  urgency?: string; category?: string; cardType?: string;
}

const KIND_COLORS: Record<string, string> = { mission: '#e61982', signal: '#1677ff', wakeup: '#faad14', card: '#52c41a' };
const KIND_LABELS: Record<string, string> = { mission: 'Missions', signal: 'Signaux', wakeup: 'Rappels planifiés', card: 'Board' };
const KINDS: AgendaItem['kind'][] = ['mission', 'signal', 'wakeup', 'card'];

@Component({
  selector: 'radar-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTagModule, NzModalModule, NzIconModule, NzButtonModule, NzSegmentedModule, NzEmptyModule],
  template: `
  <div class="agenda-toolbar">
    <nz-segmented [nzOptions]="modeOptions" [(ngModel)]="mode" (ngModelChange)="onModeChange()"></nz-segmented>
  </div>

  <!-- FullCalendar : mois / semaine / jour / liste -->
  <div class="fc-host" [hidden]="isTimeline" #calendarHost></div>

  <!-- Chronologie par ressources -->
  <div class="timeline" *ngIf="isTimeline">
    <div class="tl-toolbar">
      <button nz-button nzSize="small" (click)="tlShift(-1)"><span nz-icon nzType="left"></span></button>
      <button nz-button nzSize="small" (click)="tlToday()">Aujourd'hui</button>
      <button nz-button nzSize="small" (click)="tlShift(1)"><span nz-icon nzType="right"></span></button>
      <span class="tl-title">{{ tlTitle }}</span>
      <nz-segmented [nzOptions]="tlScaleOptions" [(ngModel)]="tlScale" (ngModelChange)="renderTimeline()" class="tl-scale"></nz-segmented>
    </div>
    <div class="tl-scroll">
      <div class="tl-grid" [style.--cols]="tlCols.length">
        <div class="tl-corner"></div>
        <div class="tl-col-head" *ngFor="let c of tlCols">{{ c }}</div>
        <ng-container *ngFor="let kind of kinds">
          <div class="tl-row-head"><span class="dot" [style.background]="colors[kind]"></span>{{ kindLabels[kind] }}</div>
          <div class="tl-lane" [style.grid-column]="'2 / span ' + tlCols.length">
            <div class="tl-chip" *ngFor="let it of tlItems[kind]"
                 [style.left.%]="it._pos" [style.background]="colors[kind]"
                 [title]="it.label" (click)="openItem(it)">{{ it.label }}</div>
          </div>
        </ng-container>
      </div>
      <nz-empty *ngIf="tlEmpty" nzNotFoundContent="Rien sur cette période."></nz-empty>
    </div>
  </div>

  <nz-modal [(nzVisible)]="dayVisible" [nzTitle]="dayTitle" [nzWidth]="720" [nzFooter]="null" (nzOnCancel)="dayVisible = false">
    <ng-container *nzModalContent>
      <div class="day-item" *ngFor="let it of dayItems">
        <span class="day-time">{{ it.date | date:'EEEE d MMMM HH:mm':'':'fr' }}</span>
        <nz-tag [nzColor]="tagColor(it.kind)">{{ kindLabel(it) }}</nz-tag>
        <span class="day-label">{{ it.label }}</span>
        <nz-tag *ngIf="it.status" class="day-status">{{ statusLabel(it) }}</nz-tag>
      </div>
    </ng-container>
  </nz-modal>
  `,
  styles: [`
    :host { display: block; padding-top: 12px; }
    .agenda-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
    .fc-host, .timeline { padding-top: 4px; }
    .fc-host { background: #fff; border-radius: 10px; }
    :host ::ng-deep .fc { font-size: 13px; }
    :host ::ng-deep .fc .fc-toolbar-title { font-size: 17px; font-weight: 600; text-transform: capitalize; }
    :host ::ng-deep .fc .fc-button { background: #fff; border-color: #d9d9d9; color: #595959; box-shadow: none; }
    :host ::ng-deep .fc .fc-button:hover { border-color: #e61982; color: #e61982; background: #fff; }
    :host ::ng-deep .fc .fc-button-active, :host ::ng-deep .fc .fc-button-primary:not(:disabled).fc-button-active { background: #e61982; border-color: #e61982; color: #fff; }
    :host ::ng-deep .fc .fc-col-header-cell-cushion { text-transform: capitalize; color: #595959; font-weight: 600; }
    :host ::ng-deep .fc .fc-event { border: none; font-size: 11.5px; cursor: pointer; }
    :host ::ng-deep .fc .fc-daygrid-day.fc-day-today, :host ::ng-deep .fc .fc-timegrid-col.fc-day-today { background: #fff0f7; }
    @media (max-width: 768px) {
      :host ::ng-deep .fc .fc-toolbar { flex-direction: column; gap: 6px; }
      :host ::ng-deep .fc .fc-toolbar-title { font-size: 14px; }
    }
    /* Chronologie */
    .timeline { background: #fff; border: 1px solid #ececec; border-radius: 10px; padding: 12px; }
    .tl-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .tl-title { font-weight: 600; text-transform: capitalize; flex: 1; }
    .tl-scroll { overflow-x: auto; }
    .tl-grid { display: grid; grid-template-columns: 150px repeat(var(--cols), minmax(64px, 1fr)); min-width: 700px; }
    .tl-corner { border-bottom: 1px solid #f0f0f0; }
    .tl-col-head { font-size: 11.5px; color: #8c8c8c; text-align: center; padding: 4px 2px; border-bottom: 1px solid #f0f0f0; border-left: 1px dashed #f5f5f5; text-transform: capitalize; }
    .tl-row-head { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #595959; padding: 14px 8px; border-bottom: 1px solid #f5f5f5; }
    .tl-lane { position: relative; border-bottom: 1px solid #f5f5f5; min-height: 46px; background:
      repeating-linear-gradient(to right, transparent, transparent calc(100% / var(--cols) - 1px), #fafafa calc(100% / var(--cols) - 1px), #fafafa calc(100% / var(--cols))); }
    .tl-chip { position: absolute; top: 50%; transform: translateY(-50%); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 10px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
    .day-item { display: flex; align-items: baseline; gap: 8px; padding: 7px 0; border-bottom: 1px dashed #f5f5f5; flex-wrap: wrap; }
    .day-time { color: #8c8c8c; font-size: 12px; text-transform: capitalize; }
    .day-label { flex: 1; font-size: 13px; min-width: 200px; }
    .day-status { font-size: 11px; }
  `],
})
export class RadarAgendaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('calendarHost') calendarHost?: ElementRef<HTMLDivElement>;
  private calendar?: Calendar;
  items: AgendaItem[] = [];
  kinds = KINDS;
  colors = KIND_COLORS;
  kindLabels = KIND_LABELS;

  // value = identifiant stable (nz-segmented renvoie la value, pas l'index)
  modeOptions = [
    { label: 'Mois', value: 'month' }, { label: 'Semaine', value: 'week' },
    { label: 'Jour', value: 'day' }, { label: 'Liste', value: 'list' },
    { label: 'Chronologie', value: 'timeline' },
  ];
  mode: 'month' | 'week' | 'day' | 'list' | 'timeline' = 'month';
  get isTimeline(): boolean { return this.mode === 'timeline'; }

  // Chronologie
  tlScaleOptions = [{ label: 'Jour', value: 'day' }, { label: 'Semaine', value: 'week' }];
  tlScale: 'day' | 'week' = 'day';
  tlDate = new Date();
  tlCols: string[] = [];
  tlItems: Record<string, (AgendaItem & { _pos?: number })[]> = { mission: [], signal: [], wakeup: [], card: [] };
  tlTitle = '';
  tlEmpty = false;

  dayVisible = false;
  dayTitle = '';
  dayItems: AgendaItem[] = [];

  constructor(private radar: RadarBackendService, private acl: AccessControlService) {}

  ngAfterViewInit(): void {
    if (!this.calendarHost) return;
    this.calendar = new Calendar(this.calendarHost.nativeElement, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
      locale: frLocale,
      initialView: window.innerWidth < 700 ? 'listWeek' : 'dayGridMonth',
      headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
      height: 'auto',
      firstDay: 1,
      // Jours de la semaine en toutes lettres
      dayHeaderFormat: { weekday: 'long', day: window.innerWidth < 700 ? undefined : 'numeric' } as any,
      views: {
        dayGridMonth: { dayHeaderFormat: { weekday: 'long' } },
        timeGridWeek: { dayHeaderFormat: { weekday: 'long', day: 'numeric' }, slotMinTime: '06:00', slotMaxTime: '22:00' },
        timeGridDay: { dayHeaderFormat: { weekday: 'long', day: 'numeric', month: 'long' }, slotMinTime: '06:00', slotMaxTime: '22:00' },
      },
      dayMaxEventRows: 4,
      navLinks: true,
      nowIndicator: true,
      eventDisplay: 'block',
      datesSet: (info) => this.fetchRange(info.start, info.end),
      eventClick: (info) => {
        const it = this.items.find(x => x.id === info.event.id);
        if (it) this.openItem(it);
      },
      navLinkDayClick: (date) => { this.openDay(date); },
    });
    this.calendar.render();
    // Mobile : démarre en vue Liste (cohérent avec initialView)
    if (window.innerWidth < 700) this.mode = 'list';
  }

  ngOnDestroy(): void { this.calendar?.destroy(); }

  private readonly FC_VIEWS: Record<string, string> = {
    month: 'dayGridMonth', week: 'timeGridWeek', day: 'timeGridDay', list: 'listWeek',
  };

  onModeChange(): void {
    if (this.isTimeline) { this.renderTimeline(); return; }
    const view = this.FC_VIEWS[this.mode];
    if (!view || !this.calendar) return;
    this.calendar.changeView(view);
    // FullCalendar a pu être masqué (retour de la chronologie) → resize
    setTimeout(() => this.calendar?.updateSize(), 0);
  }

  private fetchRange(start: Date, end: Date): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) return;
    this.radar.getAgenda(wsId, start.toISOString(), end.toISOString()).subscribe({
      next: (r) => {
        this.items = r.items;
        this.calendar?.removeAllEvents();
        for (const it of r.items) {
          this.calendar?.addEvent({
            id: it.id, title: it.label, start: it.date,
            backgroundColor: KIND_COLORS[it.kind], borderColor: KIND_COLORS[it.kind],
          });
        }
        if (this.isTimeline) this.renderTimeline(false);
      },
      error: () => {},
    });
  }

  // ── Chronologie par ressources ──
  tlShift(dir: number): void {
    const days = this.tlScale === 'day' ? 1 : 7;
    this.tlDate = new Date(this.tlDate.getTime() + dir * days * 864e5);
    this.renderTimeline();
  }
  tlToday(): void { this.tlDate = new Date(); this.renderTimeline(); }

  renderTimeline(refetch = true): void {
    const dayScale = this.tlScale === 'day';
    const start = new Date(this.tlDate);
    if (dayScale) start.setHours(0, 0, 0, 0);
    else { const d = (start.getDay() + 6) % 7; start.setDate(start.getDate() - d); start.setHours(0, 0, 0, 0); }
    const end = new Date(start.getTime() + (dayScale ? 1 : 7) * 864e5);

    this.tlTitle = dayScale
      ? start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : `Semaine du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${new Date(end.getTime() - 864e5).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    this.tlCols = dayScale
      ? Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, '0')}h`)
      : Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 864e5).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }));

    if (refetch) {
      const wsId = this.acl.currentWorkspaceId();
      if (wsId) {
        this.radar.getAgenda(wsId, start.toISOString(), end.toISOString()).subscribe({
          next: (r) => { this.items = r.items; this.placeTimeline(start, end, dayScale); },
          error: () => {},
        });
        return;
      }
    }
    this.placeTimeline(start, end, dayScale);
  }

  private placeTimeline(start: Date, end: Date, dayScale: boolean): void {
    const span = end.getTime() - start.getTime();
    const lanes: Record<string, (AgendaItem & { _pos?: number })[]> = { mission: [], signal: [], wakeup: [], card: [] };
    for (const it of this.items) {
      const t = new Date(it.date).getTime();
      if (t < start.getTime() || t >= end.getTime()) continue;
      lanes[it.kind]?.push({ ...it, _pos: Math.min(96, ((t - start.getTime()) / span) * 100) });
    }
    this.tlItems = lanes;
    this.tlEmpty = KINDS.every(k => !lanes[k].length);
  }

  openItem(it: AgendaItem): void {
    this.dayItems = [it];
    this.dayTitle = it.label;
    this.dayVisible = true;
  }

  openDay(date: Date): void {
    const key = date.toDateString();
    this.dayItems = this.items.filter(x => new Date(x.date).toDateString() === key);
    this.dayTitle = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    this.dayVisible = true;
  }

  tagColor(k: string): string { return ({ mission: 'magenta', signal: 'blue', wakeup: 'gold', card: 'green' } as any)[k] || 'default'; }
  kindLabel(it: AgendaItem): string {
    if (it.kind === 'wakeup') return new Date(it.date) > new Date() ? 'Rappel planifié' : 'Réveil';
    return ({ mission: 'Mission', signal: 'Signal', card: 'Board' } as any)[it.kind] || it.kind;
  }
  statusLabel(it: AgendaItem): string {
    const map: Record<string, string> = {
      done: 'Terminée', failed: 'Échouée', running: 'En cours', queued: 'En attente',
      pending: 'À venir', fired: 'Traité', cancelled: 'Annulé',
      handled: 'Traité', dismissed: 'Écarté', processing: 'En cours',
      open: 'Ouverte', validated: 'Validée', answered: 'Répondue', expired: 'Expirée', modified: 'Modifiée',
    };
    return map[it.status || ''] || it.status || '';
  }
}
