import { Injectable } from '@angular/core';
import { AppProvider } from '../../services/catalog.service';

export interface PaletteGroup {
  title: string;
  items: any[];
  appId?: string;
  appColor?: string;
  appIconClass?: string;
  appIconUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class FlowPaletteService {
  // Map NodeTemplate list to palette display items
  toPaletteItems(tpls: any[]): any[] {
    const out: any[] = [];
    for (const t of (tpls || [])) {
      try {
        const label = (t && (t.title || t.name)) ? (t.title || t.name) : (t?.id || 'Node');
        const template: any = { ...t };
        // Normalize optional UI/compat fields
        if (t?.app && t.app._id && !template.appId) template.appId = t.app._id;
        if (t?.icon) template.icon = t.icon;
        if (t?.subtitle) template.subtitle = t.subtitle;
        if ((t as any).output_array_field) template.output_array_field = (t as any).output_array_field;
        out.push({ label, template });
      } catch { }
    }
    return out;
  }

  // Build stable palette groups filtered by query and grouped by app provider
  buildGroups(items: any[], query: string, appsMap: Map<string, AppProvider>): PaletteGroup[] {
    try {
      const q = (query || '').trim().toLowerCase();
      const out: PaletteGroup[] = [];
      const byApp = new Map<string, any[]>();
      const ensure = (key: string) => { if (!byApp.has(key)) byApp.set(key, []); return byApp.get(key)!; };
      for (const it of (items || [])) {
        const tpl = it?.template || {};
        const appId = String(((tpl as any)?.appId || (tpl as any)?.app?._id || '')).trim();
        const app = appId ? appsMap.get(appId) : undefined;
        if (q) {
          const tags = ((tpl as any)?.tags || []).join(' ');
          const hay = `${it?.label || ''} ${tpl?.title || ''} ${tpl?.subtitle || ''} ${tpl?.category || ''} ${app?.name || ''} ${app?.title || ''} ${appId} ${tags}`.toLowerCase();
          if (!hay.includes(q)) continue;
        }
        const key = appId || '';
        ensure(key).push(it);
      }
      const appKeys = Array.from(byApp.keys()).sort((a, b) => a.localeCompare(b));
      for (const key of appKeys) {
        const app = key ? appsMap.get(key) : undefined;
        const title = app ? (app.title || app.name || app.id) : 'Sans App';
        out.push({ title, items: byApp.get(key)!, appId: key || undefined, appColor: app?.color, appIconClass: app?.iconClass, appIconUrl: app?.iconUrl });
      }
      return out;
    } catch { return []; }
  }
}

