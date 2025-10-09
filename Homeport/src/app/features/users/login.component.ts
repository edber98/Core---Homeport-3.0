import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzButtonModule, RouterModule],
  template: `
  <div class="auth-page">
    <div class="card">
      <h1>Connexion</h1>
      <form nz-form nzLayout="vertical" (ngSubmit)="login()">
        <nz-form-item>
          <nz-form-label>Utilisateur</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="userId" name="userId" placeholder="admin, alice, demo" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Mot de passe</nz-form-label>
          <nz-form-control>
            <input nz-input type="password" [(ngModel)]="password" name="password" placeholder="••••••" />
          </nz-form-control>
        </nz-form-item>
        <div class="actions">
          <button nz-button nzType="primary" (click)="login()">Se connecter</button>
          <button nz-button (click)="loginDemo()" type="button">Demo</button>
          <a [routerLink]="'/forgot'">Mot de passe oublié ?</a>
        </div>
        <div class="err" *ngIf="error">{{ error }}</div>
        <div class="demo">
          <div class="hint">Comptes de test:</div>
          <div class="chips">
            <span class="chip">demo/demo (Company BETA)</span>
            <span class="chip">admin/admin (Company ACME)</span>
            <span class="chip">alice/password (Company ACME)</span>
          </div>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: [`
    .auth-page { display:flex; align-items:center; justify-content:center; padding: 32px; min-height: 60vh; }
    .card { width: 420px; max-width: 100%; background:#fff; border:1px solid #eee; border-radius: 14px; padding: 18px; box-shadow: 0 12px 36px rgba(0,0,0,.06); }
    h1 { margin: 0 0 12px; font-size: 20px; }
    .actions { display:flex; align-items:center; gap:10px; justify-content: space-between; }
    .err { margin-top:10px; color:#b42318; }
    .demo { margin-top: 12px; }
    .hint { color:#6b7280; font-size:12px; margin-bottom: 6px; }
    .chips { display:flex; flex-wrap: wrap; gap:6px; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    @media (max-width: 480px) {
      .auth-page { padding: 16px; }
      .card { width: 100%; padding: 14px; border-radius: 12px; }
      .actions { flex-direction: column; align-items: stretch; gap:8px; }
      .actions a { align-self: flex-start; }
    }
  `]
})
export class LoginComponent {
  userId = '';
  password = '';
  error: string | null = null;
  constructor(private auth: AuthService, private router: Router) {}
  login() {
    this.error = null;
    this.auth.login(this.userId.trim(), this.password).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (e) => this.error = e?.message || 'Échec de connexion'
    });
  }
  loginDemo() {
    this.error = null;
    this.auth.loginDemo().subscribe({ next: () => this.router.navigateByUrl('/dashboard'), error: e => this.error = e?.message || 'Échec' });
  }
}
