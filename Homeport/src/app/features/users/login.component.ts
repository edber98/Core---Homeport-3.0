import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AccessControlService } from '../../services/access-control.service';
import { SsoService } from '../../services/sso.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzButtonModule, NzIconModule, RouterModule],
  template: `
  <div class="login-container">
    <h1 class="login-title">Connexion</h1>
    <p class="login-subtitle">Accédez à votre espace de travail</p>

    <div class="sso-error" *ngIf="ssoError()">
      <span nz-icon nzType="warning" nzTheme="outline"></span>
      Connexion SSO échouée : {{ ssoError() }}
    </div>

    <button *ngIf="ssoEnabled()" nz-button nzType="primary" nzBlock nzSize="large"
            class="sso-btn" (click)="loginSso()" type="button">
      <span nz-icon nzType="safety-certificate" nzTheme="outline"></span>
      Se connecter avec SSO
    </button>

    <div *ngIf="ssoEnabled() && passwordAllowed()" class="sso-divider">
      <span>ou avec email/mot de passe</span>
    </div>

    <form *ngIf="passwordAllowed()" nz-form nzLayout="vertical" (ngSubmit)="login()">
      <nz-form-item>
        <nz-form-label>Adresse e-mail</nz-form-label>
        <nz-form-control>
          <input nz-input [(ngModel)]="userId" name="userId"
                 placeholder="admin&#64;acme.test" class="login-input" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Mot de passe</nz-form-label>
        <nz-form-control>
          <input nz-input type="password" [(ngModel)]="password" name="password"
                 placeholder="••••••••" class="login-input" />
        </nz-form-control>
      </nz-form-item>

      <a class="forgot-link" [routerLink]="'/forgot'">Mot de passe oublié ?</a>

      <button nz-button nzType="primary" nzBlock nzSize="large"
              class="login-btn" (click)="login()">
        Se connecter
      </button>

      <button nz-button nzBlock nzSize="large"
              class="demo-btn" (click)="loginDemo()" type="button">
        Accès démo
      </button>

      <div class="err" *ngIf="error">{{ error }}</div>

      <div class="demo-accounts">
        <div class="demo-label">Comptes de test</div>
        <div class="demo-chips">
          <span class="demo-chip" (click)="fillLogin('admin@acme.test','admin')">
            admin&#64;acme.test <span class="demo-chip-tag">ACME</span>
          </span>
          <span class="demo-chip" (click)="fillLogin('alice@acme.test','password')">
            alice&#64;acme.test <span class="demo-chip-tag">ACME</span>
          </span>
          <span class="demo-chip" (click)="fillLogin('demo@beta.test','demo')">
            demo&#64;beta.test <span class="demo-chip-tag">BETA</span>
          </span>
        </div>
      </div>
    </form>
  </div>
  `,
  styles: [`
    :host { display: block; }

    .login-container { }

    .login-title {
      margin: 0 0 4px;
      font-size: 26px;
      font-weight: 700;
      color: #111;
      letter-spacing: -0.02em;
    }

    .login-subtitle {
      margin: 0 0 28px;
      color: #6b7280;
      font-size: 14px;
    }

    /* Inputs with matching border-radius from logo aesthetic */
    .login-input {
      height: 46px;
      border-radius: 14px !important;
      font-size: 14px;
      padding: 0 16px;
      border-color: #e0e0e0;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .login-input:focus,
    .login-input:hover {
      border-color: #e61982 !important;
      box-shadow: 0 0 0 3px rgba(230, 25, 130, 0.08) !important;
    }

    .forgot-link {
      display: inline-block;
      margin-bottom: 20px;
      font-size: 13px;
      color: #e61982;
    }
    .forgot-link:hover { color: #c01470; }

    /* Primary login button */
    .login-btn {
      height: 46px !important;
      border-radius: 14px !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      background: #e61982 !important;
      border-color: #e61982 !important;
      color: #fff !important;
      box-shadow: 0 4px 14px rgba(230, 25, 130, 0.25);
      transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
    }
    .login-btn:hover {
      background: #d0167a !important;
      border-color: #d0167a !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(230, 25, 130, 0.3);
    }
    .login-btn:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(230, 25, 130, 0.2);
    }

    /* Demo button */
    .demo-btn {
      margin-top: 10px;
      height: 46px !important;
      border-radius: 14px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      background: #fff !important;
      border: 1.5px solid #e8e8e8 !important;
      color: #444 !important;
      transition: border-color 0.15s, background 0.15s;
    }
    .demo-btn:hover {
      border-color: #e61982 !important;
      color: #e61982 !important;
      background: #fdf2f8 !important;
    }

    .err {
      margin-top: 14px;
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      color: #b42318;
      font-size: 13px;
    }

    .demo-accounts {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }

    .demo-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .demo-chips { display: flex; flex-direction: column; gap: 6px; }

    .demo-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #fff;
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      font-size: 12px;
      color: #555;
      cursor: pointer;
      transition: all 0.15s;
    }
    .demo-chip:hover {
      background: #fdf2f8;
      border-color: #f9a8d4;
      color: #e61982;
    }

    .demo-chip-tag {
      margin-left: auto;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      letter-spacing: 0.03em;
    }
    .demo-chip:hover .demo-chip-tag {
      background: #fce7f3;
      color: #e61982;
    }

    @media (max-width: 480px) {
      .login-title { font-size: 22px; }
      .login-input { height: 42px; border-radius: 12px !important; }
      .login-btn, .demo-btn { height: 42px !important; border-radius: 12px !important; }
    }

    .sso-btn {
      height: 46px !important;
      border-radius: 14px !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      background: #1f2937 !important;
      border-color: #1f2937 !important;
      color: #fff !important;
      margin-bottom: 12px;
    }
    .sso-btn:hover { background: #111827 !important; border-color: #111827 !important; }
    .sso-btn span[nz-icon] { margin-right: 8px; }
    .sso-divider {
      text-align: center;
      margin: 12px 0;
      color: #9ca3af;
      font-size: 12px;
      position: relative;
    }
    .sso-divider::before, .sso-divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: calc(50% - 80px);
      height: 1px;
      background: #f0f0f0;
    }
    .sso-divider::before { left: 0; }
    .sso-divider::after { right: 0; }
    .sso-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b42318;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class LoginComponent implements OnInit {
  userId = '';
  password = '';
  error: string | null = null;

  ssoEnabled = signal(false);
  passwordAllowed = signal(true);
  ssoError = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private router: Router,
    private acl: AccessControlService,
    private sso: SsoService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    // Lit ?sso_error=... dans l'URL si redirect erreur depuis le backend
    const e = this.route.snapshot.queryParamMap.get('sso_error');
    if (e) this.ssoError.set(decodeURIComponent(e));

    this.sso.getStatus().subscribe({
      next: (s) => {
        this.ssoEnabled.set(!!s?.enabled);
        this.passwordAllowed.set(!!s?.passwordLoginAllowed);
      },
      // Si l'API status ne répond pas, on assume SSO désactivé et password OK
      error: () => { this.ssoEnabled.set(false); this.passwordAllowed.set(true); },
    });
  }

  loginSso() {
    this.ssoError.set(null);
    this.sso.start('/dashboard');
  }
  login() {
    this.error = null;
    this.auth.login(this.userId.trim(), this.password).subscribe({
      next: () => this.afterLogin(),
      error: (e) => this.error = e?.message || 'Échec de connexion'
    });
  }
  loginDemo() {
    this.error = null;
    this.auth.loginDemo().subscribe({ next: () => this.afterLogin(), error: e => this.error = e?.message || 'Échec' });
  }
  fillLogin(email: string, pwd: string) {
    this.userId = email;
    this.password = pwd;
  }
  private afterLogin() {
    // If backend mode, multiple workspaces, and no saved preference → show picker
    if (environment.useBackend) {
      const ws = this.acl.workspaces();
      const hasPreference = !!this.acl.currentWorkspaceId();
      if (ws.length > 1 && !hasPreference) {
        this.router.navigateByUrl('/workspace-picker');
        return;
      }
    }
    this.router.navigateByUrl('/dashboard');
  }
}
