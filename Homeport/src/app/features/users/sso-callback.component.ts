import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthTokenService } from '../../services/auth-token.service';
import { AccessControlService } from '../../services/access-control.service';
import { ProfileBackendService } from '../profile/profile-backend.service';

// Page atteinte après le redirect du backend `/api/auth/sso/callback`.
// L'URL contient ?token=<JWT Kinn>&redirect=<path>. Cette page stocke le token,
// fetch /api/me pour hydrater l'ACL, puis navigue vers le redirect cible.
@Component({
  selector: 'app-sso-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sso-callback">
      <div class="sso-card">
        <div class="sso-spinner"></div>
        <h2>Connexion SSO en cours…</h2>
        <p *ngIf="!error()">Récupération de ton profil…</p>
        <div *ngIf="error()" class="sso-error">
          <p>Connexion échouée</p>
          <code>{{ error() }}</code>
          <button (click)="goLogin()">Retour au login</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sso-callback { display: flex; min-height: 100vh; align-items: center; justify-content: center; background: #fafafa; }
    .sso-card { background: #fff; padding: 32px 40px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); text-align: center; max-width: 380px; }
    .sso-spinner { width: 38px; height: 38px; border: 3px solid #f0f0f0; border-top-color: #e61982; border-radius: 50%; margin: 0 auto 20px; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sso-card h2 { font-size: 18px; font-weight: 600; margin: 0 0 6px; color: #111; }
    .sso-card p { color: #6b7280; font-size: 13px; }
    .sso-error code { display: block; background: #fef2f2; color: #b42318; padding: 10px; border-radius: 8px; font-size: 12px; margin: 12px 0; word-break: break-word; }
    .sso-error button { background: #e61982; color: #fff; border: none; padding: 10px 18px; border-radius: 12px; font-size: 13px; cursor: pointer; }
  `],
})
export class SsoCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tokens = inject(AuthTokenService);
  private acl = inject(AccessControlService);
  private profileBackend = inject(ProfileBackendService);

  error = signal<string | null>(null);

  ngOnInit() {
    const qp = this.route.snapshot.queryParamMap;
    const token = qp.get('token') || '';
    const redirect = qp.get('redirect') || '/dashboard';
    const ssoError = qp.get('sso_error');

    if (ssoError) {
      this.error.set(ssoError);
      return;
    }
    if (!token) {
      this.error.set('Aucun token reçu');
      return;
    }

    // 1. Stocke le token
    this.tokens.setToken(token);

    // 2. Fetch /api/me pour hydrater l'ACL avec workspaces + role
    this.profileBackend.me().subscribe({
      next: (me) => {
        try {
          this.tokens.setUser({
            id: me.id,
            email: me.email,
            role: me.role,
            companyId: me.companyId,
          });
          this.acl.initFromLogin({
            user: { id: me.id, email: me.email, role: me.role, companyId: me.companyId },
            workspaces: (me.workspaces || []).map((w: any) => ({
              id: w.id, name: w.name, isDefault: w.isDefault, role: w.role,
            })),
            defaultWorkspaceId: me.defaultWorkspaceId || (me.workspaces?.[0]?.id),
          });
        } catch (e: any) {
          this.error.set(e?.message || 'init ACL failed');
          return;
        }
        // 3. Redirect
        this.router.navigateByUrl(redirect);
      },
      error: (e) => this.error.set(e?.message || '/api/me failed'),
    });
  }

  goLogin() { this.router.navigateByUrl('/login'); }
}
