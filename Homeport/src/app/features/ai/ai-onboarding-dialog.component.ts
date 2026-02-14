import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Subscription } from 'rxjs';
import { AiChatComponent } from './ai-chat.component';
import { AiService } from './ai.service';
import { AccessControlService } from '../../services/access-control.service';
import { CatalogService, AppProvider } from '../../services/catalog.service';
import { CredentialEditDialogComponent } from '../credentials/credential-edit-dialog.component';

@Component({
  selector: 'ai-onboarding-dialog',
  standalone: true,
  imports: [CommonModule, NzModalModule, NzIconModule, NzButtonModule, AiChatComponent, CredentialEditDialogComponent],
  template: `
    <nz-modal
      [(nzVisible)]="visible"
      [nzWidth]="900"
      [nzFooter]="null"
      [nzClosable]="true"
      (nzOnCancel)="close()"
      nzTitle="Assistant de configuration"
      nzCentered>
      <div *nzModalContent class="onboarding-content">
        <ai-chat></ai-chat>
      </div>
    </nz-modal>

    <credential-edit-dialog
      [visible]="credDialogVisible"
      [provider]="credProvider"
      [workspaceId]="wsId"
      (closed)="credDialogVisible = false"
      (saved)="onCredentialSaved($event)">
    </credential-edit-dialog>
  `,
  styles: [`
    .onboarding-content { height: 70vh; display: flex; flex-direction: column; }
  `]
})
export class AiOnboardingDialogComponent implements OnInit, OnDestroy {
  visible = false;
  credDialogVisible = false;
  credProvider: AppProvider | null = null;
  wsId = '';
  private sub?: Subscription;

  constructor(
    private ai: AiService,
    private acl: AccessControlService,
    private catalog: CatalogService
  ) {}

  ngOnInit() {
    this.sub = this.ai.actionRequests$.subscribe(action => {
      if ((action as any).action === 'open_credentials') {
        this.openCredentialDialog((action as any).providerKey);
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async open() {
    this.visible = true;
    this.wsId = this.acl.currentWorkspaceId?.() || '';
    // Create onboarding thread
    await this.ai.createThread('onboarding');
    // Send initial auto-message to start the conversation
    this.ai.sendMessage('Bonjour, je viens de lancer l\'assistant de configuration.');
  }

  close() {
    this.visible = false;
  }

  private openCredentialDialog(providerKey: string) {
    this.catalog.listApps().subscribe(providers => {
      const p = (providers || []).find(x => x.id === providerKey);
      if (p) {
        this.credProvider = p;
        this.credDialogVisible = true;
      }
    });
  }

  onCredentialSaved(cred: any) {
    this.credDialogVisible = false;
    // Notify AI that credentials were created
    this.ai.answerAction('credential_created', {
      providerKey: this.credProvider?.id,
      name: cred.name,
    });
  }
}
