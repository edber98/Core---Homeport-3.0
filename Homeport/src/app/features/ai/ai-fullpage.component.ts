import { Component, ChangeDetectorRef, OnInit, OnDestroy, AfterViewInit, HostListener, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService, AiThread, AiAvailableAgent, AiAttachment, AI_MAX_FILES, AI_MAX_FILE_SIZE } from './ai.service';
import { AiAudioService } from './ai-audio.service';
import { ApiClientService } from '../../services/api-client.service';
import { AccessControlService } from '../../services/access-control.service';
import { AiChatComponent } from './ai-chat.component';
import { AiSettingsComponent } from './ai-settings.component';
import { AiCanvasPanelComponent } from './canvas/ai-canvas-panel.component';
import { AiProjectRootPickerComponent } from './project/ai-project-root-picker.component';
import { AiThreadShareDialogComponent } from './sharing/ai-thread-share-dialog.component';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { WindowHostComponent } from './window-manager/window-host.component';

@Component({
  selector: 'ai-fullpage',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzSelectModule, NzInputModule, NzTagModule, NzSpinModule, NzEmptyModule, NzToolTipModule, NzPopconfirmModule, NzPopoverModule, NzModalModule, NzDrawerModule, NzBadgeModule, NzAvatarModule, AiChatComponent, AiSettingsComponent, AiCanvasPanelComponent, AiProjectRootPickerComponent, AiThreadShareDialogComponent, WindowHostComponent],
  template: `
    <div
      class="fp-layout"
      [class.mobile-sidebar-open]="!sidebarCollapsed && isMobileSidebar()"
      [class.mobile-sidebar-animating]="mobileSidebarAnimating"
    >
      <!-- Sidebar -->
      <div class="fp-sidebar" [class.collapsed]="sidebarCollapsed"
        (touchstart)="onSidebarTouchStart($event)"
        (touchmove)="onSidebarTouchMove($event)"
        (touchend)="onSidebarTouchEnd()"
        (touchcancel)="onSidebarTouchEnd()">
        <div class="sidebar-header">
          <span class="sidebar-title" *ngIf="!sidebarCollapsed || isMobileSidebar()">Conversations</span>
          <button nz-button nzType="text" nzSize="small" class="sidebar-toggle-btn" (click)="toggleSidebarPanel()"
            nz-tooltip [nzTooltipTitle]="sidebarCollapsed ? 'Afficher' : 'Masquer'">
            <span nz-icon [nzType]="sidebarCollapsed ? 'menu-unfold' : 'menu-fold'" nzTheme="outline"></span>
          </button>
        </div>

        <div class="sidebar-panel-body" *ngIf="!sidebarCollapsed || isMobileSidebar()">
          <!-- Agent selector -->
          <div class="sidebar-agent">
            <ng-container *ngIf="sidebarAgentUseNative; else sidebarAgentDesktop">
              <select class="sp-native-select" [(ngModel)]="selectedAgentId" (ngModelChange)="onAgentChange($event)">
                <option value="general">Assistant général</option>
                <optgroup *ngIf="systemAgents.length" label="Système">
                  <ng-container *ngFor="let a of systemAgents">
                    <option *ngIf="a.id !== 'general'" [value]="a.id">{{ a.name }}</option>
                  </ng-container>
                </optgroup>
                <optgroup *ngIf="customAgents.length" label="Personnalisés">
                  <option *ngFor="let a of customAgents" [value]="a.id">{{ a.name }}</option>
                </optgroup>
              </select>
            </ng-container>
            <ng-template #sidebarAgentDesktop>
              <nz-select
                class="sidebar-agent-select"
                [(ngModel)]="selectedAgentId"
                (ngModelChange)="onAgentChange($event)"
                nzPlaceHolder="Agent"
                nzSize="small"
                nzShowSearch
                style="width: 100%"
                [nzOptionHeightPx]="36">
                <nz-option-group *ngIf="systemAgents.length" nzLabel="Système">
                  <nz-option *ngFor="let a of systemAgents" [nzValue]="a.id" [nzLabel]="a.name" nzCustomContent>
                    <div class="agent-opt">
                      <img *ngIf="a.icon" [src]="a.icon" class="agent-opt-icon" />
                      <span *ngIf="!a.icon" nz-icon nzType="robot" nzTheme="outline" class="agent-opt-nz"></span>
                      <span>{{ a.name }}</span>
                    </div>
                  </nz-option>
                </nz-option-group>
                <nz-option-group *ngIf="customAgents.length" nzLabel="Personnalisés">
                  <nz-option *ngFor="let a of customAgents" [nzValue]="a.id" [nzLabel]="a.name" nzCustomContent>
                    <div class="agent-opt">
                      <span nz-icon nzType="user" nzTheme="outline" class="agent-opt-nz custom"></span>
                      <span>{{ a.name }}</span>
                    </div>
                  </nz-option>
                </nz-option-group>
              </nz-select>
            </ng-template>
          </div>

          <!-- New thread button -->
          <div class="sidebar-new sidebar-new-v2">
            <button nz-button nzType="primary" nzSize="small" class="new-thread-btn" (click)="newThread()">
              <span nz-icon nzType="plus" nzTheme="outline"></span> Nouvelle conversation
            </button>
            <button nz-button nzType="default" nzSize="small" class="new-project-btn" (click)="openProjectPicker()"
              nz-tooltip nzTooltipTitle="Nouveau projet (dossier distant)">
              <span nz-icon nzType="folder-add" nzTheme="outline"></span>
            </button>
          </div>

          <!-- Threads list -->
          <div class="sidebar-threads" #threadsScroll (scroll)="onThreadsScroll($event)">
            <div *ngIf="threadsLoading && threads.length === 0" class="threads-loading">
              <nz-spin nzSimple nzSize="small"></nz-spin>
              <span>Chargement des conversations…</span>
            </div>
            <div *ngIf="!threadsLoading && threads.length === 0" class="empty-threads">
              <nz-empty nzNotFoundContent="Aucune conversation" [nzNotFoundImage]="'simple'"></nz-empty>
            </div>
            <!-- Owned threads -->
            <div class="threads-group" *ngIf="ownedThreads().length">
              <div class="threads-group-title" *ngIf="sharedThreads().length">Mes conversations</div>
            </div>
            <div class="thread-item"
              *ngFor="let t of ownedThreads()"
              (click)="selectThread(t)"
              [class.active]="t._id === ai.currentThread()?._id">
              <div class="thread-title">
                {{ t.title }}
                <span *ngIf="t.visibility === 'shared'" nz-icon nzType="team" nzTheme="outline" class="shared-badge"
                  nz-tooltip nzTooltipTitle="Partagée"></span>
              </div>
              <div class="thread-meta">
                <span class="mode-tag" [class]="'mode-' + t.mode">{{ modeLabel(t.mode) }}</span>
                <span class="thread-agent" *ngIf="t.agentId && t.agentId !== 'general'">{{ agentName(t.agentId) }}</span>
                <span class="thread-date">{{ t.updatedAt | date:'short' }}</span>
              </div>
              <button class="thread-share" nz-button nzType="text" nzSize="small"
                (click)="openShareDialog(t, $event)"
                nz-tooltip nzTooltipTitle="Partager">
                <span nz-icon nzType="share-alt" nzTheme="outline"></span>
              </button>
              <button class="thread-delete" nz-button nzType="text" nzSize="small" nzDanger
                nz-popconfirm nzPopconfirmTitle="Supprimer ?"
                (nzOnConfirm)="deleteThread(t)"
                (click)="$event.stopPropagation()">
                <span nz-icon nzType="delete" nzTheme="outline"></span>
              </button>
            </div>

            <!-- Shared threads -->
            <div class="threads-group" *ngIf="sharedThreads().length">
              <div class="threads-group-title">
                <span nz-icon nzType="team" nzTheme="outline"></span> Partagées avec moi
              </div>
            </div>
            <div class="thread-item thread-item-shared"
              *ngFor="let t of sharedThreads()"
              (click)="selectThread(t)"
              [class.active]="t._id === ai.currentThread()?._id">
              <nz-avatar nzIcon="user" [nzSize]="22" class="shared-owner-avatar"></nz-avatar>
              <div class="thread-item-body">
                <div class="thread-title">{{ t.title }}</div>
                <div class="thread-meta">
                  <span class="mode-tag" [class]="'mode-' + t.mode">{{ modeLabel(t.mode) }}</span>
                  <span class="thread-date">{{ t.updatedAt | date:'short' }}</span>
                </div>
              </div>
            </div>
            <div *ngIf="threadsLoadingMore" class="threads-loading-more">
              <nz-spin nzSimple nzSize="small"></nz-spin>
              <span>Chargement des conversations suivantes…</span>
            </div>
          </div>

        </div>

        <!-- Settings link -->
        <div class="sidebar-bottom">
          <button nz-button nzType="text" nzSize="small" [nzBlock]="!sidebarCollapsed || isMobileSidebar()" (click)="toggleSettingsFromSidebar()"
            [class.active-btn]="showSettings" nz-tooltip [nzTooltipTitle]="sidebarCollapsed ? 'Paramètres' : null">
            <span nz-icon nzType="setting" nzTheme="outline"></span>
            <span *ngIf="!sidebarCollapsed || isMobileSidebar()">Paramètres</span>
          </button>
        </div>
      </div>

      <div
        class="mobile-sidebar-backdrop"
        [class.visible]="!sidebarCollapsed"
        (click)="closeSidebarPanel()"
        (touchstart)="onMainTouchStart($event)"
        (touchmove)="onMainTouchMove($event)"
        (touchend)="onMainTouchEnd()"
        (touchcancel)="onMainTouchEnd()"
      ></div>

      <!-- Main content -->
      <div
        class="fp-main"
        [class.sidebar-collapsed]="sidebarCollapsed"
        (touchstart)="onMainTouchStart($event)"
        (touchmove)="onMainTouchMove($event)"
        (touchend)="onMainTouchEnd()"
        (touchcancel)="onMainTouchEnd()"
      >
        <!-- Mobile sidebar open (always visible when no thread) -->
        <div class="fp-mobile-top-bar" *ngIf="!ai.currentThread() && !showSettings">
          <button
            nz-button nzType="text" nzSize="small"
            class="mobile-sidebar-open-btn"
            [class.visible]="sidebarCollapsed"
            (click)="openSidebarPanel()"
            nz-tooltip nzTooltipTitle="Conversations"
          >
            <span nz-icon nzType="menu-unfold" nzTheme="outline"></span>
          </button>
        </div>

        <!-- Settings overlay -->
        <ai-settings *ngIf="showSettings" class="fp-settings"></ai-settings>

        <ng-template #assistantHeroInput>
          <div class="assistant-view assistant-floating">
            <div class="ai-content ai-floating-content">
              <div class="ai-main" [class.has-center-files]="centerPendingAttachments.length > 0">
                <div class="ai-header ai-header-center">
                  <div class="ai-icon-wrap"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                  <div class="ai-header-copy">
                    <div class="ai-title">Assistant IA</div>
                    <div class="ai-subtitle">Posez une question sur vos workflows</div>
                  </div>
                </div>
                <div class="att-previews" *ngIf="centerPendingAttachments.length">
                  <div class="att-chip" *ngFor="let att of centerPendingAttachments; let i = index"
                       [class.att-uploading]="att.uploading" [class.att-error]="!!att.error">
                    <img *ngIf="att.previewUrl && isImage(att.mimeType)" [src]="att.previewUrl" class="att-thumb" />
                    <span *ngIf="!att.previewUrl || !isImage(att.mimeType)" nz-icon nzType="file" nzTheme="outline" class="att-icon"></span>
                    <span class="att-name" [title]="att.name">{{ att.name }}</span>
                    <span class="att-size">{{ formatFileSize(att.size) }}</span>
                    <span nz-icon *ngIf="att.uploading" nzType="loading" nzTheme="outline" class="att-loading"></span>
                    <span nz-icon *ngIf="att.error" nzType="warning" nzTheme="outline" class="att-warn" [title]="att.error"></span>
                    <button nz-button nzType="text" nzSize="small" class="att-remove" (click)="removeCenterAttachment(i)">
                      <span nz-icon nzType="close" nzTheme="outline"></span>
                    </button>
                  </div>
                </div>
                <div class="ai-input-row">
                  <div class="ai-input-shell" [class.ai-input-shell-multiline]="aiInputMultiline">
                    <button
                      nz-button
                      nzType="text"
                      nzSize="small"
                      nzShape="circle"
                      class="ai-mic-btn"
                      [class.mic-recording]="audioService.recording()"
                      (click)="toggleMic()"
                      [nz-tooltip]="audioService.recording() ? 'Arrêter l\\'enregistrement' : 'Dicter un message'"
                    >
                      <i
                        class="fa-solid"
                        [class.fa-microphone]="!audioService.recording()"
                        [class.fa-stop]="audioService.recording()"
                      ></i>
                    </button>
                    <button
                      nz-button
                      nzType="text"
                      nzSize="small"
                      nzShape="circle"
                      class="ai-attach-btn"
                      [class.has-files]="centerPendingAttachments.length > 0"
                      (click)="centerFileInput.click()"
                      [disabled]="ai.streaming() || centerPendingAttachments.length >= maxCenterFiles"
                      nz-tooltip nzTooltipTitle="Joindre un fichier"
                    >
                      <span nz-icon nzType="paper-clip" nzTheme="outline"></span>
                    </button>
                    <input #centerFileInput type="file" multiple hidden (change)="onCenterFilesSelected($event)" />
                    <textarea
                      nz-input
                      #aiInputEl
                      [(ngModel)]="aiInput"
                      [nzAutosize]="{ minRows: 1, maxRows: 5 }"
                      [placeholder]="aiInputPlaceholder"
                      (keydown)="onAiInputKeydown($event)"
                      (input)="onAiInputChanged()"
                      class="ai-input"
                    ></textarea>
                    <button
                      nz-button
                      nzType="primary"
                      nzSize="small"
                      nzShape="circle"
                      class="ai-send-btn"
                      (click)="sendAiMessage()"
                      [disabled]="!aiInput.trim() && !centerPendingAttachments.length"
                    >
                      <i class="fa-solid fa-arrow-up"></i>
                    </button>
                  </div>
                </div>
                <div class="ai-recording-bar" *ngIf="audioService.recording()">
                  <span class="rec-dot"></span>
                  <span>Enregistrement en cours… {{ audioService.recordingDuration() }}s</span>
                </div>
                <div class="ai-transcribing" *ngIf="audioService.transcribing()">
                  <nz-spin nzSimple nzSize="small"></nz-spin>
                  <span>Transcription…</span>
                </div>
              </div>
              <div class="ai-hints">
                <nz-tag class="ai-hint" (click)="sendHint('Résumé de mes workflows')">
                  <i class="fa-solid fa-list-check"></i> Résumé workflows
                </nz-tag>
                <nz-tag class="ai-hint" (click)="sendHint('Quels flows ont des erreurs ?')">
                  <i class="fa-solid fa-triangle-exclamation"></i> Erreurs récentes
                </nz-tag>
                <nz-tag class="ai-hint" (click)="sendHint('Crée-moi un workflow')">
                  <i class="fa-solid fa-plus"></i> Créer un workflow
                </nz-tag>
              </div>
            </div>
          </div>
        </ng-template>

        <!-- Chat or empty state -->
        <ng-container *ngIf="!showSettings">
          <div class="fp-empty" *ngIf="!ai.currentThread()">
            <ng-container [ngTemplateOutlet]="assistantHeroInput"></ng-container>
          </div>

          <!-- Chat header + chat -->
          <ng-container *ngIf="ai.currentThread()">
            <div class="fp-chat-header">
              <button
                nz-button nzType="text" nzSize="small"
                class="mobile-sidebar-open-btn"
                [class.visible]="sidebarCollapsed"
                (click)="openSidebarPanel()"
                nz-tooltip nzTooltipTitle="Conversations"
              >
                <span nz-icon nzType="menu-unfold" nzTheme="outline"></span>
              </button>
              <div class="chat-title">{{ ai.currentThread()?.title }}</div>
              <div class="chat-badges">
                <span class="mode-tag" [class]="'mode-' + ai.currentThread()?.mode">{{ modeLabel(ai.currentThread()?.mode || 'chat') }}</span>
                <a class="linked-link" *ngIf="linkedElementLabel()" (click)="openLinkedElement()" nz-tooltip nzTooltipTitle="Ouvrir l'élément lié">
                  <span nz-icon nzType="link" nzTheme="outline"></span>
                  {{ linkedElementLabel() }}
                </a>
                <span class="agent-badge" *ngIf="ai.currentThread()?.agentId && ai.currentThread()?.agentId !== 'general'">
                  {{ agentName(ai.currentThread()!.agentId!) }}
                </span>
              </div>
              <div class="chat-actions">
                <!-- Badges présence (utilisateurs actifs sur la conversation) -->
                <div class="presence-badges" *ngIf="(ai.presence()?.length || 0) > 1"
                     nz-tooltip [nzTooltipTitle]="presenceTooltip()">
                  <ng-container *ngIf="ai.presence() as plist">
                    <div *ngFor="let p of plist.slice(0, 3); trackBy: trackPresence"
                         class="presence-avatar"
                         [style.background]="avatarColor(p.userId)">
                      {{ initials(p.name || p.userId) }}
                    </div>
                    <div *ngIf="plist.length > 3" class="presence-more">+{{ plist.length - 3 }}</div>
                  </ng-container>
                </div>
                <!-- Jauge contexte tokens -->
                <button *ngIf="ai.contextUsage() as u"
                  nz-button nzType="text" nzSize="small"
                  class="chat-action-btn context-gauge"
                  [class.gauge-warn]="u.percent >= 70 && u.percent < 90"
                  [class.gauge-alert]="u.percent >= 90"
                  nz-popover [nzPopoverContent]="gaugePopover" nzPopoverTrigger="click" nzPopoverPlacement="bottomRight"
                  nz-tooltip [nzTooltipTitle]="(u.tokens/1000 | number:'1.1-1') + 'k / ' + (u.limit/1000 | number:'1.0-0') + 'k tokens — ' + u.model"
                  nzTooltipOverlayClassName="chat-action-tooltip">
                  {{ u.percent }}%
                </button>
                <ng-template #gaugePopover>
                  <div style="min-width: 220px; padding: 4px 0;" *ngIf="ai.contextUsage() as u">
                    <div style="font-weight: 600; margin-bottom: 6px;">Contexte de la conversation</div>
                    <div style="font-size: 12px; color: #595959;">
                      <div>{{ (u.tokens / 1000 | number:'1.1-1') }}k tokens sur {{ (u.limit / 1000 | number:'1.0-0') }}k</div>
                      <div>Modèle : <code>{{ u.model }}</code></div>
                      <div>{{ u.messageCount }} messages</div>
                    </div>
                    <div style="height: 6px; background: #f0f0f0; border-radius: 3px; margin: 10px 0;">
                      <div [style.width.%]="u.percent"
                           [style.background]="u.percent >= 90 ? '#ff4d4f' : u.percent >= 70 ? '#faad14' : '#52c41a'"
                           style="height: 100%; border-radius: 3px; transition: width .3s;"></div>
                    </div>
                    <button *ngIf="u.percent >= 70"
                      nz-button nzSize="small" nzBlock (click)="askCompact()"
                      style="margin-top: 4px;">
                      <span nz-icon nzType="compress" nzTheme="outline"></span>
                      Compacter et continuer
                    </button>
                  </div>
                </ng-template>
                <!-- Badge détection auto mémoire (projet uniquement) -->
                <button *ngIf="ai.currentThread()?.mode === 'project' && ai.pendingKnowledgeCount() > 0"
                  nz-button nzType="text" nzSize="small" class="chat-action-btn knowledge-pending-btn"
                  (click)="openKnowledgePending()"
                  nz-tooltip [nzTooltipTitle]="'Voir les ' + ai.pendingKnowledgeCount() + ' suggestion(s) en attente'"
                  nzTooltipOverlayClassName="chat-action-tooltip">
                  <nz-badge [nzCount]="ai.pendingKnowledgeCount()" [nzOverflowCount]="9" nzSize="small">
                    <span nz-icon nzType="bulb" nzTheme="outline" style="font-size: 16px; color: #faad14;"></span>
                  </nz-badge>
                </button>
                <button nz-button nzType="text" nzSize="small" class="chat-action-btn" (click)="regenerateTitle()"
                  nz-tooltip nzTooltipTitle="Régénérer le titre" nzTooltipOverlayClassName="chat-action-tooltip" [nzLoading]="regeneratingTitle">
                  <span nz-icon nzType="reload" nzTheme="outline"></span>
                </button>
                <button nz-button nzType="text" nzSize="small" class="chat-action-btn" (click)="duplicateThread()"
                  nz-tooltip nzTooltipTitle="Dupliquer la conversation" nzTooltipOverlayClassName="chat-action-tooltip">
                  <span nz-icon nzType="copy" nzTheme="outline"></span>
                </button>
                <button nz-button nzType="text" nzSize="small" class="chat-action-btn"
                  [class.active]="ai.canvasOpen()"
                  (click)="toggleCanvasPanel()"
                  nz-tooltip [nzTooltipTitle]="ai.canvasOpen() ? 'Fermer le panneau' : 'Ouvrir le panneau (fichiers, recherche…)'" nzTooltipOverlayClassName="chat-action-tooltip">
                  <span nz-icon [nzType]="ai.canvasOpen() ? 'layout' : 'appstore'" nzTheme="outline"></span>
                </button>
                <button nz-button nzType="text" nzSize="small" class="chat-action-btn"
                  nz-popover [nzPopoverContent]="settingsPopover" nzPopoverTrigger="click" nzPopoverPlacement="bottomRight" nzPopoverOverlayClassName="thread-settings-popover"
                  nz-tooltip nzTooltipTitle="Paramètres" nzTooltipOverlayClassName="chat-action-tooltip">
                  <span nz-icon nzType="setting" nzTheme="outline"></span>
                </button>
              </div>

              <ng-template #settingsPopover>
                <div class="settings-popover">
                  <div class="sp-field">
                    <label>Titre</label>
                    <input nz-input nzSize="small" [ngModel]="ai.currentThread()?.title" (ngModelChange)="updateThreadTitle($event)" />
                  </div>
                  <div class="sp-field">
                    <label>Agent</label>
                    <ng-container *ngIf="threadSettingsUseNative; else spAgentDesktop">
                      <select class="sp-native-select"
                        [ngModel]="ai.currentThread()?.agentId || 'general'"
                        (ngModelChange)="updateThreadAgent($event)">
                        <option value="general">Assistant général</option>
                        <optgroup *ngIf="systemAgents.length" label="Agents système">
                          <ng-container *ngFor="let a of systemAgents">
                            <option *ngIf="a.id !== 'general'" [value]="a.id">{{ a.name }}</option>
                          </ng-container>
                        </optgroup>
                        <optgroup *ngIf="customAgents.length" label="Agents personnalisés">
                          <option *ngFor="let a of customAgents" [value]="a.id">{{ a.name }}</option>
                        </optgroup>
                      </select>
                    </ng-container>
                    <ng-template #spAgentDesktop>
                      <nz-select class="sp-zorro-select" nzSize="small" style="width:100%"
                        nzShowSearch
                        nzDropdownClassName="thread-settings-select-dropdown"
                        [ngModel]="ai.currentThread()?.agentId || 'general'"
                        (ngModelChange)="updateThreadAgent($event)">
                        <nz-option nzValue="general" nzLabel="Assistant général"></nz-option>
                        <nz-option-group *ngIf="systemAgents.length" nzLabel="Agents système">
                          <ng-container *ngFor="let a of systemAgents">
                            <nz-option *ngIf="a.id !== 'general'" [nzValue]="a.id" [nzLabel]="a.name"></nz-option>
                          </ng-container>
                        </nz-option-group>
                        <nz-option-group *ngIf="customAgents.length" nzLabel="Agents personnalisés">
                          <nz-option *ngFor="let a of customAgents" [nzValue]="a.id" [nzLabel]="a.name"></nz-option>
                        </nz-option-group>
                      </nz-select>
                    </ng-template>
                  </div>
                  <div class="sp-field">
                    <label>Mode</label>
                    <ng-container *ngIf="threadSettingsUseNative; else spModeDesktop">
                      <select class="sp-native-select"
                        [ngModel]="ai.currentThread()?.mode"
                        (ngModelChange)="updateThreadMode($event)">
                        <option value="chat">Chat (libre)</option>
                        <option value="workflow">Workflow (lié au flow)</option>
                        <option value="form">Formulaire (lié au form)</option>
                      </select>
                    </ng-container>
                    <ng-template #spModeDesktop>
                      <nz-select class="sp-zorro-select" nzSize="small" style="width:100%"
                        nzDropdownClassName="thread-settings-select-dropdown"
                        [ngModel]="ai.currentThread()?.mode"
                        (ngModelChange)="updateThreadMode($event)">
                        <nz-option nzValue="chat" nzLabel="Chat (libre)"></nz-option>
                        <nz-option nzValue="workflow" nzLabel="Workflow (lié au flow)"></nz-option>
                        <nz-option nzValue="form" nzLabel="Formulaire (lié au form)"></nz-option>
                      </nz-select>
                    </ng-template>
                  </div>
                  <div class="sp-field">
                    <label>Autonomie</label>
                    <ng-container *ngIf="threadSettingsUseNative; else spAutonomyDesktop">
                      <select class="sp-native-select"
                        [ngModel]="ai.currentThread()?.metadata?.autonomyLevel || 'autonomous'"
                        (ngModelChange)="updateThreadAutonomy($event)">
                        <option value="prudent">Prudent (confirme les écritures)</option>
                        <option value="balanced">Équilibré (confirme les actions sensibles)</option>
                        <option value="autonomous">Autonome (agit directement)</option>
                      </select>
                    </ng-container>
                    <ng-template #spAutonomyDesktop>
                      <nz-select class="sp-zorro-select" nzSize="small" style="width:100%"
                        nzDropdownClassName="thread-settings-select-dropdown"
                        [ngModel]="ai.currentThread()?.metadata?.autonomyLevel || 'autonomous'"
                        (ngModelChange)="updateThreadAutonomy($event)">
                        <nz-option nzValue="prudent" nzLabel="Prudent (confirme les écritures)"></nz-option>
                        <nz-option nzValue="balanced" nzLabel="Équilibré (confirme les actions sensibles)"></nz-option>
                        <nz-option nzValue="autonomous" nzLabel="Autonome (agit directement)"></nz-option>
                      </nz-select>
                    </ng-template>
                  </div>
                  <div class="sp-divider"></div>
                  <div class="sp-field">
                    <label>Élément lié</label>
                    <div class="sp-link" *ngIf="ai.currentThread()?.flowId || ai.currentThread()?.metadata?.formId">
                      <a class="sp-link-text" (click)="openLinkedElement()">
                        <span nz-icon nzType="link" nzTheme="outline"></span>
                        {{ linkedElementLabel() || 'Élément lié' }}
                      </a>
                      <button nz-button nzType="text" nzSize="small" nzDanger (click)="unlinkElement()" nz-tooltip nzTooltipTitle="Dissocier">
                        <span nz-icon nzType="disconnect" nzTheme="outline"></span>
                      </button>
                    </div>
                    <div class="sp-no-link" *ngIf="!ai.currentThread()?.flowId && !ai.currentThread()?.metadata?.formId">
                      <span class="sp-no-link-text">Aucun</span>
                      <ng-container *ngIf="threadSettingsUseNative; else spFlowDesktop">
                        <select class="sp-native-select sp-no-link-select"
                          (ngModelChange)="linkToFlow($event)"
                          [ngModel]="''">
                          <option value="" disabled>Lier un workflow...</option>
                          <option *ngFor="let f of recentFlows" [value]="f.id">Workflow: {{ f.name }}</option>
                        </select>
                      </ng-container>
                      <ng-template #spFlowDesktop>
                        <nz-select class="sp-zorro-select sp-zorro-link-select" nzSize="small"
                          nzPlaceHolder="Lier un workflow..."
                          nzShowSearch
                          nzAllowClear
                          nzDropdownClassName="thread-settings-select-dropdown"
                          style="width:100%;margin-top:4px"
                          (ngModelChange)="linkToFlow($event)"
                          [ngModel]="null">
                          <nz-option *ngFor="let f of recentFlows" [nzValue]="f.id" [nzLabel]="'Workflow: ' + f.name"></nz-option>
                        </nz-select>
                      </ng-template>
                    </div>
                  </div>
                </div>
              </ng-template>
            </div>
            <div class="fp-chat-wrap">
              <ai-chat #threadChat class="fp-chat"></ai-chat>
              <div class="fp-chat-empty-overlay" *ngIf="ai.messages().length === 0 && !ai.streaming() && !ai.pendingQuestion()">
                <ng-container [ngTemplateOutlet]="assistantHeroInput"></ng-container>
              </div>
            </div>
          </ng-container>
        </ng-container>
      </div>

      <!-- V2: Canvas panel (desktop split) — animation width + slide out quand fermé -->
      <div class="fp-canvas"
           *ngIf="!isMobileSidebar() && ai.currentThread()"
           [class.collapsed]="!ai.canvasOpen()">
        <ai-canvas-panel [threadId]="currentThreadId()"></ai-canvas-panel>
      </div>

      <!-- V2: Canvas drawer (mobile) — body padding retiré pour maximiser l'espace du panel -->
      <nz-drawer
        *ngIf="ai.canvasOpen() && isMobileSidebar() && ai.currentThread()"
        [nzVisible]="ai.canvasOpen()"
        nzPlacement="right"
        [nzClosable]="true"
        [nzTitle]="'Canvas'"
        [nzWidth]="'100%'"
        [nzBodyStyle]="{ padding: '0' }"
        nzWrapClassName="canvas-drawer-wrap"
        (nzOnClose)="ai.closeCanvas()">
        <ng-container *nzDrawerContent>
          <ai-canvas-panel [threadId]="currentThreadId()"></ai-canvas-panel>
        </ng-container>
      </nz-drawer>

      <!-- V2: Project picker modal -->
      <nz-drawer
        *ngIf="showProjectPicker"
        [nzVisible]="showProjectPicker"
        nzTitle="Nouveau projet"
        [nzWidth]="720"
        nzPlacement="right"
        (nzOnClose)="closeProjectPicker()">
        <ng-container *nzDrawerContent>
          <ai-project-root-picker (close)="closeProjectPicker()" (created)="onProjectCreated($event)"></ai-project-root-picker>
        </ng-container>
      </nz-drawer>

      <!-- V2: Share dialog -->
      <nz-drawer
        *ngIf="showShareDialog && shareThread"
        [nzVisible]="showShareDialog"
        nzTitle="Partager la conversation"
        [nzWidth]="520"
        nzPlacement="right"
        (nzOnClose)="closeShareDialog()">
        <ng-container *nzDrawerContent>
          <ai-thread-share-dialog [thread]="shareThread!" (close)="closeShareDialog()"></ai-thread-share-dialog>
        </ng-container>
      </nz-drawer>

      <!-- Window Manager : host global pour les fenêtres flottantes (subagents, etc.) -->
      <ai-window-host></ai-window-host>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .fp-layout { display: flex; height: 100%; background: #f8f8f8; position: relative; }

    /* ── Sidebar ── */
    .fp-sidebar { width: 300px; display: flex; flex-direction: column; flex-shrink: 0; background: linear-gradient(130deg, #f8f8f8, #ffffff); transition: width 0.24s cubic-bezier(0.22, 1, 0.36, 1); overflow: hidden; }
    .fp-sidebar.collapsed { width: 48px; }
    .sidebar-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin-top: 8px; flex-shrink: 0; }
    .sidebar-panel-body { display: flex; flex: 1 1 auto; min-height: 0; flex-direction: column; }
    .sidebar-title { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1a1a1a; }
    .sidebar-toggle-btn { margin-left: auto; }
    .fp-sidebar.collapsed .sidebar-header { justify-content: center; padding: 12px 0; }
    .fp-sidebar.collapsed .sidebar-toggle-btn { margin-left: 0; }
    .sidebar-toggle-btn, .chat-action-btn {
      border-radius: 10px; border: none; transition: all .12s;
    }
    .sidebar-toggle-btn:hover:not(:disabled), .chat-action-btn:hover:not(:disabled) {
      background: #fdf2f8 !important; color: #e61982 !important;
    }
    .sidebar-agent { padding: 8px 12px 0; }
    :host ::ng-deep .sidebar-agent-select .ant-select-selector:hover { border-color: #e61982 !important; }
    :host ::ng-deep .sidebar-agent-select .ant-select-focused .ant-select-selector,
    :host ::ng-deep .sidebar-agent-select .ant-select-open .ant-select-selector,
    :host ::ng-deep .sidebar-agent-select .ant-select.ant-select-focused:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector {
      border-color: #e61982 !important; box-shadow: 0 0 0 2px rgba(230,25,130,0.1) !important;
    }
    .sidebar-new { padding: 8px 12px; }
    .sidebar-threads { flex: 1; overflow-y: auto; padding: 4px 8px; scrollbar-width: none; }
    .sidebar-threads::-webkit-scrollbar { display: none; }
    .threads-loading, .threads-loading-more { display: flex; align-items: center; justify-content: center; gap: 8px; color: #8b8b8b; font-size: 12px; }
    .threads-loading { min-height: 120px; }
    .threads-loading-more { padding: 12px 0; }
    .sidebar-bottom { padding: 8px 12px; margin-top: auto; }
    .fp-sidebar.collapsed .sidebar-bottom { padding: 8px 0 22px; display: flex; justify-content: center; }

    .thread-item { padding: 10px 12px; border-radius: 10px; cursor: pointer; margin-bottom: 2px; position: relative; transition: background .1s; }
    .thread-item:hover { background: #e8e8e8; }
    .thread-item.active { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .thread-title { font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 28px; color: #1a1a1a; }
    .thread-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: 11px; color: #b0b0b0; }
    .thread-delete { position: absolute; top: 8px; right: 4px; opacity: 0; transition: opacity 0.12s; }
    .thread-item:hover .thread-delete { opacity: 1; }
    .thread-date { margin-left: auto; }
    .thread-agent { color: #e61982; }

    .mode-tag { padding: 1px 6px; border-radius: 6px; font-size: 10px; text-transform: uppercase; font-weight: 600; }
    .mode-chat { background: #f5f5f5; color: #8b8b8b; }
    .mode-workflow { background: #fdf2f8; color: #e61982; }
    .mode-node_args { background: #fff7e6; color: #d48806; }
    .mode-form { background: #f6ffed; color: #389e0d; }

    .agent-opt { display: flex; align-items: center; gap: 6px; }
    .agent-opt-icon { width: 16px; height: 16px; border-radius: 4px; object-fit: contain; }
    .agent-opt-nz { font-size: 14px; color: #e61982; }
    .agent-opt-nz.custom { color: #722ed1; }

    .empty-threads { padding: 30px 10px; }
    .active-btn { color: #e61982 !important; }
    .new-thread-btn.ant-btn-primary, .new-thread-btn.ant-btn-primary:not(:disabled) {
      background: #e61982; border-color: #e61982; color: #fff; height: auto; padding: 5px 0; border-radius: 10px;
    }
    .new-thread-btn.ant-btn-primary:hover { background: #d0167a; border-color: #d0167a; }
    .new-thread-btn.ant-btn-primary:active { background: #b01266; border-color: #b01266; }

    /* ── Main ── */
    .fp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative; background: #f8f8f8; border-radius: 18px 0 0 18px; }
    /* Panel canvas droit : animation de slide inspirée du flow-builder right-panel.
       - Container : width 480 ↔ 0 + opacity, transition 220ms
       - Contenu interne : width fixe 480 + translateX(100%) quand fermé → slide out
       Pointer-events coupés quand fermé pour ne pas intercepter clics. */
    .fp-canvas {
      width: 480px; min-width: 480px; max-width: 50vw;
      flex-shrink: 0;
      border-left: 1px solid #e5e5e5;
      background: #fff;
      display: flex; flex-direction: column;
      overflow: hidden;
      transition: width 220ms ease, min-width 220ms ease, opacity 220ms ease;
      will-change: width, opacity;
    }
    .fp-canvas.collapsed {
      width: 0; min-width: 0; opacity: 0; border-left-width: 0;
      pointer-events: none;
    }
    .fp-canvas > * {
      width: 480px; min-width: 480px;
      flex-shrink: 0;
      transition: transform 220ms ease;
    }
    .fp-canvas.collapsed > * { transform: translateX(100%); }
    .fp-layout.canvas-collapsed .fp-canvas { width: 0; }
    .sidebar-new-v2 { display: flex; gap: 6px; align-items: center; }
    .sidebar-new-v2 .new-thread-btn { flex: 1; }
    .sidebar-new-v2 .new-project-btn { flex-shrink: 0; }
    @media (max-width: 1023px) { .fp-canvas { display: none; } }
    .threads-group-title { font-size: 11px; font-weight: 600; color: #999; padding: 8px 12px 4px; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
    .thread-share { position: absolute; right: 30px; top: 8px; opacity: 0; transition: opacity .15s; }
    .thread-item:hover .thread-share { opacity: 1; }
    .thread-item-shared { display: flex; gap: 6px; align-items: flex-start; background: #fcfaff; }
    .thread-item-shared .shared-owner-avatar { flex-shrink: 0; margin-top: 2px; background: #f0e6ff !important; color: #722ed1 !important; }
    .thread-item-shared .thread-item-body { flex: 1; min-width: 0; }
    .shared-badge { font-size: 11px; color: #722ed1; margin-left: 4px; }
    .mobile-sidebar-open-btn { display: none; }
    .mobile-sidebar-backdrop { display: none; }
    .fp-empty { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 20px; }
    .fp-chat-wrap { position: relative; flex: 1; min-height: 0; min-width: 0; display: flex; overflow: hidden; }
    .fp-chat-empty-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 0 20px; background: #f8f8f8; z-index: 2; }

    /* ── AI Hero ── */
    .assistant-view { width: min(100%, 920px); margin: 0 auto; }
    .assistant-floating { position: relative; min-height: clamp(340px, 60vh, 560px); display: flex; align-items: center; justify-content: center; }
    .ai-floating-content { position: relative; z-index: 1; width: min(100%, 760px); align-items: center; text-align: center; }
    .ai-content { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 10px; }
    .ai-main { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 0; justify-content: flex-start; }
    .ai-main > .ai-header { margin-bottom: 10px; }
    .ai-main.has-center-files { transform: translateY(-10px); }
    .ai-floating-content .ai-main { flex: 0 0 auto; width: 100%; }
    .ai-header { display: flex; align-items: center; gap: 10px; }
    .ai-header-center { display: grid; grid-template-columns: 36px auto 36px; align-items: center; justify-content: center; column-gap: 10px; }
    .ai-header-center::after { content: ''; width: 36px; height: 36px; }
    .ai-header-copy { text-align: center; }
    .ai-icon-wrap { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #e61982, #d0167a); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; flex-shrink: 0; }
    .ai-title { font-weight: 700; font-size: 14px; color: #1a1a1a; }
    .ai-subtitle { font-size: 11px; color: #8b8b8b; }

    /* ── AI Input ── */
    .ai-input-row { display: flex; gap: 0; width: 100%; }
    .ai-input-shell { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: none; border-radius: 22px; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: box-shadow 0.15s; }
    .ai-input-shell:focus-within { box-shadow: 0 0 0 2px rgba(230,25,130,0.15), 0 4px 16px rgba(0,0,0,0.06); }
    .ai-mic-btn { align-self: center; flex-shrink: 0; }
    .ai-attach-btn { align-self: center; flex-shrink: 0; }
    .ai-attach-btn.has-files { color: #e61982 !important; }
    .ai-input-shell .ai-send-btn.ant-btn-primary { background: #e61982; border-color: #e61982; color: #fff; align-self: center; flex-shrink: 0; }
    .ai-input-shell.ai-input-shell-multiline { align-items: flex-end; }
    .ai-input-shell.ai-input-shell-multiline .ai-mic-btn,
    .ai-input-shell.ai-input-shell-multiline .ai-attach-btn,
    .ai-input-shell.ai-input-shell-multiline .ai-send-btn.ant-btn-primary { align-self: flex-end; }
    .ai-input-shell .ai-send-btn.ant-btn-primary:hover { background: #d0167a; border-color: #d0167a; }
    .ai-input-shell .ai-send-btn.ant-btn-primary:active { background: #b01266; border-color: #b01266; }
    .ai-input-shell .ai-send-btn.ant-btn-primary[disabled] { background: #f9a8d4; border-color: #f9a8d4; color: #fff; }
    .ai-input { flex: 1 1 auto; min-width: 0; min-height: 30px; border: 0 !important; box-shadow: none !important; resize: none; background: transparent; font-size: 13px !important; line-height: 1.4; padding: 6px 4px; overflow-y: auto; }
    .ai-input:focus { outline: none; }

    /* ── Attachments ── */
    .att-previews { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 8px; width: 100%; }
    .att-chip { display: inline-flex; align-items: center; gap: 4px; background: #fff; border-radius: 8px; padding: 3px 8px; font-size: 12px; max-width: 260px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .att-chip.att-uploading { opacity: 0.7; }
    .att-chip.att-error { box-shadow: 0 0 0 1px #ff4d4f; background: #fff2f0; }
    .att-thumb { width: 28px; height: 28px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    .att-icon { font-size: 16px; color: #b0b0b0; flex-shrink: 0; }
    .att-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; color: #1a1a1a; }
    .att-size { color: #b0b0b0; font-size: 10px; flex-shrink: 0; }
    .att-loading { font-size: 12px; color: #e61982; flex-shrink: 0; }
    .att-warn { font-size: 12px; color: #ff4d4f; flex-shrink: 0; }
    .att-remove { padding: 0 !important; min-width: auto !important; height: auto !important; color: #b0b0b0 !important; font-size: 10px !important; }
    .att-remove:hover { color: #ef4444 !important; }

    .mic-recording { color: #ef4444 !important; animation: mic-pulse 1s infinite; }
    @keyframes mic-pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
    .ai-recording-bar { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #ef4444; margin-top: 10px; }
    .rec-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; animation: mic-pulse 1s infinite; }
    .ai-transcribing { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #8b8b8b; justify-content: center; margin-top: 10px; }

    /* ── Hints ── */
    .ai-hints { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .ai-hint {
      cursor: pointer; font-size: 11px; border-radius: 8px;
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
      background: #fff; border: none; color: #8b8b8b; margin: 0 !important;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      transition: all .12s;
    }
    .ai-hint i { font-size: 10px; }
    .ai-hint:hover { background: #fdf2f8; color: #e61982; box-shadow: 0 4px 14px rgba(230,25,130,0.1); transform: translateY(-1px); }
    .ai-hint:hover i { color: #e61982; }
    .ai-hint:active { transform: translateY(0.5px); }

    /* ── Mobile top bar (when no thread open) ── */
    .fp-mobile-top-bar { display: none; }

    /* ── Chat header ── */
    .fp-chat-header { display: flex; align-items: center; gap: 8px; padding: 12px 20px; flex-shrink: 0; background: #fff; border-radius: 14px; margin: 8px 12px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .chat-title { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1a1a1a; }
    .chat-badges { display: flex; gap: 6px; align-items: center; }
    .agent-badge { font-size: 11px; color: #e61982; background: #fdf2f8; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
    .linked-link { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #e61982; cursor: pointer; padding: 2px 6px; border-radius: 6px; text-decoration: none; white-space: nowrap; }
    .linked-link:hover { background: #fdf2f8; }
    .chat-actions { margin-left: auto; display: flex; gap: 2px; align-items: center; }
    .presence-badges { display: inline-flex; align-items: center; margin-right: 8px; }
    .presence-avatar {
      width: 24px; height: 24px; border-radius: 50%;
      color: #fff; font-size: 10px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; margin-left: -6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      position: relative;
    }
    .presence-avatar::after {
      content: ''; position: absolute; bottom: -1px; right: -1px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #52c41a; border: 1.5px solid #fff;
    }
    .presence-more {
      width: 24px; height: 24px; border-radius: 50%;
      background: #f0f0f0; color: #595959; font-size: 10px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; margin-left: -6px;
    }
    .context-gauge { font-size: 11px; font-weight: 600; min-width: 42px; padding: 0 8px !important; border-radius: 10px !important; color: #52c41a; background: rgba(82,196,26,0.08); }
    .context-gauge:hover { background: rgba(82,196,26,0.16) !important; }
    .context-gauge.gauge-warn { color: #faad14; background: rgba(250,173,20,0.1); }
    .context-gauge.gauge-warn:hover { background: rgba(250,173,20,0.18) !important; }
    .context-gauge.gauge-alert { color: #ff4d4f; background: rgba(255,77,79,0.1); animation: gauge-pulse 1.5s ease-in-out infinite; }
    @keyframes gauge-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
    :host ::ng-deep .chat-action-tooltip .ant-tooltip-inner { font-size: 10px; line-height: 1.15; padding: 4px 6px; }

    /* ── Settings popover ── */
    ::ng-deep .thread-settings-popover { border-radius: 18px !important; }
    .settings-popover { width: 280px; animation: settingsPopoverIn 180ms cubic-bezier(0.16, 1, 0.3, 1); }
    .sp-field { margin-bottom: 10px; animation: settingsFieldIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both; }
    .sp-field:nth-child(1) { animation-delay: 16ms; } .sp-field:nth-child(2) { animation-delay: 28ms; }
    .sp-field:nth-child(3) { animation-delay: 40ms; } .sp-field:nth-child(4) { animation-delay: 52ms; }
    .sp-field:nth-child(5) { animation-delay: 64ms; } .sp-field:last-child { margin-bottom: 0; }
    .sp-field label { display: block; font-size: 10px; color: #b0b0b0; margin-bottom: 3px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
    .sp-native-select {
      width: 100%; height: 32px; border: none; border-radius: 10px; padding: 0 30px 0 10px;
      font-size: 12px; font-weight: 500; background: #f8f8f8; color: #1a1a1a;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04); outline: none;
      appearance: none; -webkit-appearance: none;
      background-image: linear-gradient(45deg, transparent 50%, #b0b0b0 50%), linear-gradient(135deg, #b0b0b0 50%, transparent 50%);
      background-position: calc(100% - 13px) calc(50% - 2px), calc(100% - 8px) calc(50% - 2px);
      background-size: 5px 5px, 5px 5px; background-repeat: no-repeat;
      transition: all .15s;
    }
    .sp-native-select:hover { box-shadow: 0 0 0 2px rgba(230,25,130,0.08); }
    .sp-native-select:focus { box-shadow: 0 0 0 2px rgba(230,25,130,0.15); }
    .sp-native-select:active { transform: translateY(1px); }
    .sp-native-select option { font-size: 12px; font-weight: 500; color: #1a1a1a; background: #fff; }
    .sp-native-select option:checked { color: #e61982; background: #fdf2f8; }
    .sp-native-select optgroup { font-size: 11px; font-weight: 700; color: #8b8b8b; background: #f8f8f8; }
    ::ng-deep .thread-settings-popover .settings-popover .ant-input { transition: all .15s; border-radius: 10px; }
    ::ng-deep .thread-settings-popover .settings-popover .ant-input:hover { border-color: #e61982 !important; }
    ::ng-deep .thread-settings-popover .settings-popover .ant-input:focus,
    ::ng-deep .thread-settings-popover .settings-popover .ant-input-focused { border-color: #e61982 !important; box-shadow: 0 0 0 2px rgba(230,25,130,0.1) !important; }
    ::ng-deep .thread-settings-popover .settings-popover .sp-zorro-select .ant-select-selector {
      height: 32px !important; border: none !important; border-radius: 10px !important; padding: 0 10px !important;
      background: #f8f8f8 !important; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all .15s !important;
    }
    ::ng-deep .thread-settings-popover .settings-popover .sp-zorro-select .ant-select-selection-item,
    ::ng-deep .thread-settings-popover .settings-popover .sp-zorro-select .ant-select-selection-placeholder { line-height: 30px !important; font-size: 12px !important; font-weight: 500; }
    ::ng-deep .thread-settings-popover .settings-popover .sp-zorro-select:not(.ant-select-disabled):hover .ant-select-selector { box-shadow: 0 0 0 2px rgba(230,25,130,0.08) !important; }
    ::ng-deep .thread-settings-popover .settings-popover .sp-zorro-select.ant-select-focused .ant-select-selector,
    ::ng-deep .thread-settings-popover .settings-popover .sp-zorro-select.ant-select-open .ant-select-selector { box-shadow: 0 0 0 2px rgba(230,25,130,0.15) !important; }
    :host ::ng-deep .fp-main .ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover { border-color: #e61982 !important; }
    :host ::ng-deep .fp-main .ant-input-affix-wrapper-focused,
    :host ::ng-deep .fp-main .ant-input-affix-wrapper:focus-within { border-color: #e61982 !important; box-shadow: 0 0 0 2px rgba(230,25,130,0.1) !important; }
    ::ng-deep .thread-settings-select-dropdown.ant-select-dropdown {
      border-radius: 14px; padding: 6px; box-shadow: 0 12px 40px rgba(0,0,0,0.1); background: #fff;
    }
    ::ng-deep .thread-settings-select-dropdown .ant-select-item-group { color: #b0b0b0; font-size: 10px; font-weight: 700; padding: 6px 8px; text-transform: uppercase; }
    ::ng-deep .thread-settings-select-dropdown .ant-select-item-option { border-radius: 8px; min-height: 30px; padding: 6px 10px; font-size: 12px; font-weight: 500; }
    ::ng-deep .thread-settings-select-dropdown .ant-select-item-option-active:not(.ant-select-item-option-disabled) { background: #fdf2f8; }
    ::ng-deep .thread-settings-select-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled) { background: #fdf2f8; color: #e61982; font-weight: 600; }
    ::ng-deep .thread-settings-select-dropdown .ant-select-item-option-grouped { padding-left: 16px; }
    .sp-no-link-select { margin-top: 4px; }
    .sp-divider { border-top: 1px solid #f0f0f0; margin: 8px 0; }
    .sp-link { display: flex; align-items: center; gap: 4px; }
    .sp-link-text { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #e61982; cursor: pointer; }
    .sp-link-text:hover { text-decoration: underline; }
    .sp-no-link-text { font-size: 12px; color: #b0b0b0; }
    @keyframes settingsPopoverIn { from { opacity:0; transform: translateY(-6px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
    @keyframes settingsFieldIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
    .fp-chat { flex: 1; min-height: 0; min-width: 0; overflow: hidden; }
    .fp-settings { flex: 1; overflow-y: auto; }

    /* ── Responsive ── */
    @media (max-width: 1023px) {
      .fp-layout { overflow: hidden; --mobile-sidebar-width: min(280px, 85vw); }
      .fp-sidebar {
        position: absolute; top: 0; left: 0; z-index: 10;
        width: var(--mobile-sidebar-width); height: 100%;
        box-shadow: 0 12px 40px rgba(0,0,0,0.1);
        transform: translate3d(0, 0, 0);
        transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.24s ease;
        will-change: transform;
      }
      .fp-sidebar, .fp-sidebar.collapsed { width: var(--mobile-sidebar-width); }
      .fp-sidebar.collapsed { transform: translate3d(calc(-100% - 8px), 0, 0); box-shadow: none; pointer-events: none; }
      .sidebar-header { margin-top: 0; }
      .fp-sidebar.collapsed .sidebar-header { justify-content: flex-start; padding: 12px 16px; }
      .fp-sidebar.collapsed .sidebar-toggle-btn { margin-left: auto; }
      .fp-sidebar.collapsed .sidebar-bottom { padding: 8px 12px; display: block; }
      .fp-sidebar:not(.collapsed) { pointer-events: auto; }
      .fp-sidebar .sidebar-header, .fp-sidebar .sidebar-panel-body, .fp-sidebar .sidebar-bottom,
      .fp-sidebar.collapsed .sidebar-header, .fp-sidebar.collapsed .sidebar-panel-body, .fp-sidebar.collapsed .sidebar-bottom {
        opacity: 1; transform: none; transition: none;
      }
      .fp-main {
        flex: 0 0 100%; width: 100%; min-width: 100%; max-width: 100%; z-index: 1;
        background: #f8f8f8; border-radius: 0;
        transform: translate3d(0, 0, 0);
        transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.24s ease;
        will-change: transform; touch-action: pan-y;
      }
      .fp-layout.mobile-sidebar-open .fp-main { transform: translate3d(var(--mobile-sidebar-width), 0, 0); box-shadow: -18px 0 42px rgba(0,0,0,0.1); }
      .fp-layout.mobile-sidebar-animating { touch-action: none; }
      .fp-layout.mobile-sidebar-animating .fp-main, .fp-layout.mobile-sidebar-animating .fp-sidebar,
      .fp-layout.mobile-sidebar-animating .mobile-sidebar-backdrop, .fp-layout.mobile-sidebar-animating .mobile-sidebar-open-btn { pointer-events: none; }
      .mobile-sidebar-backdrop {
        display: block; position: absolute; inset: 0; z-index: 9;
        background: rgba(0,0,0,0.12); opacity: 0; visibility: hidden; pointer-events: none;
        transition: opacity 0.24s ease, visibility 0s linear 0.24s;
      }
      .mobile-sidebar-backdrop.visible { opacity: 1; visibility: visible; pointer-events: auto; transition-delay: 0s; }
      .fp-main.sidebar-collapsed .fp-chat-header { padding: 10px 12px; }
      .fp-mobile-top-bar {
        display: flex; padding: 8px 12px; flex-shrink: 0;
      }
      .mobile-sidebar-open-btn {
        display: inline-flex; position: static; z-index: 11;
        opacity: 0; pointer-events: none;
        transition: opacity 0.18s ease;
        flex-shrink: 0;
      }
      .mobile-sidebar-open-btn.visible { opacity: 1; pointer-events: auto; }
      .fp-chat-header { margin: 0; border-radius: 0; padding: 10px 12px; gap: 8px; }
      .assistant-floating { min-height: clamp(300px, 66vh, 460px); }
      .fp-chat-header { margin: 4px 8px 0; border-radius: 12px; }
    }
  `]
})
export class AiFullpageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('aiInputEl') private aiInputElRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('threadChat') private threadChatRef?: AiChatComponent;
  @ViewChild('threadsScroll') private threadsScrollRef?: ElementRef<HTMLElement>;

  threads: AiThread[] = [];
  threadsLoading = false;
  threadsLoadingMore = false;
  systemAgents: AiAvailableAgent[] = [];
  customAgents: AiAvailableAgent[] = [];
  allAgents: AiAvailableAgent[] = [];
  selectedAgentId = 'general';
  aiInput = '';
  aiInputPlaceholder = '';
  aiInputMultiline = false;
  centerPendingAttachments: AiAttachment[] = [];
  maxCenterFiles = AI_MAX_FILES;
  threadSettingsUseNative = false;
  sidebarAgentUseNative = false;
  sidebarCollapsed = false;
  mobileSidebarAnimating = false;
  showSettings = false;
  regeneratingTitle = false;
  recentFlows: { id: string; name: string }[] = [];

  private refreshInterval?: any;
  private titleDebounce?: any;
  private readonly threadsPageSize = 20;
  private threadsPage = 0;
  private threadsHasMore = false;
  private threadsLoadTicket = 0;
  private aiInputLayoutRaf: number | null = null;
  private sidebarTouchStartX: number | null = null;
  private sidebarTouchStartY: number | null = null;
  private sidebarSwipeHandled = false;
  private mainTouchStartX: number | null = null;
  private mainTouchStartY: number | null = null;
  private mainSwipeHandled = false;
  private mobileSidebarAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly mobileSidebarAnimationDurationMs = 340;
  private _lastLoadedCanvasThreadId: string | null = null;
  private readonly sidebarSwipeOpenThreshold = 64;
  private readonly sidebarSwipeCloseThreshold = 56;
  private readonly sidebarSwipeMaxVerticalDelta = 44;

  // Sync URL /ai/:threadId au changement de thread — déclaré ici car effect()
  // doit être appelé en injection context (constructor).
  private _lastUrlTid: string | null = null;
  private _lastPresenceIds: Set<string> = new Set();

  constructor(public ai: AiService, public audioService: AiAudioService, private cdr: ChangeDetectorRef, private router: Router, private route: ActivatedRoute, private nzMsg: NzMessageService, private apiClient: ApiClientService, private acl: AccessControlService) {
    // Notif toast quand un user rejoint la conversation partagée.
    effect(() => {
      const list = this.ai.presence() || [];
      const currentIds = new Set(list.map(p => p.userId));
      if (this._lastPresenceIds.size > 0) {
        for (const p of list) {
          if (!this._lastPresenceIds.has(p.userId)) {
            this.nzMsg.info(`👋 ${p.name || 'Un collaborateur'} a rejoint la conversation`, { nzDuration: 3000 });
          }
        }
      }
      this._lastPresenceIds = currentIds;
    });

    // Sync URL thread — effect local
    effect(() => {
      const t = this.ai.currentThread();
      const tid = t?.id || t?._id || null;
      if (tid === this._lastUrlTid) return;
      this._lastUrlTid = tid;
      const currentTid = this.route.snapshot.params['threadId'] || null;
      if (tid && tid !== currentTid) {
        this.router.navigate(['/ai', tid], { replaceUrl: !currentTid });
      } else if (!tid && currentTid) {
        this.router.navigate(['/ai'], { replaceUrl: true });
      }
    });

    // Charge le canvas une fois par thread (et uniquement si l'ID change)
    effect(() => {
      const cur = this.ai.currentThread();
      const tid = cur?._id || cur?.id;
      if (!tid || tid === this._lastLoadedCanvasThreadId) return;
      this._lastLoadedCanvasThreadId = tid;
      // Reset le flag "fermé par l'user" à chaque switch → la nouvelle thread
      // peut à nouveau ouvrir automatiquement selon ses règles.
      this._userClosedCanvas = false;
      this.ai.loadCanvas(tid);
      if (cur?.mode !== 'project' && !this.isMobileSidebar() && this.ai.canvasOpen()) {
        this.ai.closeCanvas();
      }
    });

    // Détecte une fermeture manuelle (via bouton X du panel ou toggle header)
    // et bloque l'auto-open jusqu'au prochain thread switch.
    effect(() => {
      const open = this.ai.canvasOpen();
      if (this._lastCanvasOpenSeen === true && open === false) {
        this._userClosedCanvas = true;
      } else if (open === true) {
        this._userClosedCanvas = false;
      }
      this._lastCanvasOpenSeen = open;
    });

    // Auto-open au refresh si le DERNIER message est un widget canvas.
    // Ajout canvas_html : bascule automatiquement sur l'onglet Artefacts.
    effect(() => {
      const msgs = this.ai.messages();
      const cur = this.ai.currentThread();
      if (!cur || !msgs || !msgs.length) return;
      if (cur.mode === 'project') return;
      if (this.isMobileSidebar()) return;
      if (this._userClosedCanvas) return;
      const last = msgs[msgs.length - 1];
      const kind = last?.metadata?.kind;
      const isCanvasWidget = ['structured', 'diagram', 'plan_proposal', 'canvas_html'].includes(kind as string);
      const state = this.ai.canvasState();
      const hasResearch = (state?.research?.steps?.length || 0) > 0;
      if ((isCanvasWidget || (hasResearch && last?.role === 'assistant')) && !this.ai.canvasOpen()) {
        this.ai.openCanvas();
        if (kind === 'canvas_html') this.ai.setCanvasTab('artifacts');
      }
    });

    // Ouverture auto selon mode / activité (respecte _userClosedCanvas).
    effect(() => {
      const cur = this.ai.currentThread();
      if (!cur) return;
      if (this.isMobileSidebar()) return;
      if (this._userClosedCanvas) return; // l'user a fermé explicitement
      const state = this.ai.canvasState();
      const hasActivity = !!(
        state?.tasks?.length ||
        state?.research?.steps?.length ||
        state?.document?.previewHtml
      );
      const shouldOpen = cur.mode === 'project' || hasActivity;
      if (shouldOpen && !this.ai.canvasOpen()) this.ai.openCanvas();
    });

    // V2 — Load preferences on mount
    this.ai.loadPreferences().catch(() => {});

    // Sync currentThread changes (title, mode, flowId) back to local threads list in real-time
    effect(() => {
      const cur = this.ai.currentThread();
      if (!cur) return;
      const idx = this.threads.findIndex(t => t._id === cur._id);
      if (idx >= 0) {
        const existing = this.threads[idx];
        if (existing.title !== cur.title || existing.mode !== cur.mode || existing.flowId !== cur.flowId) {
          this.threads = this.threads.map((t, i) => i === idx ? { ...t, title: cur.title, mode: cur.mode, flowId: cur.flowId, metadata: cur.metadata } : t);
          this.cdr.detectChanges();
        }
      } else if (cur._id) {
        // New thread created — add it to the top of the list
        this.threads = [cur, ...this.threads];
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit() {
    // Set page context
    this.ai.setPageContext({ page: 'other' });
    this.updateThreadSettingsSelectMode();
    this.updateSidebarAgentSelectMode();
    this.updateAiInputPlaceholder();
    if (this.shouldAutoCloseSidebarNav()) this.sidebarCollapsed = true;

    // Deep-link : lit le threadId de l'URL (/ai/:threadId) et ouvre directement
    // ou démarre une nouvelle conversation vide si absent.
    const initialThreadId = this.route.snapshot.params['threadId'] || null;
    if (initialThreadId) {
      this.ai.loadThread(initialThreadId).catch(() => {
        // ID invalide / accès refusé → fallback nouvelle conversation
        this.router.navigate(['/ai'], { replaceUrl: true });
        this.ai.currentThread.set(null);
        this.ai.messages.set([]);
      });
    } else {
      this.ai.currentThread.set(null);
      this.ai.messages.set([]);
      this.ai.pendingQuestion.set(null);
      this.ai.streaming.set(false);
    }

    // Subscribe aux query params pour réagir aux changements (ex: clic sur
    // l'icône ampoule d'un message → ?settings=knowledge&filter=pending).
    this.route.queryParamMap.subscribe(qp => {
      const wantSettings = qp.get('settings') === 'knowledge';
      if (wantSettings && !this.showSettings) {
        this.showSettings = true;
        this.cdr.detectChanges();
      }
      if (wantSettings) {
        setTimeout(() => this.ai.openKnowledgePending$.next(), 100);
      }
    });

    // Sync URL quand le thread change (signal effect-like via Subject)
    this._syncUrlOnThreadChange();

    // Load threads and agents
    this.loadThreads();
    this.loadAgents();

    // Load recent flows for link management
    this.loadRecentFlows();

    // Handle AI actions (open_element, open_credentials)
    this.ai.actionRequests$.subscribe(action => {
      if (action.action === 'open_element') {
        const a = action as any;
        switch (a.elementType) {
          case 'flow':
            this.router.navigate(['/flow-builder', 'editor'], { queryParams: { flow: a.elementId } });
            break;
          case 'form':
            this.router.navigate(['/dynamic-form'], { queryParams: { session: a.elementId } });
            break;
          case 'website':
            this.router.navigate(['/websites/editor'], { queryParams: { id: a.elementId } });
            break;
        }
      }
    });

    // Auto-refresh threads every 30s
    this.refreshInterval = setInterval(() => this.loadThreads(), 30000);
  }

  ngAfterViewInit() {
    this.scheduleAiInputLayoutRefresh();
    setTimeout(() => this.tryLoadMoreThreads(), 0);
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updateThreadSettingsSelectMode();
    this.updateSidebarAgentSelectMode();
    this.updateAiInputPlaceholder();
    this.scheduleAiInputLayoutRefresh();
    if (!this.isMobileSidebar()) this.resetMobileSidebarAnimationState();
  }

  onMainTouchStart(event: TouchEvent) {
    if (!this.shouldHandleMainSidebarSwipe()) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    this.mainTouchStartX = touch.clientX;
    this.mainTouchStartY = touch.clientY;
    this.mainSwipeHandled = false;
  }

  onMainTouchMove(event: TouchEvent) {
    if (!this.shouldHandleMainSidebarSwipe() || this.mainSwipeHandled) return;
    if (this.mainTouchStartX == null || this.mainTouchStartY == null) return;
    const touch = event.touches?.[0];
    if (!touch) return;

    const dx = touch.clientX - this.mainTouchStartX;
    const dy = touch.clientY - this.mainTouchStartY;
    const isMostlyHorizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dy) <= this.sidebarSwipeMaxVerticalDelta;
    const shouldOpenSidebar = this.shouldHandleMobileSidebarOpenSwipe() && dx >= this.sidebarSwipeOpenThreshold;
    const shouldCloseSidebar = this.shouldHandleMobileSidebarCloseSwipe() && dx <= -this.sidebarSwipeCloseThreshold;

    if (isMostlyHorizontal && shouldOpenSidebar) {
      this.mainSwipeHandled = true;
      this.openSidebarPanel();
      this.resetMainTouchTracking();
      try { event.preventDefault(); } catch {}
      this.cdr.detectChanges();
      return;
    }

    if (isMostlyHorizontal && shouldCloseSidebar) {
      this.mainSwipeHandled = true;
      this.closeSidebarPanel();
      this.resetMainTouchTracking();
      try { event.preventDefault(); } catch {}
      this.cdr.detectChanges();
    }
  }

  onMainTouchEnd() {
    this.resetMainTouchTracking();
  }

  onSidebarTouchStart(event: TouchEvent) {
    if (this.sidebarCollapsed || !this.shouldAutoCloseSidebarNav() || this.mobileSidebarAnimating) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    this.sidebarTouchStartX = touch.clientX;
    this.sidebarTouchStartY = touch.clientY;
    this.sidebarSwipeHandled = false;
  }

  onSidebarTouchMove(event: TouchEvent) {
    if (this.sidebarCollapsed || !this.shouldAutoCloseSidebarNav() || this.sidebarSwipeHandled || this.mobileSidebarAnimating) return;
    if (this.sidebarTouchStartX == null || this.sidebarTouchStartY == null) return;
    const touch = event.touches?.[0];
    if (!touch) return;

    const dx = touch.clientX - this.sidebarTouchStartX;
    const dy = touch.clientY - this.sidebarTouchStartY;
    const isLeftSwipe = dx <= -this.sidebarSwipeCloseThreshold;
    const isMostlyHorizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dy) <= this.sidebarSwipeMaxVerticalDelta;

    if (isLeftSwipe && isMostlyHorizontal) {
      this.closeSidebarPanel();
      this.sidebarSwipeHandled = true;
      this.resetSidebarTouchTracking();
      try { event.preventDefault(); } catch {}
      this.cdr.detectChanges();
    }
  }

  onSidebarTouchEnd() {
    this.resetSidebarTouchTracking();
  }

  private updateThreadSettingsSelectMode() {
    this.threadSettingsUseNative = false;
  }

  private updateSidebarAgentSelectMode() {
    this.sidebarAgentUseNative = false;
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.titleDebounce) clearTimeout(this.titleDebounce);
    if (this.mobileSidebarAnimationTimer) clearTimeout(this.mobileSidebarAnimationTimer);
    if (this.aiInputLayoutRaf != null) {
      cancelAnimationFrame(this.aiInputLayoutRaf);
      this.aiInputLayoutRaf = null;
    }
  }

  onThreadsScroll(event: Event) {
    this.tryLoadMoreThreads(event.target as HTMLElement | null);
  }

  loadThreads(append = false) {
    if (append && (this.threadsLoading || this.threadsLoadingMore || !this.threadsHasMore)) return;

    const ticket = ++this.threadsLoadTicket;
    const page = append ? (this.threadsPage + 1) : 1;

    if (append) {
      this.threadsLoadingMore = true;
    } else {
      this.threadsLoading = true;
      this.threadsLoadingMore = false;
      this.threadsPage = 0;
      this.threadsHasMore = false;
    }

    this.ai.listThreads({ page, limit: this.threadsPageSize }).subscribe({
      next: (res: any) => {
        if (ticket !== this.threadsLoadTicket) return;
        const items = (res?.data || res || []) as AiThread[];

        if (append) {
          const seen = new Set(this.threads.map(t => this.threadKey(t)));
          const merged = [...this.threads];
          for (const it of items) {
            const key = this.threadKey(it);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            merged.push(it);
          }
          this.threads = merged;
        } else {
          this.threads = items;
        }

        this.threadsPage = page;
        this.threadsHasMore = items.length === this.threadsPageSize;
        this.threadsLoading = false;
        this.threadsLoadingMore = false;
        this.cdr.detectChanges();
        setTimeout(() => this.tryLoadMoreThreads(), 0);
      },
      error: () => {
        if (ticket !== this.threadsLoadTicket) return;
        if (!append) this.threads = [];
        this.threadsHasMore = false;
        this.threadsLoading = false;
        this.threadsLoadingMore = false;
        this.cdr.detectChanges();
      },
    });
  }

  private tryLoadMoreThreads(container?: HTMLElement | null) {
    if (this.threadsLoading || this.threadsLoadingMore || !this.threadsHasMore) return;
    const el = container || this.threadsScrollRef?.nativeElement || null;
    if (!el) return;
    const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (remaining <= 140) this.loadThreads(true);
  }

  private threadKey(thread: Partial<AiThread> | null | undefined): string {
    return String(thread?._id || thread?.id || '');
  }

  loadAgents() {
    this.ai.loadAvailableAgents().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.allAgents = list;
        this.systemAgents = list.filter((a: AiAvailableAgent) => a.type === 'system');
        this.customAgents = list.filter((a: AiAvailableAgent) => a.type === 'custom');
        this.selectedAgentId = this.ai.selectedAgentId() || 'general';
        this.cdr.detectChanges();
      },
    });
  }

  onAgentChange(agentId: string) {
    this.ai.selectedAgentId.set(agentId);
  }

  toggleSidebarPanel() {
    if (this.sidebarCollapsed) {
      this.openSidebarPanel();
      return;
    }
    this.closeSidebarPanel();
  }

  openSidebarPanel() {
    if (!this.sidebarCollapsed) return;
    this.sidebarCollapsed = false;
    this.startMobileSidebarAnimation();
  }

  closeSidebarPanel() {
    if (this.sidebarCollapsed) return;
    this.sidebarCollapsed = true;
    this.startMobileSidebarAnimation();
  }

  toggleSettingsFromSidebar() {
    this.showSettings = !this.showSettings;
    this._syncUrlSettings();
    if (this.shouldAutoCloseSidebarNav()) this.closeSidebarPanel();
  }

  /** No-op : le sync URL se fait via un effect déclaré dans le constructor. */
  private _syncUrlOnThreadChange() { /* moved to constructor */ }

  /** Sync URL quand settings overlay ouvre/ferme. */
  private _syncUrlSettings() {
    const qp: any = this.showSettings ? { settings: 'knowledge' } : {};
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Ouvre la page paramètres sur l'onglet "Connaissances projet" avec filtre
   * "En attente". Déclenché par le badge pending dans le header chat.
   */
  openKnowledgePending() {
    this.showSettings = true;
    // Emit pour que le composant ai-settings sache quel tab + filtre activer
    this.ai.openKnowledgePending$.next();
    if (this.shouldAutoCloseSidebarNav()) this.closeSidebarPanel();
  }

  async newThread() {
    this.showSettings = false;
    this.clearCenterAttachments();
    await this.ai.createThread('chat', undefined, this.selectedAgentId);
    this.loadThreads();
    this.cdr.detectChanges();
  }

  // V2 — project picker
  showProjectPicker = false;
  openProjectPicker() { this.showProjectPicker = true; }
  closeProjectPicker() { this.showProjectPicker = false; }

  async onProjectCreated(evt: { threadId: string; root: any }) {
    this.showProjectPicker = false;
    await this.ai.loadThread(evt.threadId);
    this.ai.openCanvas();
    this.loadThreads();
    this.cdr.detectChanges();
  }

  // V2 — sharing
  showShareDialog = false;
  shareThread: AiThread | null = null;
  openShareDialog(thread: AiThread, ev?: Event) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    this.shareThread = thread;
    this.showShareDialog = true;
  }
  closeShareDialog() { this.showShareDialog = false; this.shareThread = null; }

  // V2 — canvas helpers
  currentThreadId(): string {
    const t = this.ai.currentThread();
    return t?._id || t?.id || '';
  }

  // V2 — thread grouping (mine vs shared with me)
  ownedThreads(): AiThread[] {
    return this.threads.filter(t => !t._shared);
  }

  sharedThreads(): AiThread[] {
    return this.threads.filter(t => t._shared);
  }

  async sendAiMessage() {
    const text = (this.aiInput || '').trim();
    if ((!text && !this.centerPendingAttachments.length) || this.ai.streaming()) return;

    const stillUploading = this.centerPendingAttachments.some(a => a.uploading);
    if (stillUploading) {
      this.nzMsg.warning('Uploads en cours, patiente...');
      return;
    }

    const withErrors = this.centerPendingAttachments.filter(a => a.error);
    if (withErrors.length) {
      this.nzMsg.warning('Certains fichiers ont échoué. Retire-les avant d\'envoyer.');
      return;
    }

    const centerAttachments = [...this.centerPendingAttachments];
    this.centerPendingAttachments = [];
    this.aiInput = '';
    this.showSettings = false;
    this.scheduleAiInputLayoutRefresh();

    if (!this.ai.currentThread()) {
      await this.ai.createThread('chat', undefined, this.selectedAgentId);
      this.loadThreads();
      this.cdr.detectChanges();
    }

    const chat = await this.waitForThreadChat();
    if (chat) {
      if (centerAttachments.length) chat.pendingAttachments = [...chat.pendingAttachments, ...centerAttachments];
      chat.inputText = text;
      if (text || chat.pendingAttachments.length) await chat.send();
    } else {
      // Fallback safety path if chat view is not mounted yet.
      await this.ai.quickSend(text, undefined, centerAttachments);
    }

    this.cdr.detectChanges();
  }

  sendHint(text: string) {
    this.aiInput = text;
    this.sendAiMessage();
  }

  private addCenterFiles(files: File[]) {
    const remaining = AI_MAX_FILES - this.centerPendingAttachments.length;
    if (remaining <= 0) {
      this.nzMsg.warning(`Maximum ${AI_MAX_FILES} fichiers par message`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    for (const file of toAdd) {
      if (file.size > AI_MAX_FILE_SIZE) {
        this.nzMsg.error(`"${file.name}" dépasse la limite de 20 Mo`);
        continue;
      }

      const att: AiAttachment = {
        fileId: '',
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploading: true,
        previewUrl: this.isImage(file.type) ? URL.createObjectURL(file) : undefined,
      };
      this.centerPendingAttachments = [...this.centerPendingAttachments, att];
      const idx = this.centerPendingAttachments.length - 1;

      this.ai.uploadFile(file).subscribe({
        next: (ref) => {
          this.centerPendingAttachments = this.centerPendingAttachments.map((a, i) =>
            i === idx ? { ...a, fileId: ref.fileId, uploading: false, error: undefined } : a
          );
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.centerPendingAttachments = this.centerPendingAttachments.map((a, i) =>
            i === idx ? { ...a, uploading: false, error: err?.message || 'Échec upload' } : a
          );
          this.cdr.detectChanges();
        },
      });
    }

    if (files.length > remaining) {
      this.nzMsg.warning(`Maximum ${AI_MAX_FILES} fichiers par message`);
    }

    this.cdr.detectChanges();
  }

  onCenterFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files?.length ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length) return;
    this.addCenterFiles(files);
  }

  removeCenterAttachment(index: number) {
    const att = this.centerPendingAttachments[index];
    if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
    this.centerPendingAttachments = this.centerPendingAttachments.filter((_, i) => i !== index);
    this.cdr.detectChanges();
  }

  onAiInputChanged() {
    this.scheduleAiInputLayoutRefresh();
  }

  onAiInputKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    if (event.isComposing) return;
    if (event.shiftKey) return;
    event.preventDefault();
    this.sendAiMessage();
  }

  async toggleMic() {
    if (this.audioService.recording()) {
      try {
        const blob = await this.audioService.stopAndGetBlob();
        this.audioService.transcribe(blob).subscribe({
          next: (text) => {
            if (text?.trim()) {
              this.aiInput = text.trim();
              this.scheduleAiInputLayoutRefresh();
              try { this.cdr.detectChanges(); } catch {}
            }
          },
          error: () => {},
        });
      } catch {}
    } else {
      try {
        await this.audioService.startRecording();
      } catch {}
    }
  }

  private scheduleAiInputLayoutRefresh() {
    if (this.aiInputLayoutRaf != null) {
      cancelAnimationFrame(this.aiInputLayoutRaf);
    }
    this.aiInputLayoutRaf = requestAnimationFrame(() => {
      this.aiInputLayoutRaf = null;
      this.refreshAiInputMultilineState();
    });
  }

  private async waitForThreadChat(maxTicks = 25): Promise<AiChatComponent | null> {
    for (let i = 0; i < maxTicks; i++) {
      if (this.threadChatRef) return this.threadChatRef;
      this.cdr.detectChanges();
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    return this.threadChatRef || null;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  isImage(mimeType: string): boolean {
    return mimeType?.startsWith('image/') || false;
  }

  private refreshAiInputMultilineState() {
    const el = this.aiInputElRef?.nativeElement;
    if (!el) {
      this.aiInputMultiline = false;
      return;
    }
    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight || '18') || 18;
    const padTop = parseFloat(styles.paddingTop || '0') || 0;
    const padBottom = parseFloat(styles.paddingBottom || '0') || 0;
    const oneLineHeight = lineHeight + padTop + padBottom;
    this.aiInputMultiline = el.scrollHeight > oneLineHeight + 2;
  }

  private updateAiInputPlaceholder() {
    if (typeof window === 'undefined') {
      this.aiInputPlaceholder = 'Ex : Quels flows ont des erreurs ?';
      return;
    }
    const isMobileOrTablet = window.innerWidth <= 1023;
    this.aiInputPlaceholder = isMobileOrTablet
      ? 'Ex : Quels flows ont des erreurs ?'
      : 'Ex : Quels flows ont des erreurs ? (Entrée pour envoyer, Maj + Entrée pour un retour à la ligne)';
  }

  private clearCenterAttachments() {
    for (const att of this.centerPendingAttachments) {
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
    }
    this.centerPendingAttachments = [];
  }

  private resetSidebarTouchTracking() {
    this.sidebarTouchStartX = null;
    this.sidebarTouchStartY = null;
    this.sidebarSwipeHandled = false;
  }

  private resetMainTouchTracking() {
    this.mainTouchStartX = null;
    this.mainTouchStartY = null;
    this.mainSwipeHandled = false;
  }

  private shouldHandleMainSidebarSwipe(): boolean {
    return this.shouldHandleMobileSidebarOpenSwipe() || this.shouldHandleMobileSidebarCloseSwipe();
  }

  private shouldHandleMobileSidebarOpenSwipe(): boolean {
    return this.isMobileSidebar() && this.sidebarCollapsed && !this.showSettings && !this.mobileSidebarAnimating;
  }

  private shouldHandleMobileSidebarCloseSwipe(): boolean {
    return this.isMobileSidebar() && !this.sidebarCollapsed && !this.mobileSidebarAnimating;
  }

  private startMobileSidebarAnimation() {
    if (!this.isMobileSidebar()) return;
    this.mobileSidebarAnimating = true;
    if (this.mobileSidebarAnimationTimer) clearTimeout(this.mobileSidebarAnimationTimer);
    this.mobileSidebarAnimationTimer = setTimeout(() => {
      this.mobileSidebarAnimating = false;
      this.cdr.detectChanges();
    }, this.mobileSidebarAnimationDurationMs);
  }

  private resetMobileSidebarAnimationState() {
    this.mobileSidebarAnimating = false;
    this.resetMainTouchTracking();
    this.resetSidebarTouchTracking();
    if (this.mobileSidebarAnimationTimer) {
      clearTimeout(this.mobileSidebarAnimationTimer);
      this.mobileSidebarAnimationTimer = null;
    }
  }

  async selectThread(thread: AiThread) {
    this.showSettings = false;
    this.clearCenterAttachments();
    if (this.shouldAutoCloseSidebarNav()) this.closeSidebarPanel();
    await this.ai.loadThread(thread.id || thread._id);
    const chat = await this.waitForThreadChat();
    if (chat) chat.scrollToLatest();
    this.cdr.detectChanges();
  }

  private shouldAutoCloseSidebarNav(): boolean {
    try { return window.innerWidth <= 1023; } catch { return false; }
  }

  isMobileSidebar(): boolean {
    try { return window.innerWidth <= 1023; } catch { return false; }
  }

  deleteThread(thread: AiThread) {
    this.ai.deleteThread(thread.id || thread._id).subscribe({
      next: () => {
        // Clear selection if deleted thread was active
        if (this.ai.currentThread()?._id === thread._id) {
          this.ai.currentThread.set(null);
          this.ai.messages.set([]);
        }
        this.loadThreads();
      },
    });
  }

  modeLabel(mode: string): string {
    switch (mode) {
      case 'chat': return 'Chat';
      case 'workflow': return 'Flow';
      case 'node_args': return 'Args';
      case 'form': return 'Form';
      case 'onboarding': return 'Onboarding';
      default: return mode;
    }
  }

  linkedElementLabel(): string {
    const thread = this.ai.currentThread();
    if (!thread) return '';
    if (thread.mode === 'workflow' && thread.flowId) return 'Ouvrir le workflow';
    if (thread.mode === 'form' && thread.metadata?.formId) return 'Ouvrir le formulaire';
    return '';
  }

  openLinkedElement() {
    const thread = this.ai.currentThread();
    if (!thread) return;
    if (thread.mode === 'workflow' && thread.flowId) {
      const flowId = thread.metadata?.flowShortId || thread.flowId;
      this.router.navigate(['/flow-builder', 'editor'], { queryParams: { demo: '1', flow: flowId, center: '1' } });
    } else if (thread.mode === 'form' && thread.metadata?.formId) {
      const formId = thread.metadata?.formShortId || thread.metadata.formId;
      this.router.navigate(['/dynamic-form'], { queryParams: { session: formId } });
    }
  }

  agentName(agentId: string): string {
    if (!agentId || agentId === 'general') return '';
    const all = [...this.systemAgents, ...this.customAgents];
    const found = all.find(a => a.id === agentId);
    if (found) return found.name;
    if (agentId.startsWith('provider:')) return agentId.slice('provider:'.length);
    return agentId;
  }

  // Flag : quand l'user ferme manuellement le canvas, on bloque l'auto-open
  // jusqu'au prochain thread switch. Évite le "ça se réouvre tout seul".
  private _userClosedCanvas = false;
  private _lastCanvasOpenSeen: boolean | undefined = undefined;

  toggleCanvasPanel() {
    if (this.ai.canvasOpen()) {
      this._userClosedCanvas = true;
      this.ai.closeCanvas();
    } else {
      this._userClosedCanvas = false;
      this.ai.openCanvas();
    }
  }

  /** Helpers présence — badges avatars des users actifs sur le thread. */
  trackPresence(_: number, p: any) { return p.userId; }
  initials(s: string): string {
    if (!s) return '?';
    const parts = s.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : s.slice(0, 2).toUpperCase();
  }
  avatarColor(userId: string): string {
    // Couleur déterministe à partir de l'id
    let h = 0;
    for (let i = 0; i < (userId || '').length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
    const palette = ['#e61982', '#1890ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#fa541c'];
    return palette[h % palette.length];
  }
  presenceTooltip(): string {
    const names = (this.ai.presence() || []).map(p => p.name || p.userId.slice(0, 6));
    return names.length <= 1 ? '' : names.join(', ') + ' en ligne sur cette conversation';
  }

  /** Envoie un message pour compacter la conversation courante. */
  askCompact() {
    const input = "Cette conversation devient longue. Utilise compact_and_transfer pour résumer l'essentiel et démarrer un nouveau thread. Garde les points clés et les décisions prises.";
    this.ai.quickSend(input).catch((e) => console.error('[fullpage] compact ask failed:', e?.message));
  }

  regenerateTitle() {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.regeneratingTitle = true;
    this.ai.regenerateTitle(thread.id || thread._id).subscribe({
      next: (res: any) => {
        const title = res?.data?.title || res?.title;
        if (title) {
          this.ai.currentThread.set({ ...thread, title });
        }
        this.regeneratingTitle = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.regeneratingTitle = false;
        this.nzMsg.error('Impossible de régénérer le titre');
        this.cdr.detectChanges();
      },
    });
  }

  duplicateThread() {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.duplicateThread(thread.id || thread._id).subscribe({
      next: async (res: any) => {
        const newThread = res?.data || res;
        if (newThread?.id || newThread?._id) {
          this.nzMsg.success('Conversation dupliquée');
          await this.ai.loadThread(newThread.id || newThread._id);
          this.loadThreads();
          this.cdr.detectChanges();
        }
      },
      error: () => this.nzMsg.error('Impossible de dupliquer'),
    });
  }

  updateThreadTitle(title: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    // Debounce title update
    clearTimeout(this.titleDebounce);
    this.titleDebounce = setTimeout(() => {
      this.ai.updateThread(thread.id || thread._id, { title }).subscribe({
        next: () => this.ai.currentThread.set({ ...thread, title }),
      });
    }, 500);
  }

  updateThreadAgent(agentId: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    const newAgentId = agentId === 'general' ? '' : agentId;
    this.ai.updateThread(thread.id || thread._id, { agentId: newAgentId }).subscribe({
      next: () => {
        this.ai.currentThread.set({ ...thread, agentId: newAgentId || undefined });
        this.nzMsg.success('Agent mis à jour');
      },
    });
  }

  loadRecentFlows() {
    const wsId = this.acl.currentWorkspaceId?.() || '';
    this.apiClient.get<any[]>(`/api/workspaces/${wsId}/flows`, { limit: 20 }).subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.recentFlows = list.map((f: any) => ({ id: f.id || f._id, name: f.name || 'Sans nom' }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  unlinkElement() {
    const thread = this.ai.currentThread();
    if (!thread) return;
    // Clear flow/form link
    this.ai.updateThread(thread.id || thread._id, { metadata: { formId: null, flowShortId: null, formShortId: null } }).subscribe({
      next: () => {
        const updated = { ...thread, flowId: undefined, metadata: { ...(thread.metadata || {}), formId: undefined, flowShortId: undefined, formShortId: undefined } };
        this.ai.currentThread.set(updated);
        this.nzMsg.success('Élément dissocié');
        this.cdr.detectChanges();
      },
    });
  }

  linkToFlow(flowId: string) {
    if (!flowId) return;
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.updateThread(thread.id || thread._id, { mode: 'workflow', metadata: { flowShortId: flowId } }).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        if (updated) {
          this.ai.currentThread.set(updated);
          this.nzMsg.success('Workflow lié');
          this.cdr.detectChanges();
        }
      },
    });
  }

  updateThreadAutonomy(level: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.updateThread(thread.id || thread._id, { metadata: { autonomyLevel: level } }).subscribe({
      next: () => {
        const updated = { ...thread, metadata: { ...(thread.metadata || {}), autonomyLevel: level } };
        this.ai.currentThread.set(updated);
      },
    });
  }

  updateThreadMode(mode: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.updateThread(thread.id || thread._id, { mode }).subscribe({
      next: () => {
        this.ai.currentThread.set({ ...thread, mode: mode as any });
      },
    });
  }
}
