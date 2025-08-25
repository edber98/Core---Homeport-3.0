import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private KEY = 'auth.jwtToken';
  private USER_KEY = 'auth.user';

  tokenSig = signal<string | null>(null);
  userSig = signal<any | null>(null);

  constructor() {
    const t = this.read<string>(this.KEY);
    const u = this.read<any>(this.USER_KEY);
    this.tokenSig.set(t);
    this.userSig.set(u);
  }

  get token(): string | null { return this.tokenSig(); }
  setToken(token: string | null) {
    this.tokenSig.set(token);
    this.write(this.KEY, token);
  }

  get user(): any | null { return this.userSig(); }
  setUser(user: any | null) {
    this.userSig.set(user);
    this.write(this.USER_KEY, user);
  }

  clear() { this.setToken(null); this.setUser(null); }

  private write(key: string, val: any) {
    try { if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
  private read<T>(key: string): T | null {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
  }
}
