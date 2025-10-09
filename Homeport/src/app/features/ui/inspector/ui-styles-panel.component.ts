import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiNode } from '../ui-model.service';
import { UiTokensService } from '../services/ui-tokens.service';
import { UiValidationService } from '../services/ui-validation.service';
import { UiLenComponent } from './ui-len.component';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';

type Bp = 'auto'|'xs'|'sm'|'md'|'lg'|'xl';

@Component({
  selector: 'ui-styles-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, UiLenComponent, NzInputModule, NzSelectModule, NzColorPickerModule],
  template: `
  <div class="styles-panel">
    <div class="panel-heading"><div class="card-title"><div class="t">Styles</div><div class="s">Secteurs</div></div></div>

    <!-- Layout -->
    <details class="sec">
      <summary>Layout</summary>
      <div class="sec-body">
      <div class="grid2">
        <div [class.conflict]="hasConflict('display')" [attr.data-tip]="conflictTip('display')">
          <label class="lbl">Display</label>
          <nz-select [ngModel]="style.display" (ngModelChange)="set('display', $event)" nzAllowClear nzPlaceHolder="default">
            <nz-option nzValue="none" nzLabel="none"></nz-option>
            <nz-option nzValue="block" nzLabel="block"></nz-option>
            <nz-option nzValue="inline" nzLabel="inline"></nz-option>
            <nz-option nzValue="inline-block" nzLabel="inline-block"></nz-option>
            <nz-option nzValue="flex" nzLabel="flex"></nz-option>
            <nz-option nzValue="grid" nzLabel="grid"></nz-option>
          </nz-select>
        </div>
        <div [class.conflict]="hasConflict('position')" [attr.data-tip]="conflictTip('position')">
          <label class="lbl">Position</label>
          <nz-select [ngModel]="style.position" (ngModelChange)="set('position', $event)" nzAllowClear nzPlaceHolder="static">
            <nz-option nzValue="relative" nzLabel="relative"></nz-option>
            <nz-option nzValue="absolute" nzLabel="absolute"></nz-option>
            <nz-option nzValue="fixed" nzLabel="fixed"></nz-option>
            <nz-option nzValue="sticky" nzLabel="sticky"></nz-option>
          </nz-select>
        </div>
      </div>
      <details class="subsec">
        <summary>Offsets</summary>
        <div class="grid4">
          <div [class.conflict]="hasConflict('top')" [attr.data-tip]="conflictTip('top')"><label class="lbl">Top</label><ui-len [value]="style.top" (valueChange)="set('top', $event)"></ui-len></div>
          <div [class.conflict]="hasConflict('right')" [attr.data-tip]="conflictTip('right')"><label class="lbl">Right</label><ui-len [value]="style.right" (valueChange)="set('right', $event)"></ui-len></div>
          <div [class.conflict]="hasConflict('bottom')" [attr.data-tip]="conflictTip('bottom')"><label class="lbl">Bottom</label><ui-len [value]="style.bottom" (valueChange)="set('bottom', $event)"></ui-len></div>
          <div [class.conflict]="hasConflict('left')" [attr.data-tip]="conflictTip('left')"><label class="lbl">Left</label><ui-len [value]="style.left" (valueChange)="set('left', $event)"></ui-len></div>
        </div>
      </details>
      <div class="grid3">
        <div [class.conflict]="hasConflict('zIndex')" [attr.data-tip]="conflictTip('zIndex')"><label class="lbl">Z-index</label><input nz-input type="number" [ngModel]="style['zIndex']" (ngModelChange)="set('zIndex', numOrUndefined($event))"></div>
        <div [class.conflict]="hasConflict('overflow')" [attr.data-tip]="conflictTip('overflow')">
          <label class="lbl">Overflow</label>
          <nz-select [ngModel]="style.overflow" (ngModelChange)="set('overflow', $event)" nzAllowClear nzPlaceHolder="visible">
            <nz-option nzValue="hidden" nzLabel="hidden"></nz-option>
            <nz-option nzValue="auto" nzLabel="auto"></nz-option>
            <nz-option nzValue="scroll" nzLabel="scroll"></nz-option>
          </nz-select>
        </div>
        <div [class.conflict]="hasConflict('cursor')" [attr.data-tip]="conflictTip('cursor')">
          <label class="lbl">Cursor</label>
          <nz-select [ngModel]="style.cursor" (ngModelChange)="set('cursor', $event)" nzAllowClear nzPlaceHolder="default">
            <nz-option nzValue="pointer" nzLabel="pointer"></nz-option>
            <nz-option nzValue="grab" nzLabel="grab"></nz-option>
            <nz-option nzValue="move" nzLabel="move"></nz-option>
            <nz-option nzValue="text" nzLabel="text"></nz-option>
            <nz-option nzValue="not-allowed" nzLabel="not-allowed"></nz-option>
          </nz-select>
        </div>
      </div>
      <div class="row small">
        <label><input type="checkbox" [checked]="style.display==='none'" (change)="toggleHideBp($event.target.checked)"> Hide at this breakpoint</label>
        <button class="mini" (click)="resetSection(['display','position','top','right','bottom','left','zIndex','overflow','cursor'])">Reset</button>
      </div>
      </div>
    </details>

    <!-- Flex -->
    <details class="sec">
      <summary>Flex</summary>
      <div class="sec-body">
      <div class="grid3">
        <div>
          <label class="lbl">Direction</label>
          <nz-select [ngModel]="style.flexDirection" (ngModelChange)="set('flexDirection', $event)" nzAllowClear nzPlaceHolder="row">
            <nz-option nzValue="row" nzLabel="row"></nz-option>
            <nz-option nzValue="column" nzLabel="column"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Wrap</label>
          <nz-select [ngModel]="style.flexWrap" (ngModelChange)="set('flexWrap', $event)" nzAllowClear nzPlaceHolder="nowrap">
            <nz-option nzValue="wrap" nzLabel="wrap"></nz-option>
            <nz-option nzValue="wrap-reverse" nzLabel="wrap-reverse"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Gap</label>
          <ui-len [value]="style.gap" (valueChange)="set('gap', $event)"></ui-len>
        </div>
      </div>
      <div class="grid3">
        <div>
          <label class="lbl">Justify</label>
          <nz-select [ngModel]="style.justifyContent" (ngModelChange)="set('justifyContent', $event)" nzAllowClear nzPlaceHolder="flex-start">
            <nz-option nzValue="flex-start" nzLabel="flex-start"></nz-option>
            <nz-option nzValue="center" nzLabel="center"></nz-option>
            <nz-option nzValue="space-between" nzLabel="space-between"></nz-option>
            <nz-option nzValue="space-around" nzLabel="space-around"></nz-option>
            <nz-option nzValue="space-evenly" nzLabel="space-evenly"></nz-option>
            <nz-option nzValue="flex-end" nzLabel="flex-end"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Align items</label>
          <nz-select [ngModel]="style.alignItems" (ngModelChange)="set('alignItems', $event)" nzAllowClear nzPlaceHolder="stretch">
            <nz-option nzValue="stretch" nzLabel="stretch"></nz-option>
            <nz-option nzValue="flex-start" nzLabel="flex-start"></nz-option>
            <nz-option nzValue="center" nzLabel="center"></nz-option>
            <nz-option nzValue="flex-end" nzLabel="flex-end"></nz-option>
            <nz-option nzValue="baseline" nzLabel="baseline"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Align content</label>
          <nz-select [ngModel]="style.alignContent" (ngModelChange)="set('alignContent', $event)" nzAllowClear nzPlaceHolder="normal">
            <nz-option nzValue="stretch" nzLabel="stretch"></nz-option>
            <nz-option nzValue="flex-start" nzLabel="flex-start"></nz-option>
            <nz-option nzValue="center" nzLabel="center"></nz-option>
            <nz-option nzValue="flex-end" nzLabel="flex-end"></nz-option>
            <nz-option nzValue="space-between" nzLabel="space-between"></nz-option>
            <nz-option nzValue="space-around" nzLabel="space-around"></nz-option>
          </nz-select>
        </div>
      </div>
      <div class="grid3">
        <div><label class="lbl">Order</label><input nz-input type="number" [ngModel]="style.order" (ngModelChange)="set('order', numOrUndefined($event))"></div>
        <div><label class="lbl">Flex grow</label><input nz-input type="number" [ngModel]="style.flexGrow" (ngModelChange)="set('flexGrow', numOrUndefined($event))"></div>
        <div><label class="lbl">Flex shrink</label><input nz-input type="number" [ngModel]="style.flexShrink" (ngModelChange)="set('flexShrink', numOrUndefined($event))"></div>
      </div>
      <div>
        <label class="lbl">Flex basis</label>
        <ui-len [value]="style.flexBasis" (valueChange)="set('flexBasis', $event)"></ui-len>
      </div>
      <div class="row small">
        <button class="mini" (click)="applyFlexPreset('centered')">Preset: Centered</button>
        <button class="mini" (click)="applyFlexPreset('between')">Preset: Space-between</button>
        <button class="mini" (click)="resetSection(['flexDirection','flexWrap','gap','justifyContent','alignItems','alignContent','order','flexGrow','flexShrink','flexBasis'])">Reset</button>
      </div>
      </div>
    </details>

    <!-- Size & Spacing -->
    <details class="sec">
      <summary>Size & Spacing</summary>
      <div class="sec-body">
      <div class="grid3">
        <div [class.conflict]="hasConflict('width')" [attr.data-tip]="conflictTip('width')"><label class="lbl">Width</label><ui-len [value]="style.width" (valueChange)="set('width', $event)"></ui-len></div>
        <div><label class="lbl">Min-W</label><ui-len [value]="style.minWidth" (valueChange)="set('minWidth', $event)"></ui-len></div>
        <div><label class="lbl">Max-W</label><ui-len [value]="style.maxWidth" (valueChange)="set('maxWidth', $event)"></ui-len></div>
      </div>
      <div class="grid3">
        <div [class.conflict]="hasConflict('height')" [attr.data-tip]="conflictTip('height')"><label class="lbl">Height</label><ui-len [value]="style.height" (valueChange)="set('height', $event)"></ui-len></div>
        <div><label class="lbl">Min-H</label><ui-len [value]="style.minHeight" (valueChange)="set('minHeight', $event)"></ui-len></div>
        <div><label class="lbl">Max-H</label><ui-len [value]="style.maxHeight" (valueChange)="set('maxHeight', $event)"></ui-len></div>
      </div>
      <details class="subsec">
        <summary>
          <span>Margin</span>
          <label class="link"><input type="checkbox" [(ngModel)]="link.margin"> Link all</label>
        </summary>
        <div class="grid4">
          <div [class.conflict]="hasConflict('marginTop')" [attr.data-tip]="conflictTip('marginTop')"><label class="lbl">Top</label><ui-len [value]="style.marginTop" (valueChange)="set4('marginTop', $event, 'margin')"></ui-len></div>
          <div><label class="lbl">Right</label><ui-len [value]="style.marginRight" (valueChange)="set('marginRight', $event)"></ui-len></div>
          <div><label class="lbl">Bottom</label><ui-len [value]="style.marginBottom" (valueChange)="set('marginBottom', $event)"></ui-len></div>
          <div><label class="lbl">Left</label><ui-len [value]="style.marginLeft" (valueChange)="set('marginLeft', $event)"></ui-len></div>
        </div>
      </details>
      <details class="subsec">
        <summary>
          <span>Padding</span>
          <label class="link"><input type="checkbox" [(ngModel)]="link.padding"> Link all</label>
        </summary>
        <div class="grid4">
          <div [class.conflict]="hasConflict('paddingTop')" [attr.data-tip]="conflictTip('paddingTop')"><label class="lbl">Top</label><ui-len [value]="style.paddingTop" (valueChange)="set4('paddingTop', $event, 'padding')"></ui-len></div>
          <div><label class="lbl">Right</label><ui-len [value]="style.paddingRight" (valueChange)="set('paddingRight', $event)"></ui-len></div>
          <div><label class="lbl">Bottom</label><ui-len [value]="style.paddingBottom" (valueChange)="set('paddingBottom', $event)"></ui-len></div>
          <div><label class="lbl">Left</label><ui-len [value]="style.paddingLeft" (valueChange)="set('paddingLeft', $event)"></ui-len></div>
        </div>
      </details>
      <div class="grid2">
        <div>
          <label class="lbl">Box sizing</label>
          <nz-select [ngModel]="style.boxSizing" (ngModelChange)="set('boxSizing', $event)" nzAllowClear nzPlaceHolder="content-box">
            <nz-option nzValue="border-box" nzLabel="border-box"></nz-option>
          </nz-select>
        </div>
        <div class="row small">
          <button class="mini" (click)="resetSection(['width','minWidth','maxWidth','height','minHeight','maxHeight','marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','boxSizing'])">Reset</button>
        </div>
      </div>
      </div>
    </details>

    <!-- Typography -->
    <details class="sec">
      <summary>Typography</summary>
      <div class="sec-body">
      <div class="grid2">
        <div>
          <label class="lbl">Font family</label>
          <input nz-input [ngModel]="style.fontFamily" (ngModelChange)="set('fontFamily', $event)" placeholder="Inter, system-ui, -apple-system"/>
        </div>
        <div>
          <label class="lbl">Font weight</label>
          <nz-select [ngModel]="style.fontWeight" (ngModelChange)="set('fontWeight', $event)" nzAllowClear nzPlaceHolder="normal">
            <nz-option *ngFor="let w of [100,200,300,400,500,600,700,800,900]" [nzValue]="w" [nzLabel]="''+w"></nz-option>
          </nz-select>
        </div>
      </div>
      <div class="grid3">
        <div><label class="lbl">Font size</label><ui-len [value]="style.fontSize" defaultUnit="rem" (valueChange)="set('fontSize', $event)"></ui-len></div>
        <div><label class="lbl">Line height</label><ui-len [value]="style.lineHeight" defaultUnit="em" (valueChange)="set('lineHeight', $event)"></ui-len></div>
        <div><label class="lbl">Letter spacing</label><ui-len [value]="style.letterSpacing" defaultUnit="em" (valueChange)="set('letterSpacing', $event)"></ui-len></div>
      </div>
      <div class="grid3">
        <div>
          <label class="lbl">Text align</label>
          <nz-select [ngModel]="style.textAlign" (ngModelChange)="set('textAlign', $event)" nzAllowClear nzPlaceHolder="left">
            <nz-option nzValue="left" nzLabel="left"></nz-option>
            <nz-option nzValue="center" nzLabel="center"></nz-option>
            <nz-option nzValue="right" nzLabel="right"></nz-option>
            <nz-option nzValue="justify" nzLabel="justify"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Transform</label>
          <nz-select [ngModel]="style.textTransform" (ngModelChange)="set('textTransform', $event)" nzAllowClear nzPlaceHolder="none">
            <nz-option nzValue="capitalize" nzLabel="capitalize"></nz-option>
            <nz-option nzValue="uppercase" nzLabel="uppercase"></nz-option>
            <nz-option nzValue="lowercase" nzLabel="lowercase"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Decoration</label>
          <nz-select [ngModel]="style.textDecoration" (ngModelChange)="set('textDecoration', $event)" nzAllowClear nzPlaceHolder="none">
            <nz-option nzValue="underline" nzLabel="underline"></nz-option>
            <nz-option nzValue="line-through" nzLabel="line-through"></nz-option>
          </nz-select>
        </div>
      </div>
      <div class="grid2">
        <div>
          <label class="lbl">Color</label>
          <div class="row">
            <nz-color-picker [nzValue]="colorValue(style.color)" (nzOnChange)="onColorChange('color', $event)" nzAllowClear (nzOnClear)="set('color', undefined)"></nz-color-picker>
            <nz-select [ngModel]="style.color" (ngModelChange)="set('color', $event)" nzAllowClear nzPlaceHolder="token">
              <nz-option *ngFor="let kv of tokenEntries | keyvalue" [nzValue]="kv.key" [nzLabel]="kv.key"></nz-option>
            </nz-select>
          </div>
        </div>
        <div>
          <label class="lbl">White-space</label>
          <nz-select [ngModel]="style.whiteSpace" (ngModelChange)="set('whiteSpace', $event)" nzAllowClear nzPlaceHolder="normal">
            <nz-option nzValue="nowrap" nzLabel="nowrap"></nz-option>
            <nz-option nzValue="pre" nzLabel="pre"></nz-option>
            <nz-option nzValue="pre-wrap" nzLabel="pre-wrap"></nz-option>
          </nz-select>
        </div>
      </div>
      <div class="grid2">
        <div>
          <label class="lbl">Word break</label>
          <nz-select [ngModel]="style.wordBreak" (ngModelChange)="set('wordBreak', $event)" nzAllowClear nzPlaceHolder="normal">
            <nz-option nzValue="break-word" nzLabel="break-word"></nz-option>
            <nz-option nzValue="break-all" nzLabel="break-all"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Hyphens</label>
          <nz-select [ngModel]="style.hyphens" (ngModelChange)="set('hyphens', $event)" nzAllowClear nzPlaceHolder="manual">
            <nz-option nzValue="auto" nzLabel="auto"></nz-option>
            <nz-option nzValue="none" nzLabel="none"></nz-option>
          </nz-select>
        </div>
      </div>
      <div class="row small">
        <button class="mini" (click)="applyTypePreset('body')">Preset: Body</button>
        <button class="mini" (click)="applyTypePreset('heading')">Preset: Heading</button>
        <button class="mini" (click)="resetSection(['fontFamily','fontWeight','fontSize','lineHeight','letterSpacing','textAlign','textTransform','textDecoration','color','whiteSpace','wordBreak','hyphens'])">Reset</button>
      </div>
      </div>
    </details>

    <!-- F. Backgrounds (basic single layer) -->
    <details class="sec">
      <summary>Background</summary>
      <div class="sec-body">
      <div class="grid2">
        <div>
          <label class="lbl">Background color</label>
          <div class="row">
            <nz-color-picker [nzValue]="colorValue(style.backgroundColor)" (nzOnChange)="onColorChange('backgroundColor', $event)" nzAllowClear (nzOnClear)="set('backgroundColor', undefined)"></nz-color-picker>
            <nz-select [ngModel]="style.backgroundColor" (ngModelChange)="set('backgroundColor', $event)" nzAllowClear nzPlaceHolder="token">
              <nz-option *ngFor="let kv of tokenEntries | keyvalue" [nzValue]="kv.key" [nzLabel]="kv.key"></nz-option>
            </nz-select>
          </div>
        </div>
        <div>
          <label class="lbl">Background image</label>
          <input nz-input placeholder="url(...) or gradient(...)" [ngModel]="style.backgroundImage" (ngModelChange)="set('backgroundImage', $event)"/>
        </div>
      </div>
      <div class="grid3">
        <div>
          <label class="lbl">Position</label>
          <nz-select [ngModel]="style.backgroundPosition" (ngModelChange)="set('backgroundPosition', $event)" nzAllowClear nzPlaceHolder="center">
            <nz-option *ngFor="let p of ['top left','top center','top right','center left','center','center right','bottom left','bottom center','bottom right']" [nzValue]="p" [nzLabel]="p"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Size</label>
          <nz-select [ngModel]="style.backgroundSize" (ngModelChange)="set('backgroundSize', $event)" nzAllowClear nzPlaceHolder="auto">
            <nz-option nzValue="cover" nzLabel="cover"></nz-option>
            <nz-option nzValue="contain" nzLabel="contain"></nz-option>
          </nz-select>
        </div>
        <div>
          <label class="lbl">Repeat</label>
          <nz-select [ngModel]="style.backgroundRepeat" (ngModelChange)="set('backgroundRepeat', $event)" nzAllowClear nzPlaceHolder="repeat">
            <nz-option nzValue="no-repeat" nzLabel="no-repeat"></nz-option>
            <nz-option nzValue="repeat-x" nzLabel="repeat-x"></nz-option>
            <nz-option nzValue="repeat-y" nzLabel="repeat-y"></nz-option>
          </nz-select>
        </div>
      </div>
      <div class="row small">
        <button class="mini" (click)="resetSection(['backgroundColor','backgroundImage','backgroundPosition','backgroundSize','backgroundRepeat','backgroundAttachment'])">Reset</button>
      </div>
      </div>
    </details>

    <!-- Borders & Radius -->
    <details class="sec">
      <summary>Borders & Radius</summary>
      <div class="sec-body">
      <div class="grid4">
        <div><label class="lbl">Top</label><input nz-input placeholder="e.g. 1px solid #e5e7eb" [ngModel]="style.borderTop" (ngModelChange)="set('borderTop', $event)"></div>
        <div><label class="lbl">Right</label><input nz-input [ngModel]="style.borderRight" (ngModelChange)="set('borderRight', $event)"></div>
        <div><label class="lbl">Bottom</label><input nz-input [ngModel]="style.borderBottom" (ngModelChange)="set('borderBottom', $event)"></div>
        <div><label class="lbl">Left</label><input nz-input [ngModel]="style.borderLeft" (ngModelChange)="set('borderLeft', $event)"></div>
      </div>
      <details class="subsec">
        <summary>
          <span>Radius</span>
          <label class="link"><input type="checkbox" [(ngModel)]="link.radius"> Link all</label>
        </summary>
        <div class="grid4">
          <div><label class="lbl">TL</label><ui-len [value]="style.borderTopLeftRadius" (valueChange)="set4('borderTopLeftRadius', $event, 'radius')"></ui-len></div>
          <div><label class="lbl">TR</label><ui-len [value]="style.borderTopRightRadius" (valueChange)="set('borderTopRightRadius', $event)"></ui-len></div>
          <div><label class="lbl">BR</label><ui-len [value]="style.borderBottomRightRadius" (valueChange)="set('borderBottomRightRadius', $event)"></ui-len></div>
          <div><label class="lbl">BL</label><ui-len [value]="style.borderBottomLeftRadius" (valueChange)="set('borderBottomLeftRadius', $event)"></ui-len></div>
        </div>
      </details>
      <div class="row small">
        <button class="mini" (click)="resetSection(['borderTop','borderRight','borderBottom','borderLeft','borderRadius','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'])">Reset</button>
      </div>
      </div>
    </details>

    <!-- H. Effects -->
    <details class="sec">
      <summary>Effects</summary>
      <div class="sec-body">
      <div>
        <label class="lbl">Box shadow</label>
        <input nz-input placeholder="e.g. 0 10px 30px rgba(0,0,0,.12)" [ngModel]="style.boxShadow" (ngModelChange)="set('boxShadow', $event)" />
      </div>
      <div class="grid3">
        <div><label class="lbl">Filter: blur(px)</label><ui-len [value]="filter.blur" (valueChange)="updateFilter('blur', $event)"></ui-len></div>
        <div><label class="lbl">Brightness %</label><input nz-input type="number" [ngModel]="filter.brightness" (ngModelChange)="updateFilter('brightness', numOrUndefined($event))"></div>
        <div><label class="lbl">Contrast %</label><input nz-input type="number" [ngModel]="filter.contrast" (ngModelChange)="updateFilter('contrast', numOrUndefined($event))"></div>
      </div>
      <div class="grid3">
        <div><label class="lbl">Opacity</label><input nz-input type="number" min="0" max="1" step="0.05" [ngModel]="style.opacity" (ngModelChange)="set('opacity', clamp01($event))"></div>
        <div>
          <label class="lbl">Blend mode</label>
          <nz-select [ngModel]="style.mixBlendMode" (ngModelChange)="set('mixBlendMode', $event)" nzAllowClear nzPlaceHolder="normal">
            <nz-option *ngFor="let m of ['multiply','screen','overlay','darken','lighten']" [nzValue]="m" [nzLabel]="m"></nz-option>
          </nz-select>
        </div>
      </div>
      <div class="row small"><button class="mini" (click)="resetSection(['boxShadow','filter','opacity','mixBlendMode'])">Reset</button></div>
      </div>
    </details>

    <!-- I. Transforms (2D basic) -->
    <details class="sec">
      <summary>Transforms</summary>
      <div class="sec-body">
      <div class="grid3">
        <div><label class="lbl">Translate X</label><ui-len [value]="transform.tx" (valueChange)="updateTransform('tx', $event)"></ui-len></div>
        <div><label class="lbl">Translate Y</label><ui-len [value]="transform.ty" (valueChange)="updateTransform('ty', $event)"></ui-len></div>
        <div><label class="lbl">Rotate (deg)</label><input nz-input type="number" [ngModel]="transform.r" (ngModelChange)="updateTransform('r', numOrUndefined($event))"></div>
      </div>
      <div class="grid3">
        <div><label class="lbl">Scale X</label><input nz-input type="number" step="0.05" [ngModel]="transform.sx" (ngModelChange)="updateTransform('sx', numOrUndefined($event))"></div>
        <div><label class="lbl">Scale Y</label><input nz-input type="number" step="0.05" [ngModel]="transform.sy" (ngModelChange)="updateTransform('sy', numOrUndefined($event))"></div>
        <div><label class="lbl">Skew X (deg)</label><input nz-input type="number" [ngModel]="transform.skx" (ngModelChange)="updateTransform('skx', numOrUndefined($event))"></div>
      </div>
      <div class="row small"><button class="mini" (click)="resetTransform()">Reset</button></div>
      </div>
    </details>

    <!-- J. Transitions -->
    <details class="sec">
      <summary>Transitions</summary>
      <div class="sec-body">
      <div class="list">
        <div class="row item" *ngFor="let t of transitions; let i = index">
          <nz-select [(ngModel)]="t.prop" (ngModelChange)="commitTransitions()" style="min-width:140px">
            <nz-option *ngFor="let p of ['all','opacity','transform','background-color','color']" [nzValue]="p" [nzLabel]="p"></nz-option>
          </nz-select>
          <input nz-input type="number" min="0" placeholder="duration (ms)" [(ngModel)]="t.d" (ngModelChange)="commitTransitions()"/>
          <input nz-input type="number" min="0" placeholder="delay (ms)" [(ngModel)]="t.delay" (ngModelChange)="commitTransitions()"/>
          <nz-select [(ngModel)]="t.ease" (ngModelChange)="commitTransitions()" style="min-width:170px">
            <nz-option *ngFor="let e of ['ease','linear','ease-in','ease-out','ease-in-out','cubic-bezier(0.4,0,0.2,1)']" [nzValue]="e" [nzLabel]="e"></nz-option>
          </nz-select>
          <button class="mini" (click)="removeTransition(i)">×</button>
        </div>
      </div>
      <div class="row small"><button class="mini" (click)="addTransition()">+ Add transition</button><button class="mini" (click)="resetSection(['transition'])">Reset</button></div>
      </div>
    </details>
  </div>
  `,
  styles: [`
  .styles-panel { }
  .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
  details.sec { background:transparent; padding:8px 0 10px; margin-bottom:0px; border-bottom: 1px solid #f0f0f0; }
  details.subsec { padding:6px 0 8px; margin:2px 0 4px; }
  details, details.subsec, details.sec { border:none; border-radius:0; }
  summary { cursor:pointer; font-weight:600; color:#64748b; font-size:12px; padding:6px 0; }
  /* When a section is open, give the summary extra bottom spacing */
  details.sec[open] > summary { margin-bottom: 10px; }
  /* Animated collapse: keep body in flow and animate height */
  details.sec > .sec-body { display:block; overflow:hidden; max-height:0; transition:max-height 220ms ease; will-change: max-height; }
  details.sec[open] > .sec-body { max-height: 2000px; }
  details.subsec > summary { display:flex; align-items:center; justify-content:space-between; color:#334155; font-weight:600; }
  /* Keep native carets visible */
  .lbl { display:block; font-size:12px; color:#64748b; margin-bottom:4px; }
  /* Let Ant Design style inputs/selects; keep compact sizing */
  /* Let Ant Design control sizing */
  input, select { width:100%; max-width:100%; }
  .row { display:flex; gap:8px; align-items:center; }
  .row.between { justify-content:space-between; }
  .row.small { margin-top:8px; }
  .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:6px; }
  .grid3 { display:grid; grid-template-columns: 1fr 1fr; gap:6px; }
  .grid4 { display:grid; grid-template-columns: 1fr 1fr; gap:6px; }
  .list .row.item { flex-wrap: wrap; gap:6px; }
  .list .row.item > * { flex: 1 1 120px; }
  .sub { font-weight:600; font-size:12px; color:#111; }
  .mini { font-size:12px; padding:3px 6px; border:1px solid #e5e7eb; background:#fff; border-radius:0; cursor:pointer; }
  .item select, .item input { width:auto; }
  :host ::ng-deep .ant-select { width:100%; }
  .linkrow { align-items:center; margin-top:8px; }
  .link { font-size:12px; color:#64748b; }
  /* Conflict marker */
  .conflict input[nz-input], .conflict :host ::ng-deep .ant-select-selector { border-color: #ec4899 !important; box-shadow: 0 0 0 2px rgba(236,72,153,.15); }
  .conflict { position: relative; }
  .conflict:hover::after { content: attr(data-tip); position:absolute; left: 0; top: -28px; white-space: pre-wrap; max-width: 420px; background: #fce7f3; color:#9d174d; border:1px solid #f9a8d4; padding:6px 8px; border-radius:8px; font-size:12px; z-index: 20; }
  `]
})
export class UiStylesPanelComponent {
  @Input() node: UiNode | null = null;
  @Input() bp: Bp = 'auto';
  @Output() patch = new EventEmitter<Partial<UiNode>>();

  constructor(public tokens: UiTokensService, private validation: UiValidationService) {}

  // Sections are now native <details>; no manual open state tracking
  link = { margin: false, padding: false, radius: false };

  get tokenEntries() { return this.tokens.tokens; }

  ngOnChanges() { this.readTransform(); this.readFilter(); this.readTransitions(); }

  get style(): any { return this.getStyleTarget(); }
  private getStyleTarget(): Record<string, any> {
    if (!this.node) return {};
    if (this.bp && this.bp !== 'auto') { return (this.node.styleBp?.[this.bp] || {}) as any; }
    return this.node.style || {};
  }
  private emitStyle(obj: Record<string, any>) {
    if (this.bp && this.bp !== 'auto') {
      const styleBp = { ...(this.node?.styleBp || {}) } as any;
      styleBp[this.bp] = obj;
      this.patch.emit({ styleBp });
    } else {
      this.patch.emit({ style: obj });
    }
  }
  set(k: string, v: any) {
    const base = this.getStyleTarget();
    const obj = { ...base } as any;
    if (v == null || v === '' || (typeof v === 'number' && Number.isNaN(v))) delete obj[k]; else obj[k] = v;
    this.emitStyle(obj);
  }
  set4(k: string, v: any, group: 'margin'|'padding'|'radius') {
    if (group === 'margin' && this.link.margin) {
      this.set('marginTop', v); this.set('marginRight', v); this.set('marginBottom', v); this.set('marginLeft', v); return;
    }
    if (group === 'padding' && this.link.padding) {
      this.set('paddingTop', v); this.set('paddingRight', v); this.set('paddingBottom', v); this.set('paddingLeft', v); return;
    }
    if (group === 'radius' && this.link.radius) {
      this.set('borderTopLeftRadius', v); this.set('borderTopRightRadius', v); this.set('borderBottomRightRadius', v); this.set('borderBottomLeftRadius', v); return;
    }
    this.set(k, v);
  }
  resetSection(keys: string[]) {
    const base = this.getStyleTarget();
    const obj = { ...base } as any;
    for (const k of keys) delete obj[k];
    this.emitStyle(obj);
  }
  toggleHideBp(hide: boolean) {
    this.set('display', hide ? 'none' : undefined);
  }

  // Validation & collisions
  hasConflict(prop: string): boolean {
    if (!this.node) return false;
    const inline = (this.bp && this.bp !== 'auto') ? (this.node.styleBp?.[this.bp] || {}) : (this.node.style || {});
    if (!inline || !Object.prototype.hasOwnProperty.call(inline, prop)) return false;
    const list = this.validation.collisionClassesFor(this.node, prop, 'base', this.bp as any);
    return list.length > 0;
  }
  conflictTip(prop: string): string {
    if (!this.node) return '';
    const list = this.validation.collisionClassesFor(this.node, prop, 'base', this.bp as any);
    if (!list.length) return '';
    return `Propriété aussi définie par:\n` + list.join(', ');
  }

  // Helpers
  numOrUndefined(v: any): number | undefined { const n = Number(v); return Number.isFinite(n) ? n : undefined; }
  clamp01(v: any): number | undefined { const n = Number(v); if (!Number.isFinite(n)) return undefined; return Math.max(0, Math.min(1, n)); }
  colorValue(v: string | undefined): string { if (!v) return '#000000'; if (v.startsWith('--')) { return this.tokens.tokens[v] || '#000000'; } return v; }
  onColorChange(prop: string, ev: any) {
    const payload = ev && ev.color ? ev.color : ev;
    let val: string | undefined;
    try {
      if (payload && typeof (payload as any).toHexString === 'function') val = (payload as any).toHexString();
      else if (typeof payload === 'string') val = payload;
    } catch {}
    this.set(prop as string, val);
  }

  // Flex presets
  applyFlexPreset(kind: 'centered'|'between') {
    if (kind === 'centered') {
      this.set('display','flex'); this.set('justifyContent','center'); this.set('alignItems','center');
    } else {
      this.set('display','flex'); this.set('justifyContent','space-between'); this.set('alignItems','center');
    }
  }

  // === Transforms ===
  transform: { tx?: string; ty?: string; r?: number; sx?: number; sy?: number; skx?: number } = {};
  private readTransform() {
    const t = this.style.transform as string | undefined;
    this.transform = { tx: undefined, ty: undefined, r: undefined, sx: undefined, sy: undefined, skx: undefined };
    if (!t) return;
    const m = (re: RegExp) => t.match(re)?.[1];
    const tx = m(/translateX\(([^)]+)\)/); const ty = m(/translateY\(([^)]+)\)/);
    const r = m(/rotate\(([^)]+)deg\)/); const sx = m(/scaleX\(([^)]+)\)/); const sy = m(/scaleY\(([^)]+)\)/);
    const skx = m(/skewX\(([^)]+)deg\)/);
    if (tx) this.transform.tx = tx; if (ty) this.transform.ty = ty; if (r) this.transform.r = Number(r);
    if (sx) this.transform.sx = Number(sx); if (sy) this.transform.sy = Number(sy); if (skx) this.transform.skx = Number(skx);
  }
  private writeTransform() {
    const parts: string[] = [];
    if (this.transform.tx) parts.push(`translateX(${this.transform.tx})`);
    if (this.transform.ty) parts.push(`translateY(${this.transform.ty})`);
    if (this.transform.r != null) parts.push(`rotate(${this.transform.r}deg)`);
    if (this.transform.sx != null) parts.push(`scaleX(${this.transform.sx})`);
    if (this.transform.sy != null) parts.push(`scaleY(${this.transform.sy})`);
    if (this.transform.skx != null) parts.push(`skewX(${this.transform.skx}deg)`);
    const val = parts.join(' ');
    this.set('transform', val || undefined);
  }
  updateTransform(k: keyof UiStylesPanelComponent['transform'], v: any) {
    (this.transform as any)[k] = v == null || v === '' ? undefined : v;
    this.writeTransform();
  }
  resetTransform() { this.transform = {}; this.set('transform', undefined); }

  // === Filter ===
  filter: { blur?: string; brightness?: number; contrast?: number } = {};
  private readFilter() {
    const f = this.style.filter as string | undefined; this.filter = {};
    if (!f) return;
    const m = (re: RegExp) => f.match(re)?.[1];
    const blur = m(/blur\(([^)]+)\)/); const br = m(/brightness\(([^)]+)%\)/); const ct = m(/contrast\(([^)]+)%\)/);
    if (blur) this.filter.blur = blur; if (br) this.filter.brightness = Number(br); if (ct) this.filter.contrast = Number(ct);
  }
  private writeFilter() {
    const parts: string[] = [];
    if (this.filter.blur) parts.push(`blur(${this.filter.blur})`);
    if (this.filter.brightness != null) parts.push(`brightness(${this.filter.brightness}%)`);
    if (this.filter.contrast != null) parts.push(`contrast(${this.filter.contrast}%)`);
    const val = parts.join(' ');
    this.set('filter', val || undefined);
  }
  updateFilter(k: keyof UiStylesPanelComponent['filter'], v: any) { (this.filter as any)[k] = v == null || v === '' ? undefined : v; this.writeFilter(); }

  // === Transitions ===
  transitions: Array<{ prop: string; d: number; delay: number; ease: string }> = [];
  private readTransitions() {
    const tr = (this.style.transition || '').toString().trim();
    this.transitions = [];
    if (!tr) return;
    // very simple split by comma
    const parts = tr.split(',').map((s: string) => s.trim()).filter(Boolean);
    for (const p of parts) {
      const tokens = p.split(/\s+/);
      const [prop, dur, easeOrDelay, maybeDelay] = tokens as any;
      let d = 200, delay = 0, ease = 'ease';
      if (dur && dur.endsWith('ms')) d = Number(dur.replace('ms',''));
      if (maybeDelay && maybeDelay.endsWith('ms')) { delay = Number(maybeDelay.replace('ms','')); ease = easeOrDelay || 'ease'; }
      else if (easeOrDelay && easeOrDelay.endsWith('ms')) { delay = Number(easeOrDelay.replace('ms','')); }
      else if (easeOrDelay) { ease = easeOrDelay; }
      this.transitions.push({ prop: prop || 'all', d, delay, ease });
    }
  }
  commitTransitions() {
    const str = this.transitions.map(t => `${t.prop} ${Math.max(0,t.d)}ms ${t.ease} ${Math.max(0,t.delay)}ms`).join(', ');
    this.set('transition', str || undefined);
  }
  addTransition() { this.transitions = [...this.transitions, { prop: 'all', d: 200, delay: 0, ease: 'ease' }]; this.commitTransitions(); }
  removeTransition(i: number) { this.transitions.splice(i,1); this.commitTransitions(); }

  // Type presets
  applyTypePreset(kind: 'body'|'heading') {
    if (kind === 'body') {
      this.set('fontSize','1rem'); this.set('lineHeight','1.6'); this.set('fontWeight', undefined);
    } else {
      this.set('fontSize','2rem'); this.set('lineHeight','1.2'); this.set('fontWeight','700');
    }
  }
}

// UiLenComponent moved to its own file: ui-len.component.ts
