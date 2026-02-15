import { Component, ElementRef, ViewChild, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AiService, AiStreamEvent } from './ai.service';
import { AiAudioService } from './ai-audio.service';
import { AiMessageComponent } from './ai-message.component';
import { AiQuestionComponent } from './ai-question.component';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const TOOL_LABELS: Record<string, string> = {
  search_tools: 'Recherche d\'outils', get_tool_details: 'Détails outil', execute_tool: 'Exécution',
  list_providers: 'Providers', ask_user: 'Question', search_workflows: 'Recherche workflows',
  run_workflow: 'Lancement workflow', save_memory: 'Mémoire', get_memory: 'Mémoire',
  enrich_context: 'Contexte', open_element: 'Ouverture', open_credentials: 'Identifiants',
  save_project_memory: 'Mémoire projet', get_project_memory: 'Mémoire projet',
  compact_and_transfer: 'Transfert', activate_capsule: 'Activation outils',
  search_manual: 'Manuel', get_manual_section: 'Manuel',
  create_flow: 'Création flow', list_graph: 'Graphe', get_templates: 'Templates',
  get_template_details: 'Détails template', ensure_start: 'Démarrage', add_node: 'Ajout noeud',
  remove_node: 'Suppression', replace_node: 'Remplacement', connect_nodes: 'Connexion',
  disconnect_nodes: 'Déconnexion', connect_by_output_name: 'Connexion sortie',
  get_output_options: 'Sorties', set_node_args: 'Config args', set_node_description: 'Description',
  validate_flow: 'Validation', auto_layout: 'Layout', save_flow: 'Sauvegarde',
  create_start_form: 'Formulaire start', propose_context_mapping: 'Mapping',
  get_node_schema: 'Schéma noeud', get_node_info: 'Info noeud', list_predecessors: 'Prédécesseurs',
  get_predecessor_context: 'Contexte préd.', search_predecessors: 'Recherche préd.',
  get_scenarios: 'Scénarios', get_msgin_preview: 'Aperçu msgIn',
  get_form_schema: 'Schéma form', set_form_schema: 'MAJ schéma', add_field: 'Ajout champ',
  update_field: 'Modif champ', remove_field: 'Suppr champ', create_form: 'Création form',
  save_form: 'Sauvegarde form', get_output_schema: 'Schéma sortie', build_schema: 'Construction schéma',
  add_section: 'Ajout section', update_section: 'Modif section', reorder_fields: 'Réordonnancement',
  get_field_types: 'Types champs', search_forms: 'Recherche forms', load_form: 'Chargement form',
  update_form_settings: 'Paramètres form',
  deploy_flow: 'Déploiement', undeploy_flow: 'Arrêt production',
  get_deployment_status: 'Statut déploiement', start_run: 'Lancement exécution',
  list_runs: 'Historique', get_run_stats: 'Statistiques',
};

interface StreamSegment {
  type: 'text' | 'tools';
  html?: string;            // rendered markdown HTML for text segments
  rawText?: string;          // raw text for accumulation
  tools?: StreamTool[];      // tools in a tools segment
  reasoningText?: string;    // raw reasoning text accumulated during tools phase
  reasoningHtml?: string;    // rendered HTML for reasoning text
}

interface StreamTool {
  id: string; name: string; status: 'running' | 'success' | 'error';
  duration?: number; args?: any; result?: any;
  inputJson?: string; // Partial JSON being streamed from LLM
}

@Component({
  selector: 'ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzIconModule, NzEmptyModule, NzTagModule, NzPopoverModule, NzToolTipModule, AiMessageComponent, AiQuestionComponent],
  template: `
    <!-- Messages -->
    <div class="messages" #scrollContainer>
      <ng-container *ngIf="ai.messages().length === 0 && !ai.streaming()">
        <div class="empty">
          <nz-empty nzNotFoundContent="Commencez une conversation"></nz-empty>
        </div>
      </ng-container>

      <ng-container *ngFor="let msg of ai.messages()">
        <!-- System context message (transferred context) -->
        <div class="system-msg" *ngIf="msg.role === 'system'">
          <div class="system-context">
            <span nz-icon nzType="info-circle" nzTheme="outline"></span>
            <span class="system-label">Contexte transféré</span>
            <button nz-button nzType="text" nzSize="small" (click)="toggleExpanded(msg)">
              {{ expandedMsgs.has(msg) ? 'Masquer' : 'Voir' }}
            </button>
          </div>
          <div class="system-content" *ngIf="expandedMsgs.has(msg)" [innerHTML]="renderMd(msg.content)"></div>
        </div>
        <!-- Regular message -->
        <ai-message *ngIf="msg.role !== 'system'" [msg]="msg" (retryClick)="retry()"></ai-message>
      </ng-container>

      <!-- Waiting for first token / thinking between iterations -->
      <div class="streaming-msg" *ngIf="ai.streaming() && !segments.length && !streamError">
        <div class="ai-msg assistant">
          <div class="avatar"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
          <div class="body">
            <div class="thinking-indicator" *ngIf="thinkingIteration > 1">
              <span nz-icon nzType="loading" nzTheme="outline" class="thinking-spin"></span>
              <span class="thinking-text">Réflexion en cours...</span>
            </div>
            <div class="typing-indicator" *ngIf="thinkingIteration <= 1">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stream error -->
      <div class="streaming-msg" *ngIf="streamError">
        <div class="ai-msg assistant">
          <div class="avatar avatar-error"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
          <div class="body">
            <div class="content content-error">
              <span nz-icon nzType="close-circle" nzTheme="fill" style="margin-right:6px"></span>
              <strong>Erreur :</strong> {{ streamError }}
            </div>
          </div>
        </div>
      </div>

      <!-- Streaming: interleaved text + tools -->
      <div class="streaming-msg" *ngIf="segments.length">
        <div class="ai-msg assistant">
          <div class="avatar"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
          <div class="body">
            <ng-container *ngFor="let seg of segments; let i = index; trackBy: trackSeg">
              <!-- Text segment -->
              <div class="content" *ngIf="seg.type === 'text' && seg.html"
                   [innerHTML]="seg.html"></div>

              <!-- Tools segment: reasoning block -->
              <div class="reasoning-block" *ngIf="seg.type === 'tools' && (seg.tools?.length || seg.reasoningHtml)"
                   [class.reasoning-active]="isLastSegment(i) && ai.streaming()">
                <div class="reasoning-header">
                  <span nz-icon nzType="loading" nzTheme="outline" *ngIf="isLastSegment(i) && ai.streaming()"></span>
                  <span nz-icon nzType="bulb" nzTheme="outline" *ngIf="!isLastSegment(i) || !ai.streaming()"></span>
                  <span>Raisonnement</span>
                </div>
                <!-- Reasoning text (AI's thinking streamed in real-time) -->
                <div class="reasoning-text" *ngIf="seg.reasoningHtml" [innerHTML]="seg.reasoningHtml"></div>
                <div class="reasoning-tools" *ngIf="seg.tools?.length">
                  <ng-container *ngFor="let t of seg.tools; trackBy: trackTool">
                    <nz-tag
                      class="tool-tag"
                      [nzColor]="t.status === 'error' ? 'red' : t.status === 'running' ? 'processing' : 'geekblue'"
                      nz-popover
                      [nzPopoverContent]="popTpl"
                      nzPopoverTrigger="hover"
                      nzPopoverPlacement="topLeft">
                      <span nz-icon [nzType]="t.status === 'running' ? 'loading' : t.status === 'error' ? 'close-circle' : 'check-circle'" nzTheme="outline" [nzSpin]="t.status === 'running'" class="tag-icon"></span>
                      {{ toolLabel(t.name) }}
                      <span class="tag-extra" *ngIf="toolExtra(t)">{{ toolExtra(t) }}</span>
                      <span class="tag-dur" *ngIf="t.duration">{{ t.duration }}ms</span>
                    </nz-tag>
                    <ng-template #popTpl>
                      <div class="popover-content">
                        <div class="popover-section" *ngIf="t.args">
                          <div class="popover-label">Arguments</div>
                          <pre class="popover-json">{{ t.args | json }}</pre>
                        </div>
                        <div class="popover-section" *ngIf="t.result !== undefined && t.result !== null && t.status !== 'running'">
                          <div class="popover-label">Résultat</div>
                          <pre class="popover-json">{{ truncJson(t.result) }}</pre>
                        </div>
                      </div>
                    </ng-template>
                  </ng-container>
                  <!-- Live streaming of tool arguments for the current running tool -->
                  <div class="tool-input-stream" *ngIf="lastRunningTool(seg.tools) as rt">
                    <div class="stream-preview" [innerHTML]="formatToolStream(rt.name, rt.inputJson)"></div>
                  </div>
                </div>
              </div>
            </ng-container>
            <!-- Thinking indicator between tool completion and next LLM response -->
            <div class="thinking-inline" *ngIf="thinkingIteration > 1 && ai.streaming()">
              <span nz-icon nzType="loading" nzTheme="outline" class="thinking-spin"></span>
              <span class="thinking-text">Analyse...</span>
            </div>
          </div>
        </div>
        <!-- Interrupted tag -->
        <div class="interrupted-tag" *ngIf="interrupted && segments.length">
          <nz-tag nzColor="orange">
            <span nz-icon nzType="pause-circle" nzTheme="outline"></span> Interrompu
          </nz-tag>
        </div>
      </div>

      <!-- Pending question -->
      <div class="question-msg" *ngIf="ai.pendingQuestion()">
        <div class="avatar"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
        <div class="question-body">
          <ai-question
            [question]="ai.pendingQuestion()!"
            (answered)="onAnswer($event)">
          </ai-question>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="input-bar">
      <!-- Normal text input -->
      <div class="input-row" *ngIf="!audio.recording()">
        <div class="input-prefix">
          <button nz-button nzType="text" nzSize="small"
            (click)="toggleMic()"
            [disabled]="ai.streaming() || audio.transcribing()"
            nz-tooltip nzTooltipTitle="Enregistrement vocal">
            <span nz-icon [nzType]="audio.transcribing() ? 'loading' : 'audio'" nzTheme="outline"
              [nzSpin]="audio.transcribing()"></span>
          </button>
        </div>
        <textarea
          nz-input
          [(ngModel)]="inputText"
          placeholder="Écris un message..."
          (keydown)="onInputKeydown($event)"
          [nzAutosize]="{ minRows: 1, maxRows: 6 }"
          [disabled]="audio.transcribing()">
        </textarea>
        <div class="input-suffix">
          <button *ngIf="ai.streaming()" nz-button nzType="text" nzSize="small" nzDanger (click)="stopStream()">
            <span nz-icon nzType="pause-circle" nzTheme="outline"></span>
          </button>
          <button *ngIf="!ai.streaming()" nz-button nzType="text" nzSize="small" (click)="send()" [disabled]="!inputText.trim()">
            <span nz-icon nzType="send" nzTheme="outline"></span>
          </button>
        </div>
      </div>
      <!-- Recording waveform -->
      <div class="input-row recording-row" *ngIf="audio.recording()">
        <canvas #waveformCanvas class="waveform-canvas"></canvas>
        <span class="mic-timer">{{ audio.recordingDuration() }}s</span>
        <button nz-button nzType="text" nzShape="circle" nzSize="small" class="rec-btn rec-cancel" (click)="cancelMic()"
          nz-tooltip nzTooltipTitle="Annuler">
          <span nz-icon nzType="close" nzTheme="outline"></span>
        </button>
        <button nz-button nzType="text" nzShape="circle" nzSize="small" class="rec-btn rec-confirm" (click)="confirmMic()"
          nz-tooltip nzTooltipTitle="Envoyer">
          <span nz-icon nzType="check" nzTheme="outline"></span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .messages { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
    .empty { flex: 1; display: flex; align-items: center; justify-content: center; }
    .streaming-msg .ai-msg { display: flex; gap: 10px; padding: 8px 0; }
    .streaming-msg .avatar { width: 32px; height: 32px; border-radius: 50%; background: #e6f4ff; color: #1677ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
    .streaming-msg .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .streaming-msg .content { background: #f5f5f5; border-radius: 12px 12px 12px 2px; padding: 8px 14px; max-width: 85%; word-break: break-word; line-height: 1.5; }
    .streaming-msg .content :host ::ng-deep p { margin: 0 0 4px; }
    .streaming-msg .content :host ::ng-deep p:last-child { margin: 0; }
    .streaming-msg .content :host ::ng-deep code { background: #e8e8e8; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
    .streaming-msg .content :host ::ng-deep pre { background: #e8e8e8; padding: 8px; border-radius: 6px; overflow-x: auto; }
    .streaming-msg .content ::ng-deep table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px; display: block; overflow-x: auto; max-width: 100%; }
    .streaming-msg .content ::ng-deep th, .streaming-msg .content ::ng-deep td { border: 1px solid #e8e8e8; padding: 6px 10px; text-align: left; white-space: nowrap; }
    .streaming-msg .content ::ng-deep th { background: #fafafa; font-weight: 600; font-size: 12px; }
    .streaming-msg .content ::ng-deep tr:nth-child(even) { background: #fafafa; }
    .reasoning-block { border-left: 3px solid #d9d9d9; padding: 6px 12px; margin: 4px 0; border-radius: 0 8px 8px 0; transition: opacity 0.3s ease, border-color 0.3s ease; max-width: 85%; }
    .reasoning-block.reasoning-active { border-left-color: #722ed1; opacity: 0.9; animation: pulse-reason 2s ease-in-out infinite; }
    .reasoning-block:not(.reasoning-active) { opacity: 0.85; }
    .reasoning-header { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #999; margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; }
    .reasoning-text { font-size: 12px; color: #666; line-height: 1.6; margin-bottom: 6px; word-break: break-word; }
    .reasoning-text ::ng-deep p { margin: 0 0 4px; }
    .reasoning-text ::ng-deep p:last-child { margin: 0; }
    .reasoning-text ::ng-deep code { background: #e8e8e8; padding: 1px 3px; border-radius: 2px; font-size: 11px; }
    .reasoning-text ::ng-deep ul, .reasoning-text ::ng-deep ol { margin: 2px 0; padding-left: 18px; }
    .reasoning-text ::ng-deep li { margin: 1px 0; }
    .reasoning-tools { display: flex; flex-wrap: wrap; gap: 4px; }
    @keyframes pulse-reason { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.75; } }
    .tool-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tool-tag { cursor: pointer; display: inline-flex; align-items: center; gap: 3px; font-size: 12px; margin: 0; }
    .tag-icon { font-size: 11px; }
    .tag-extra { opacity: 0.7; font-size: 11px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag-dur { opacity: 0.6; font-size: 10px; margin-left: 2px; }
    .popover-content { max-height: 400px; overflow-y: auto; }
    .popover-section { margin-bottom: 8px; }
    .popover-section:last-child { margin-bottom: 0; }
    .popover-label { font-weight: 600; font-size: 12px; color: #666; margin-bottom: 4px; }
    .popover-json { font-size: 11px; background: #f5f5f5; padding: 6px 8px; border-radius: 4px; margin: 0; max-height: 200px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
    .typing-indicator { display: flex; align-items: center; gap: 4px; padding: 10px 16px; background: #f5f5f5; border-radius: 12px 12px 12px 2px; max-width: 60px; }
    .typing-indicator .dot { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: typing-bounce 1.4s ease-in-out infinite; }
    .typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
    .thinking-indicator { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #f5f5f5; border-radius: 12px 12px 12px 2px; max-width: 200px; }
    .thinking-spin { font-size: 14px; color: #722ed1; }
    .thinking-text { font-size: 12px; color: #999; }
    .thinking-inline { display: flex; align-items: center; gap: 5px; padding: 4px 0; opacity: 0.7; }
    .tool-input-stream { margin-top: 4px; width: 100%; }
    .stream-preview { font-size: 12px; color: #666; animation: stream-fade 0.3s ease; }
    .stream-preview ::ng-deep .sp-label { font-size: 10px; color: #999; text-transform: uppercase; font-weight: 500; margin-bottom: 2px; }
    .stream-preview ::ng-deep .sp-value { color: #333; line-height: 1.4; margin-bottom: 4px; }
    .stream-preview ::ng-deep .sp-tag { display: inline-block; background: #f0f0f0; padding: 1px 6px; border-radius: 3px; font-size: 11px; color: #666; margin: 1px 2px; }
    .stream-preview ::ng-deep .sp-opts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .stream-preview ::ng-deep .sp-opt { display: inline-block; background: #e6f4ff; color: #1677ff; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
    .stream-preview ::ng-deep .sp-sub-q { font-size: 11px; margin: 3px 0; padding: 3px 0; border-top: 1px solid #f5f5f5; }
    .stream-preview ::ng-deep .sp-json { font-size: 10px; background: #f9f9f9; border: 1px solid #f0f0f0; padding: 4px 6px; border-radius: 3px; margin: 2px 0; max-height: 100px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
    .stream-preview ::ng-deep .sp-raw { font-size: 10px; color: #999; word-break: break-all; }
    @keyframes stream-fade { from { opacity: 0.5; } to { opacity: 1; } }
    .avatar-error { background: #fff2f0 !important; color: #ff4d4f !important; }
    .content-error { background: #fff2f0 !important; color: #ff4d4f; border: 1px solid #ffccc7; display: flex; align-items: center; }
    .input-bar { padding: 8px 16px 12px; border-top: 1px solid #f0f0f0; }
    .input-row { display: flex; align-items: flex-start; gap: 4px; border: 1px solid #d9d9d9; border-radius: 8px; padding: 4px 8px; transition: border-color 0.2s; }
    .input-row:focus-within { border-color: #1677ff; }
    .input-row textarea { flex: 1; border: none !important; outline: none !important; box-shadow: none !important; resize: none; padding: 4px 0; font-size: 14px; line-height: 1.5; background: transparent; }
    .input-row textarea:focus { box-shadow: none !important; }
    .input-prefix, .input-suffix { display: flex; align-items: center; flex-shrink: 0; height: 29px; }
    .recording-row { align-items: center !important; gap: 8px !important; padding: 6px 12px !important; overflow: hidden; }
    .waveform-canvas { flex: 1; width: 0; height: 32px; min-width: 0; display: block; }
    .mic-timer { font-size: 12px; color: #ff4d4f; font-weight: 600; flex-shrink: 0; min-width: 28px; text-align: center; }
    .rec-btn { flex-shrink: 0; }
    .rec-cancel { color: #999 !important; }
    .rec-cancel:hover { color: #ff4d4f !important; }
    .rec-confirm { color: #52c41a !important; }
    .rec-confirm:hover { color: #389e0d !important; }
    .system-msg { background: #f8f9fa; border-left: 3px solid #d9d9d9; padding: 8px 12px; font-size: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
    .system-context { display: flex; align-items: center; gap: 6px; color: #999; }
    .system-label { font-weight: 500; }
    .system-content { margin-top: 6px; font-size: 12px; color: #666; line-height: 1.5; }
    .system-content ::ng-deep p { margin: 0 0 4px; }
    .question-msg { display: flex; gap: 10px; padding: 8px 0; }
    .question-msg .avatar { width: 32px; height: 32px; border-radius: 50%; background: #e6f4ff; color: #1677ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
    .question-msg .question-body { flex: 1; min-width: 0; max-width: 85%; }
    .interrupted-tag { padding: 4px 0; }
  `]
})
export class AiChatComponent {
  inputText = '';
  segments: StreamSegment[] = [];
  streamError: string | null = null;
  expandedMsgs = new Set<any>();
  thinkingIteration = 0;
  interrupted = false;
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('waveformCanvas') waveformCanvas?: ElementRef<HTMLCanvasElement>;

  private stopFn?: () => void;

  constructor(public ai: AiService, public audio: AiAudioService, private cdr: ChangeDetectorRef) {
    effect(() => {
      this.ai.messages();
      this.scrollToBottom();
    });
    // Draw waveform when recording
    effect(() => {
      const data = this.audio.waveformData();
      if (data.length && this.waveformCanvas?.nativeElement) {
        this.drawWaveform(data, this.waveformCanvas.nativeElement);
      }
    });
  }

  private drawWaveform(data: Uint8Array, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Draw bars from the center
    const barCount = 64;
    const step = Math.floor(data.length / barCount);
    const barWidth = Math.max(1.5, (w / barCount) * 0.6);
    const gap = w / barCount;
    const midY = h / 2;

    ctx.fillStyle = '#333';
    for (let i = 0; i < barCount; i++) {
      const sample = data[i * step] || 128;
      const amplitude = Math.abs(sample - 128) / 128;
      const barH = Math.max(2, amplitude * (h * 0.9));
      const x = i * gap + (gap - barWidth) / 2;
      ctx.fillRect(x, midY - barH / 2, barWidth, barH);
    }
  }

  onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  async send() {
    const text = (this.inputText || '').trim();
    if (!text || this.ai.streaming()) return;
    this.inputText = '';
    this.segments = [];
    this.streamError = null;
    this.thinkingIteration = 0;
    this.interrupted = false;

    const { events$, stop } = await this.ai.quickSend(text);
    this.stopFn = stop;
    this.handleStream(events$);
  }

  async toggleMic() {
    if (!this.audio.recording()) {
      try {
        await this.audio.startRecording();
        this.cdr.detectChanges();
      } catch (e: any) {
        console.error('[ai-chat] mic error:', e);
        this.cdr.detectChanges();
      }
    }
  }

  cancelMic() {
    this.audio.cancelRecording();
    this.cdr.detectChanges();
  }

  async confirmMic() {
    try {
      const blob = await this.audio.stopAndGetBlob();
      this.cdr.detectChanges();
      this.audio.transcribe(blob).subscribe({
        next: (text: string) => {
          if (text.trim()) {
            this.inputText = text;
            this.cdr.detectChanges();
            this.send();
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.cdr.detectChanges();
        },
      });
    } catch { this.cdr.detectChanges(); }
  }

  stopStream() {
    this.stopFn?.();
    this.stopFn = undefined;
    this.interrupted = true;
  }

  retry() {
    const msgs = this.ai.messages();
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user' && msgs[i].content) {
        this.inputText = msgs[i].content;
        this.send();
        return;
      }
    }
  }

  onAnswer(answer: any) {
    this.segments = [];
    this.streamError = null;
    this.thinkingIteration = 0;
    this.interrupted = false;
    const result = this.ai.answerQuestion(answer);
    if (!result) return;
    const { events$, stop } = result;
    this.stopFn = stop;
    this.handleStream(events$);
  }

  private handleStream(events$: any) {
    events$.subscribe({
      next: (ev: AiStreamEvent) => {
        try {
          this.processStreamEvent(ev);
        } catch (e) {
          console.error('[ai-chat] stream event error:', e);
        }
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('[ai-chat] stream error:', err);
        this.streamError = err?.message || 'Connexion échouée';
        this.stopFn = undefined;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      complete: () => {
        this.segments = [];
        this.stopFn = undefined;
        this.cdr.detectChanges();
      },
    });
  }

  /** Process a single stream event — fully immutable segment updates */
  private processStreamEvent(ev: AiStreamEvent) {
    switch (ev.type) {
      case 'message': {
        const text = (ev as any).text || '';
        const last = this.segments[this.segments.length - 1];
        if (last && last.type === 'text') {
          // Append to existing text segment
          const raw = (last.rawText || '') + text;
          const updated: StreamSegment = { type: 'text', rawText: raw, html: this.renderMd(raw) };
          this.segments = [...this.segments.slice(0, -1), updated];
        } else {
          // New text segment (after tools segment or at start)
          this.segments = [...this.segments, { type: 'text', rawText: text, html: this.renderMd(text) }];
        }
        break;
      }
      case 'tool.start': {
        const tool: StreamTool = { id: (ev as any).id, name: (ev as any).name, status: 'running' };
        const last = this.segments[this.segments.length - 1];
        if (last && last.type === 'tools') {
          // Add tool to existing tools segment
          const updated: StreamSegment = { ...last, tools: [...(last.tools || []), tool] };
          this.segments = [...this.segments.slice(0, -1), updated];
        } else if (last && last.type === 'text') {
          // Absorb preceding text as reasoning into new tools segment
          const reasoningText = last.rawText || '';
          const newSeg: StreamSegment = {
            type: 'tools',
            tools: [tool],
            reasoningText: reasoningText || undefined,
            reasoningHtml: reasoningText ? this.renderMd(reasoningText) : undefined,
          };
          this.segments = [...this.segments.slice(0, -1), newSeg];
        } else {
          this.segments = [...this.segments, { type: 'tools', tools: [tool] }];
        }
        break;
      }
      case 'tool.input_delta': {
        // Accumulate partial JSON on the running tool
        const deltaId = (ev as any).id;
        const deltaName = (ev as any).name || '';
        const deltaText = (ev as any).text || '';
        let deltaFound = false;
        const deltaUpdated = this.segments.map(seg => {
          if (seg.type !== 'tools' || !seg.tools) return seg;
          const idx = seg.tools.findIndex(t => t.id === deltaId);
          if (idx < 0) return seg;
          deltaFound = true;
          const updatedTools = seg.tools.map((t, i) =>
            i === idx ? { ...t, inputJson: (t.inputJson || '') + deltaText } : t
          );
          return { ...seg, tools: updatedTools };
        });
        if (deltaFound) {
          this.segments = deltaUpdated;
        } else if (deltaId) {
          // tool.start was missed — create the tool entry from input_delta
          const tool: StreamTool = { id: deltaId, name: deltaName, status: 'running', inputJson: deltaText };
          const last = this.segments[this.segments.length - 1];
          if (last && last.type === 'tools') {
            this.segments = [...this.segments.slice(0, -1), { ...last, tools: [...(last.tools || []), tool] }];
          } else {
            this.segments = [...this.segments, { type: 'tools', tools: [tool] }];
          }
        }
        break;
      }
      case 'tool.end': {
        const evId = (ev as any).id;
        const evName = (ev as any).name || '';
        const evStatus = ((ev as any).status || 'success') as 'running' | 'success' | 'error';
        const evDuration = (ev as any).duration;
        const evArgs = (ev as any).args;
        const evResult = (ev as any).result;
        // Find and update the tool — create NEW segment + tools array
        let found = false;
        const updated = this.segments.map(seg => {
          if (seg.type !== 'tools' || !seg.tools) return seg;
          const idx = seg.tools.findIndex(t => t.id === evId);
          if (idx < 0) return seg;
          found = true;
          const updatedTools = seg.tools.map((t, i) =>
            i === idx ? { ...t, status: evStatus, duration: evDuration, args: evArgs, result: evResult } : t
          );
          return { ...seg, tools: updatedTools };
        });
        if (found) {
          this.segments = updated;
        } else {
          // tool.start was missed — create the tool entry directly
          const tool: StreamTool = { id: evId, name: evName, status: evStatus, duration: evDuration, args: evArgs, result: evResult };
          const last = this.segments[this.segments.length - 1];
          if (last && last.type === 'tools') {
            this.segments = [...this.segments.slice(0, -1), { ...last, tools: [...(last.tools || []), tool] }];
          } else {
            this.segments = [...this.segments, { type: 'tools', tools: [tool] }];
          }
        }
        break;
      }
      case 'error': {
        const errMsg = (ev as any).message || 'Une erreur est survenue';
        if (this.segments.length) {
          // Error during streaming — append to segments
          const errHtml = `<p style="color:#ff4d4f"><strong>Erreur :</strong> ${errMsg}</p>`;
          const last = this.segments[this.segments.length - 1];
          if (last && last.type === 'text') {
            const raw = (last.rawText || '') + '\n\n**Erreur :** ' + errMsg;
            this.segments = [...this.segments.slice(0, -1), { type: 'text', rawText: raw, html: this.renderMd(raw) } as StreamSegment];
          } else {
            this.segments = [...this.segments, { type: 'text', rawText: '**Erreur :** ' + errMsg, html: errHtml } as StreamSegment];
          }
        } else {
          // Error before any content — show red error indicator
          this.streamError = errMsg;
        }
        break;
      }
      case 'done':
        // Clear segments immediately to avoid duplication with final message from messages signal
        this.segments = [];
        this.thinkingIteration = 0;
        break;
      case 'thinking' as any:
        this.thinkingIteration = (ev as any).iteration || 0;
        break;
      // Forward builder-relevant events (patch, snapshot, args, desc, form.update)
      case 'patch':
      case 'snapshot':
      case 'args':
      case 'desc':
        console.log('[ai-chat] forwarding side event:', ev.type, ev);
        this.ai.emitSideEvent(ev);
        break;
    }
    // Forward form and flow events too
    if ((ev as any).type?.startsWith?.('form.') || (ev as any).type?.startsWith?.('flow.')) {
      console.log('[ai-chat] forwarding form/flow event:', (ev as any).type, ev);
      this.ai.emitSideEvent(ev);
    }
  }

  renderMd(src: string): string {
    try {
      const html = marked.parse(String(src || ''), { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'br', 'span', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      });
    } catch { return src; }
  }

  // trackBy functions to avoid DOM thrashing during streaming
  trackSeg(i: number, seg: StreamSegment): string { return `${i}-${seg.type}`; }
  trackTool(i: number, t: StreamTool): string { return t.id; }

  isLastSegment(i: number): boolean { return i === this.segments.length - 1; }

  toggleExpanded(msg: any) {
    if (this.expandedMsgs.has(msg)) this.expandedMsgs.delete(msg);
    else this.expandedMsgs.add(msg);
  }


  toolLabel(name: string): string {
    return TOOL_LABELS[name] || name;
  }

  toolExtra(t: StreamTool): string {
    if (!t.args) return '';
    if (t.name === 'execute_tool' && t.args.key) return t.args.key;
    if (t.name === 'search_tools' && t.args.query) return `"${t.args.query}"`;
    if (t.name === 'get_tool_details' && t.args.key) return t.args.key;
    if (t.name === 'get_template_details' && t.args.key) return t.args.key;
    if (t.name === 'add_node' && t.args.templateKey) return t.args.templateKey;
    if (t.name === 'connect_nodes') return `${t.args.sourceId?.slice(-8) || '?'} → ${t.args.targetId?.slice(-8) || '?'}`;
    if (t.name === 'get_templates' && t.args.query) return `"${t.args.query}"`;
    if (t.name === 'set_node_args' && t.args.nodeId) return t.args.nodeId.slice(-8);
    return '';
  }

  lastRunningTool(tools?: StreamTool[]): StreamTool | null {
    if (!tools?.length) return null;
    const running = tools.filter(t => t.status === 'running' && t.inputJson);
    return running.length ? running[running.length - 1] : null;
  }

  /** Format streaming tool input as readable HTML, specific to each tool */
  formatToolStream(toolName: string, json?: string): string {
    if (!json) return '';
    let parsed: any = null;
    try { parsed = JSON.parse(json); } catch {
      // Incomplete JSON — try to extract partial key-values
      return this.formatPartialKeys(toolName, json);
    }
    // Tool-specific formatting
    switch (toolName) {
      case 'ask_user': {
        let html = '';
        if (parsed.text) html += `<div class="sp-label">Question :</div><div class="sp-value">${this.esc(parsed.text)}</div>`;
        if (parsed.questionType) html += `<span class="sp-tag">${parsed.questionType}</span>`;
        if (parsed.options?.length) {
          html += '<div class="sp-opts">' + parsed.options.map((o: any) =>
            `<span class="sp-opt">${this.esc(o.label || o.value || '')}</span>`
          ).join('') + '</div>';
        }
        if (parsed.questions?.length) {
          html += parsed.questions.map((q: any) => {
            let qh = `<div class="sp-sub-q">${this.esc(q.text || '')}`;
            if (q.options?.length) qh += ' ' + q.options.map((o: any) => `<span class="sp-opt">${this.esc(o.label)}</span>`).join('');
            return qh + '</div>';
          }).join('');
        }
        return html || `<pre class="sp-json">${this.esc(JSON.stringify(parsed, null, 2))}</pre>`;
      }
      case 'execute_tool':
        return `<span class="sp-tag">${this.esc(parsed.key || '')}</span>` +
          (parsed.args ? `<pre class="sp-json">${this.esc(JSON.stringify(parsed.args, null, 2).slice(0, 300))}</pre>` : '');
      case 'search_tools':
        return (parsed.query ? `<span class="sp-tag">"${this.esc(parsed.query)}"</span>` : '') +
          (parsed.provider ? ` <span class="sp-tag">${this.esc(parsed.provider)}</span>` : '');
      case 'set_node_args':
        return (parsed.nodeId ? `<span class="sp-tag">Node: ${this.esc(parsed.nodeId.slice(-8))}</span>` : '') +
          (parsed.args ? `<pre class="sp-json">${this.esc(JSON.stringify(parsed.args, null, 2).slice(0, 300))}</pre>` : '');
      default:
        return `<pre class="sp-json">${this.esc(JSON.stringify(parsed, null, 2).slice(0, 400))}</pre>`;
    }
  }

  private formatPartialKeys(toolName: string, json: string): string {
    // Extract readable values from partial JSON via regex
    const textMatch = json.match(/"text"\s*:\s*"([^"]*)/);
    const queryMatch = json.match(/"query"\s*:\s*"([^"]*)/);
    const keyMatch = json.match(/"key"\s*:\s*"([^"]*)/);
    let html = '';
    if (toolName === 'ask_user' && textMatch) {
      html += `<div class="sp-label">Question :</div><div class="sp-value">${this.esc(textMatch[1])}</div>`;
      // Extract options being formed
      const optLabels = [...json.matchAll(/"label"\s*:\s*"([^"]*)/g)].map(m => m[1]);
      if (optLabels.length) {
        html += '<div class="sp-opts">' + optLabels.map(l => `<span class="sp-opt">${this.esc(l)}</span>`).join('') + '</div>';
      }
      return html;
    }
    if (queryMatch) return `<span class="sp-tag">"${this.esc(queryMatch[1])}"</span>`;
    if (keyMatch) return `<span class="sp-tag">${this.esc(keyMatch[1])}</span>`;
    // Fallback: show raw truncated
    return `<code class="sp-raw">${this.esc(json.slice(0, 200))}</code>`;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  truncJson(val: any): string {
    try {
      const txt = JSON.stringify(val, null, 2);
      return txt.length > 800 ? txt.slice(0, 800) + '\n...' : txt;
    } catch { return String(val); }
  }

  private scrollToBottom() {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) setTimeout(() => el.scrollTop = el.scrollHeight, 0);
    } catch {}
  }
}
