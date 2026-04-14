import { Injectable } from '@angular/core';

/**
 * Unified widget export service.
 * Supports: JSON, CSV, SVG, PNG, PDF, XLSX.
 * Heavy deps (jspdf, html2canvas, xlsx) are dynamically imported only when needed.
 */
@Injectable({ providedIn: 'root' })
export class WidgetExportService {
  // ── Helpers ──

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private sanitizeFilename(name: string): string {
    return (name || 'export').replace(/[^a-z0-9\-_.]/gi, '_').slice(0, 80) || 'export';
  }

  // ── JSON ──

  exportAsJson(data: any, filename: string): void {
    const text = JSON.stringify(data ?? null, null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    this.triggerDownload(blob, this.sanitizeFilename(filename) + '.json');
  }

  // ── CSV ──

  exportAsCsv(rows: any[], columns: { key: string; label?: string }[], filename: string): void {
    const cols = columns?.length ? columns : this.inferColumns(rows);
    const header = cols.map(c => this.csvCell(c.label || c.key)).join(',');
    const body = (rows || []).map(r =>
      cols.map(c => this.csvCell(this.stringifyCell(r?.[c.key]))).join(',')
    ).join('\n');
    const csv = '\uFEFF' + header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    this.triggerDownload(blob, this.sanitizeFilename(filename) + '.csv');
  }

  private csvCell(v: string): string {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  private stringifyCell(v: any): string {
    if (v == null) return '';
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
    return String(v);
  }

  private inferColumns(rows: any[]): { key: string; label: string }[] {
    const keys = new Set<string>();
    (rows || []).forEach(r => { if (r && typeof r === 'object') Object.keys(r).forEach(k => keys.add(k)); });
    return Array.from(keys).map(k => ({ key: k, label: k }));
  }

  // ── SVG ──

  exportAsSvg(svg: string | SVGElement, filename: string): void {
    let src = typeof svg === 'string' ? svg : new XMLSerializer().serializeToString(svg);
    if (!src.includes('xmlns=')) {
      src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
    this.triggerDownload(blob, this.sanitizeFilename(filename) + '.svg');
  }

  // ── PNG ──

  /** Export SVG string or HTMLElement (via html2canvas) as PNG */
  async exportAsPng(source: string | SVGElement | HTMLElement, filename: string): Promise<void> {
    if (typeof source === 'string' || source instanceof SVGElement) {
      const svgStr = typeof source === 'string'
        ? source
        : new XMLSerializer().serializeToString(source);
      await this.svgToPng(svgStr, this.sanitizeFilename(filename) + '.png');
      return;
    }
    // HTMLElement via html2canvas
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(source as HTMLElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (blob) this.triggerDownload(blob, this.sanitizeFilename(filename) + '.png');
  }

  private async svgToPng(svgStr: string, filename: string): Promise<void> {
    if (!svgStr.includes('xmlns=')) {
      svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('SVG load failed'));
        img.src = url;
      });
      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 600;
      const canvas = document.createElement('canvas');
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D not available');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      const pngBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (pngBlob) this.triggerDownload(pngBlob, filename);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ── PDF ──

  /**
   * Export an HTMLElement to PDF (A4 portrait).
   * Uses html2canvas + jsPDF (lazy-loaded).
   */
  async exportAsPdf(element: HTMLElement, filename: string): Promise<void> {
    const [{ default: html2canvas }, jspdfMod] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const JsPDF = (jspdfMod as any).jsPDF || (jspdfMod as any).default;
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableW = pageWidth - 2 * margin;
    const imgH = (canvas.height * usableW) / canvas.width;
    if (imgH <= pageHeight - 2 * margin) {
      pdf.addImage(imgData, 'PNG', margin, margin, usableW, imgH);
    } else {
      // Multi-page: slice vertically
      const pageCanvasH = Math.floor((canvas.width * (pageHeight - 2 * margin)) / usableW);
      let y = 0;
      let first = true;
      while (y < canvas.height) {
        const sliceH = Math.min(pageCanvasH, canvas.height - y);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = sliceH;
        const sctx = slice.getContext('2d');
        if (!sctx) break;
        sctx.fillStyle = '#ffffff';
        sctx.fillRect(0, 0, slice.width, slice.height);
        sctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceData = slice.toDataURL('image/png');
        const sliceHmm = (sliceH * usableW) / canvas.width;
        if (!first) pdf.addPage();
        pdf.addImage(sliceData, 'PNG', margin, margin, usableW, sliceHmm);
        first = false;
        y += sliceH;
      }
    }
    pdf.save(this.sanitizeFilename(filename) + '.pdf');
  }

  // ── XLSX ──

  async exportAsXlsx(rows: any[], columns: { key: string; label?: string }[], filename: string): Promise<void> {
    const XLSX: any = await import('xlsx');
    const cols = columns?.length ? columns : this.inferColumns(rows);
    const header = cols.map(c => c.label || c.key);
    const data: any[][] = [header];
    (rows || []).forEach(r => {
      data.push(cols.map(c => this.stringifyCell(r?.[c.key])));
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, this.sanitizeFilename(filename) + '.xlsx');
  }

  // ── Clipboard helpers ──

  async copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
