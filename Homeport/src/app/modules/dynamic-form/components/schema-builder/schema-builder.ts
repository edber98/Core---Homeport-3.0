import { Component, forwardRef, OnInit, OnDestroy, AfterViewInit, inject, ViewChild, ViewContainerRef, ComponentRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FormSchema } from '../../dynamic-form.service';

const ACTIVE_SESSION_KEY = 'schema_builder.active_session';

@Component({
  selector: 'df-schema-builder',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzToolTipModule],
  templateUrl: './schema-builder.html',
  styleUrls: ['./schema-builder.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SchemaBuilderComponent),
    multi: true,
  }],
})
export class SchemaBuilderComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy {
  formSchema: FormSchema | null = null;

  @ViewChild('previewContainer', { read: ViewContainerRef }) previewContainer!: ViewContainerRef;
  private previewRef: ComponentRef<any> | null = null;

  private onChange: (val: FormSchema | null) => void = () => {};
  private onTouched: () => void = () => {};
  private router = inject(Router);
  private sessionKey: string | null = null;
  private routerSub: Subscription | null = null;
  private viewReady = false;
  private recoveredFromSession = false;

  get fieldCount(): number {
    if (!this.formSchema?.fields) return 0;
    return this.formSchema.fields.filter((f: any) => f.key && f.type !== 'textblock' && f.type !== 'section' && f.type !== 'section_array').length;
  }

  ngOnInit(): void {
    this.tryRecoverSession();

    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.tryRecoverSession();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.formSchema) {
      setTimeout(() => this.renderPreview());
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.destroyPreview();
  }

  /** Try to recover schema from a completed form builder session */
  private tryRecoverSession(): void {
    const activeSession = this.sessionKey || localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!activeSession) return;
    try {
      const raw = localStorage.getItem('formbuilder.session.' + activeSession);
      if (raw) {
        const schema = JSON.parse(raw);
        // Accept FormSchema with fields OR steps
        if (schema && typeof schema === 'object' && (Array.isArray(schema.fields) || Array.isArray(schema.steps))) {
          this.formSchema = schema;
          this.emitChange();
          if (this.viewReady) {
            setTimeout(() => this.renderPreview());
          }
        }
        this.recoveredFromSession = true;
        // Cleanup
        localStorage.removeItem('formbuilder.session.' + activeSession);
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        this.sessionKey = null;
      }
    } catch {}
  }

  /** Check if there's a pending session that hasn't been recovered yet */
  private hasPendingSession(): boolean {
    const activeSession = this.sessionKey || localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!activeSession) return false;
    try {
      const raw = localStorage.getItem('formbuilder.session.' + activeSession);
      return !!raw;
    } catch { return false; }
  }

  emitChange(): void {
    this.onChange(this.formSchema ? JSON.parse(JSON.stringify(this.formSchema)) : null);
    this.onTouched();
  }

  openFormBuilder(): void {
    try {
      const session = 'sb_' + Date.now().toString(36);
      this.sessionKey = session;
      // Persist session key so it survives component destruction during navigation
      localStorage.setItem(ACTIVE_SESSION_KEY, session);
      const schema = this.formSchema || {
        title: 'Schéma',
        ui: { layout: 'vertical', labelsOnTop: true },
        fields: []
      };
      // Store schema in localStorage (not in URL to avoid length issues)
      localStorage.setItem('formbuilder.session.' + session, JSON.stringify(schema));
      // Build return URL that includes flow/node context so the flow builder can reopen the dialog
      const currentUrl = this.router.url || '';
      const flowMatch = currentUrl.match(/[?&]flow=([^&]+)/);
      const flowId = flowMatch ? flowMatch[1] : '';
      const nodeId = (() => { try { return localStorage.getItem('flow_builder.editing_node') || ''; } catch { return ''; } })();
      let returnTo: string;
      if (flowId) {
        // Build a return URL with sbSession so the flow builder reopens the node dialog
        const params: any = { flow: flowId, sbSession: session };
        if (nodeId) params.node = nodeId;
        returnTo = this.router.createUrlTree(['/flow-builder', 'editor'], { queryParams: params }).toString();
      } else {
        returnTo = currentUrl;
      }
      // Also store return context in localStorage as fallback (in case URL params get lost)
      localStorage.setItem('formbuilder.return.' + session, returnTo);
      this.router.navigate(['/dynamic-form'], {
        queryParams: {
          session,
          return: returnTo,
          tplPreset: '1'
        }
      });
    } catch {}
  }

  private async renderPreview(): Promise<void> {
    this.destroyPreview();
    if (!this.formSchema || !this.viewReady || !this.previewContainer) return;
    try {
      // Dynamic import to avoid circular dependency (DynamicForm -> Fields -> SchemaBuilder)
      const { DynamicForm } = await import('../../dynamic-form');
      this.previewRef = this.previewContainer.createComponent(DynamicForm);
      this.previewRef.instance.schema = this.formSchema;
      this.previewRef.instance.hideActions = true;
      this.previewRef.instance.disableExpressions = true;
    } catch {}
  }

  private destroyPreview(): void {
    if (this.previewRef) {
      this.previewRef.destroy();
      this.previewRef = null;
    }
  }

  // ControlValueAccessor
  writeValue(val: any): void {
    // If we just recovered from a session, skip writeValue to avoid overwriting
    if (this.recoveredFromSession) {
      this.recoveredFromSession = false;
      return;
    }
    // If there's a pending session recovery (form builder saved but tryRecoverSession hasn't run yet), attempt recovery now
    if (this.hasPendingSession()) {
      this.tryRecoverSession();
      if (this.recoveredFromSession) {
        this.recoveredFromSession = false;
        return;
      }
    }
    if (val && typeof val === 'object' && !Array.isArray(val) && (Array.isArray(val.fields) || Array.isArray(val.steps))) {
      // Full FormSchema
      this.formSchema = val;
    } else if (Array.isArray(val) && val.length) {
      // Legacy: convert SchemaField[] to FormSchema
      this.formSchema = {
        title: 'Schéma',
        ui: { layout: 'vertical', labelsOnTop: true },
        fields: val.map((f: any) => ({
          type: this.mapToFormFieldType(f.type),
          key: f.key || '',
          label: f.label || '',
          col: { xs: 24 }
        }))
      } as FormSchema;
    } else {
      this.formSchema = null;
    }
    if (this.viewReady) {
      setTimeout(() => this.renderPreview());
    }
  }

  private mapToFormFieldType(type: string): string {
    switch (type) {
      case 'text': return 'text';
      case 'number': return 'number';
      case 'boolean': return 'checkbox';
      case 'date': return 'date';
      case 'array':
      case 'text_array':
      case 'number_array':
        return 'tags';
      default: return 'text';
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
}
