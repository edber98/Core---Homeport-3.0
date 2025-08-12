// components/preview/preview.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { BuilderState } from '../../builder-state.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'df-preview',
  standalone: true,
  imports: [CommonModule, FormsModule,ReactiveFormsModule, NzInputModule, NzButtonModule],
  templateUrl: './preview.html'
})
export class Preview {
  code = '';
  constructor(public state: BuilderState) { this.refresh(); }
  refresh() { this.code = this.state.export(); }
  copy(txt: string) { navigator.clipboard?.writeText(txt); }
  import() {
    try {
      const parsed = JSON.parse(this.code);
      this.state.import(parsed);
    } catch { alert('JSON invalide'); }
  }
}
