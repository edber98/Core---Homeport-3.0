import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { SpacingEditorComponent } from './spacing-editor.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'inspector-form-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzDividerModule, NzInputNumberModule,
    NzSwitchModule, NzCheckboxModule, NzIconModule, NzToolTipModule,
    SpacingEditorComponent
  ],
  templateUrl: './inspector-form-settings.component.html',
  styleUrls: ['./inspector-form-settings.component.scss']
})
export class InspectorFormSettingsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) group!: FormGroup;
  @Input() hasSections = false;
  
  formSpacing!: FormGroup;
  actionsSpacing!: FormGroup;
  buttonSpacing!: FormGroup;
  private subs: Subscription[] = [];

  ngOnInit(): void {
    // Create adapter groups using standard spacing control names
    this.formSpacing = this.createSpacingGroup('ui_form_');
    this.actionsSpacing = this.createSpacingGroup('ui_actions_');
    this.buttonSpacing = this.createSpacingGroup('ui_button_');

    // Two-way bind adapter groups with parent prefixed controls
    this.bindSpacing('ui_form_', this.formSpacing);
    this.bindSpacing('ui_actions_', this.actionsSpacing);
    this.bindSpacing('ui_button_', this.buttonSpacing);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private createSpacingGroup(prefix: string): FormGroup {
    const g = new FormGroup({
      m_top: new FormControl(this.group.get(`${prefix}m_top`)?.value),
      m_right: new FormControl(this.group.get(`${prefix}m_right`)?.value),
      m_bottom: new FormControl(this.group.get(`${prefix}m_bottom`)?.value),
      m_left: new FormControl(this.group.get(`${prefix}m_left`)?.value),
      p_top: new FormControl(this.group.get(`${prefix}p_top`)?.value),
      p_right: new FormControl(this.group.get(`${prefix}p_right`)?.value),
      p_bottom: new FormControl(this.group.get(`${prefix}p_bottom`)?.value),
      p_left: new FormControl(this.group.get(`${prefix}p_left`)?.value),
    });
    return g;
  }

  private bindSpacing(prefix: string, fg: FormGroup): void {
    // Child -> Parent updates
    this.subs.push(
      fg.valueChanges.subscribe(v => {
        try {
          this.group.get(`${prefix}m_top`)?.setValue(v.m_top, { emitEvent: false });
          this.group.get(`${prefix}m_right`)?.setValue(v.m_right, { emitEvent: false });
          this.group.get(`${prefix}m_bottom`)?.setValue(v.m_bottom, { emitEvent: false });
          this.group.get(`${prefix}m_left`)?.setValue(v.m_left, { emitEvent: false });
          this.group.get(`${prefix}p_top`)?.setValue(v.p_top, { emitEvent: false });
          this.group.get(`${prefix}p_right`)?.setValue(v.p_right, { emitEvent: false });
          this.group.get(`${prefix}p_bottom`)?.setValue(v.p_bottom, { emitEvent: false });
          this.group.get(`${prefix}p_left`)?.setValue(v.p_left, { emitEvent: false });
        } catch {}
      })
    );
    // Parent -> Child updates
    const parentCtrls = [
      `${prefix}m_top`, `${prefix}m_right`, `${prefix}m_bottom`, `${prefix}m_left`,
      `${prefix}p_top`, `${prefix}p_right`, `${prefix}p_bottom`, `${prefix}p_left`
    ];
    parentCtrls.forEach(name => {
      const c = this.group.get(name);
      if (!c) return;
      this.subs.push(c.valueChanges.subscribe(val => {
        const key: string = name.substring(prefix.length);
        if (fg.get(key)) fg.get(key as string)?.setValue(val, { emitEvent: false });
      }));
    });
  }
}
