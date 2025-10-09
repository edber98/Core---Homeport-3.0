import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AccessControlService } from '../../services/access-control.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzButtonModule],
  template: `
  <div class="auth-page">
    <div class="card">
      <h1>Changer le mot de passe</h1>
      <form nz-form nzLayout="vertical" (ngSubmit)="submit()">
        <nz-form-item>
          <nz-form-label>Mot de passe actuel</nz-form-label>
          <nz-form-control>
            <input nz-input type="password" [(ngModel)]="current" name="current" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Nouveau mot de passe</nz-form-label>
          <nz-form-control>
            <input nz-input type="password" [(ngModel)]="next" name="next" />
          </nz-form-control>
        </nz-form-item>
        <div class="actions end">
          <button nz-button nzType="primary" (click)="submit()">Changer</button>
        </div>
        <div class="msg" *ngIf="message">{{ message }}</div>
        <div class="err" *ngIf="error">{{ error }}</div>
      </form>
    </div>
  </div>
  `,
  styles: [`
    .auth-page { display:flex; align-items:center; justify-content:center; padding: 32px; }
    .card { width: 420px; max-width: 100%; background:#fff; border:1px solid #eee; border-radius: 14px; padding: 18px; box-shadow: 0 12px 36px rgba(0,0,0,.06); }
    h1 { margin: 0 0 12px; font-size: 20px; }
    .actions.end { display:flex; justify-content:flex-end; }
    .msg { margin-top:10px; color:#166534; }
    .err { margin-top:10px; color:#b42318; }
  `]
})
export class ChangePasswordComponent {
  current = '';
  next = '';
  message: string | null = null;
  error: string | null = null;
  constructor(private auth: AuthService, private acl: AccessControlService, private router: Router) {}
  submit() {
    this.message = this.error = null;
    const userId = this.acl.currentUser()?.id || '';
    this.auth.changePassword(userId, this.current, this.next).subscribe({
      next: () => { this.message = 'Mot de passe changé.'; setTimeout(() => this.router.navigateByUrl('/dashboard'), 500); },
      error: (e) => this.error = e?.message || 'Échec'
    });
  }
}

