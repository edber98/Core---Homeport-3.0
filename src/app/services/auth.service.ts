import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AccessControlService } from './access-control.service';

type ResetToken = { token: string; userId: string; exp: number };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private PWD_KEY = 'auth.passwords'; // map userId -> password (demo only)
  private TOK_KEY = 'auth.resetTokens'; // ResetToken[]
  private LOGGED_KEY = 'auth.loggedIn';

  loggedIn = signal<boolean>(false);

  constructor(private router: Router, private acl: AccessControlService) {
    this.ensureSeed();
    this.loggedIn.set(this.load<boolean>(this.LOGGED_KEY, false));
  }

  login(userId: string, password: string): Observable<boolean> {
    const pwds = this.load<Record<string, string>>(this.PWD_KEY, {});
    if (!pwds[userId]) return throwError(() => new Error('Utilisateur inconnu'));
    if ((pwds[userId] || '') !== (password || '')) return throwError(() => new Error('Mot de passe invalide'));
    this.acl.setCurrentUser(userId);
    this.loggedIn.set(true);
    this.save(this.LOGGED_KEY, true);
    return of(true);
  }
  loginDemo(): Observable<boolean> { return this.login('demo', 'demo'); }

  logout(): void {
    this.loggedIn.set(false);
    this.save(this.LOGGED_KEY, false);
    this.router.navigateByUrl('/login');
  }

  requestPasswordReset(userIdOrEmail: string): Observable<string> {
    const userId = (userIdOrEmail || '').trim().toLowerCase();
    const exists = this.userExists(userId);
    if (!exists) return throwError(() => new Error('Utilisateur introuvable'));
    const token = this.randToken();
    const list = this.load<ResetToken[]>(this.TOK_KEY, []);
    const exp = Date.now() + 1000 * 60 * 30; // 30 min
    list.push({ token, userId, exp });
    this.save(this.TOK_KEY, list);
    return of(token);
  }
  resetPassword(token: string, newPassword: string): Observable<boolean> {
    const list = this.load<ResetToken[]>(this.TOK_KEY, []);
    const idx = list.findIndex(t => t.token === token);
    if (idx < 0) return throwError(() => new Error('Lien invalide'));
    const item = list[idx];
    if (Date.now() > item.exp) return throwError(() => new Error('Lien expiré'));
    const pwds = this.load<Record<string, string>>(this.PWD_KEY, {});
    pwds[item.userId] = newPassword || '';
    this.save(this.PWD_KEY, pwds);
    list.splice(idx, 1);
    this.save(this.TOK_KEY, list);
    return of(true);
  }
  setPasswordAdmin(userId: string, newPassword: string): Observable<boolean> {
    const pwds = this.load<Record<string, string>>(this.PWD_KEY, {});
    pwds[userId] = newPassword || '';
    this.save(this.PWD_KEY, pwds);
    return of(true);
  }
  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<boolean> {
    const pwds = this.load<Record<string, string>>(this.PWD_KEY, {});
    if ((pwds[userId] || '') !== (currentPassword || '')) return throwError(() => new Error('Mot de passe actuel invalide'));
    pwds[userId] = newPassword || '';
    this.save(this.PWD_KEY, pwds);
    return of(true);
  }

  private ensureSeed() {
    const pwds = this.load<Record<string, string>>(this.PWD_KEY, null as any);
    if (!pwds) {
      const seed = { admin: 'admin', alice: 'password', demo: 'demo' } as Record<string, string>;
      this.save(this.PWD_KEY, seed);
    }
    // Also ensure demo user exists in ACL
    try {
      const users = this.acl.users();
      if (!users.find(u => u.id === 'demo')) {
        this.acl.addUser({ id: 'demo', name: 'Demo', role: 'member', workspaces: ['default'] }).subscribe();
      }
    } catch {}
  }

  private userExists(userId: string): boolean {
    try { return this.acl.users().some(u => u.id.toLowerCase() === userId); } catch { return false; }
  }
  private randToken(): string { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
  private save(key: string, val: any) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
  private load<T>(key: string, def: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : def; } catch { return def; } }

  resetAll(): Observable<boolean> {
    try {
      localStorage.removeItem(this.PWD_KEY);
      localStorage.removeItem(this.TOK_KEY);
      localStorage.removeItem(this.LOGGED_KEY);
      this.loggedIn.set(false);
      return of(true);
    } catch {
      return of(false);
    }
  }
}
