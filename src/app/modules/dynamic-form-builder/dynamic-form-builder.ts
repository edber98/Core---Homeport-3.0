import { Component } from '@angular/core';
// modules/dynamic-form-builder/dynamic-form-builder.ts

import { CommonModule } from '@angular/common';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Palette } from './components/palette/palette';
import { Canvas } from './components/canvas/canvas';
import { Inspector } from './components/inspector/inspector';
import { Preview } from './components/preview/preview';

@Component({
  selector: 'app-dynamic-form-builder',
  imports: [CommonModule, NzGridModule, NzCardModule, NzButtonModule, Palette, Canvas, Inspector, Preview],

  templateUrl: './dynamic-form-builder.html',
  styleUrl: './dynamic-form-builder.scss'
})
export class DynamicFormBuilder {

}
