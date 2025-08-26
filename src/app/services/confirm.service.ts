import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ConfirmRequest = {
  id: string;
  title: string;
  content: string;
  okText?: string;
  cancelText?: string;
  className?: string;
  width?: number;
  centered?: boolean;
};

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private requests = new Subject<ConfirmRequest>();
  private waiters = new Map<string, (v: boolean) => void>();

  get requests$() { return this.requests.asObservable(); }

  ask(opts: Omit<ConfirmRequest, 'id'>): Promise<boolean> {
    const id = 'cf_' + Math.random().toString(36).slice(2, 9);
    const req: ConfirmRequest = { id, title: opts.title, content: opts.content, okText: opts.okText, cancelText: opts.cancelText, className: opts.className, width: opts.width, centered: opts.centered };
    return new Promise<boolean>((resolve) => {
      this.waiters.set(id, resolve);
      this.requests.next(req);
    });
  }

  resolve(id: string, value: boolean) {
    const w = this.waiters.get(id);
    if (w) {
      this.waiters.delete(id);
      try { w(value); } catch {}
    }
  }
}

