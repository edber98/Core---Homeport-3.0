import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

@Component({
  selector: 'app-prefixed-spacing-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzInputNumberModule],
  templateUrl: './prefixed-spacing-editor.component.html',
  styleUrls: ['./spacing-editor.component.scss']
})
export class PrefixedSpacingEditorComponent {
  @Input({ required: true }) group!: FormGroup;
  @Input({ required: true }) prefix!: string; // e.g., 'ui_form_' -> ui_form_m_top, ui_form_p_left

  ctrl(name: string) { return `${this.prefix}${name}`; }
}
