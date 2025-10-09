import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

@Component({
  selector: 'app-spacing-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzInputNumberModule],
  templateUrl: './spacing-editor.component.html',
  styleUrls: ['./spacing-editor.component.scss']
})
export class SpacingEditorComponent {
  @Input({ required: true }) group!: FormGroup;
}

