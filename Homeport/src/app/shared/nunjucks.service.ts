import { Injectable } from '@angular/core';
import nunjucks from 'nunjucks';

@Injectable({ providedIn: 'root' })
export class NunjucksService {
  private env: nunjucks.Environment;
  constructor(){
    this.env = new nunjucks.Environment(undefined as any, { autoescape: true });
    this.env.addFilter('json', (v: any) => {
      try { return JSON.stringify(v, null, 2); } catch { return String(v); }
    });
  }
  renderString(tpl: string, ctx: any): string {
    try { return this.env.renderString(String(tpl||''), ctx || {}); } catch { return ''; }
  }
}

