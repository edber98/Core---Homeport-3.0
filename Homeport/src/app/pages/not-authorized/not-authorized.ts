import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'page-not-authorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="na-page">
    <div class="card">
      <div class="icon" aria-hidden="true">⛔</div>
      <h1>Accès refusé</h1>
      <p>Vous n'avez pas les droits pour accéder à cette page.</p>
      <a routerLink="/dashboard" class="btn">Retour au dashboard</a>
    </div>
  </div>
  `,
  styles: [`
    .na-page { padding: 40px 12px; display:flex; justify-content:center; }
    .card { width: 100%; max-width: 560px; text-align:center; background:#fff; border:1px solid #ececec; border-radius:16px; padding:24px; }
    .icon { font-size: 42px; margin-bottom: 8px; }
    h1 { margin: 0 0 6px; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    p { color:#6b7280; margin: 0 0 12px; }
    .btn { display:inline-block; padding: 8px 12px; border-radius: 10px; border:1px solid #e5e7eb; color:#111; text-decoration: none; }
    .btn:hover { background-image: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); }
  `]
})
export class NotAuthorizedPage {}

