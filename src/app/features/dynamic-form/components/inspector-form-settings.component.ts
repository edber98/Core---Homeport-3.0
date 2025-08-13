import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { PrefixedSpacingEditorComponent } from './prefixed-spacing-editor.component';

@Component({
  selector: 'inspector-form-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzDividerModule, NzInputNumberModule,
    NzSwitchModule, NzCheckboxModule, NzIconModule, NzToolTipModule,
    PrefixedSpacingEditorComponent
  ],
  templateUrl: './inspector-form-settings.component.html'
})
export class InspectorFormSettingsComponent {
  @Input({ required: true }) group!: FormGroup;
  @Input() hasSections = false;
}

