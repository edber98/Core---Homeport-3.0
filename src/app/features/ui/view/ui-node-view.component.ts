import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiNode } from '../ui-model.service';
import { Component as NgComponent } from '@angular/core';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { UiClassStyleService, UiState } from '../services/ui-class-style.service';
import { UiBreakpoint } from '../services/ui-breakpoints.service';
import { UiApplyStylesDirective } from '../directives/apply-styles.directive';

@Component({
  selector: 'ui-node-view',
  standalone: true,
  imports: [CommonModule, NzTabsModule, NzCollapseModule, NzStepsModule, UiApplyStylesDirective],
  template: `
  <ng-container [ngSwitch]="node.tag">
    <span *ngSwitchCase="'#text'">{{ node.text }}</span>
    <div *ngSwitchCase="'div'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <div class="hover-actions" (click)="$event.stopPropagation()">
        <button title="Ajouter dedans" (click)="addInside.emit(node.id)">
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </button>
        <button title="Monter" (click)="$event.stopPropagation()"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5l6 6H6l6-6z" fill="currentColor"/></svg></button>
        <button title="Descendre" (click)="$event.stopPropagation()"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 19l-6-6h12l-6 6z" fill="currentColor"/></svg></button>
        <button title="Supprimer" (click)="remove.emit(node.id)">
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6 7h12M9 7V5h6v2m-8 3v9m4-9v9m4-9v9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </button>
      </div>
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </div>
    <section *ngSwitchCase="'section'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <div class="hover-actions" (click)="$event.stopPropagation()">
        <button title="Ajouter dedans" (click)="addInside.emit(node.id)"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
        <button title="Monter" (click)="$event.stopPropagation()"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5l6 6H6l6-6z" fill="currentColor"/></svg></button>
        <button title="Descendre" (click)="$event.stopPropagation()"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 19l-6-6h12l-6 6z" fill="currentColor"/></svg></button>
        <button title="Supprimer" (click)="remove.emit(node.id)"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M6 7h12M9 7V5h6v2m-8 3v9m4-9v9m4-9v9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
      </div>
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </section>
    <main *ngSwitchCase="'main'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <div class="hover-actions" (click)="$event.stopPropagation()">
        <button title="Ajouter dedans" (click)="addInside.emit(node.id)"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
        <button title="Monter" (click)="$event.stopPropagation()"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5l6 6H6l6-6z" fill="currentColor"/></svg></button>
        <button title="Descendre" (click)="$event.stopPropagation()"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 19l-6-6h12l-6 6z" fill="currentColor"/></svg></button>
        <button title="Supprimer" (click)="remove.emit(node.id)"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M6 7h12M9 7V5h6v2m-8 3v9m4-9v9m4-9v9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
      </div>
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </main>
    <header *ngSwitchCase="'header'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <div class="hover-actions" (click)="$event.stopPropagation()">
        <button title="Ajouter dedans" (click)="addInside.emit(node.id)"><i class="fa-solid fa-plus"></i></button>
        <button title="Supprimer" (click)="remove.emit(node.id)"><i class="fa-regular fa-trash-can"></i></button>
      </div>
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </header>
    <footer *ngSwitchCase="'footer'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <div class="hover-actions" (click)="$event.stopPropagation()">
        <button title="Ajouter dedans" (click)="addInside.emit(node.id)"><i class="fa-solid fa-plus"></i></button>
        <button title="Supprimer" (click)="remove.emit(node.id)"><i class="fa-regular fa-trash-can"></i></button>
      </div>
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </footer>
    <h1 *ngSwitchCase="'h1'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else h1Txt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #h1Txt>{{ node.text }}</ng-template>
    </h1>
    <h2 *ngSwitchCase="'h2'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else h2Txt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #h2Txt>{{ node.text }}</ng-template>
    </h2>
    <h3 *ngSwitchCase="'h3'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else h3Txt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #h3Txt>{{ node.text }}</ng-template>
    </h3>
    <h4 *ngSwitchCase="'h4'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else h4Txt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #h4Txt>{{ node.text }}</ng-template>
    </h4>
    <h5 *ngSwitchCase="'h5'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else h5Txt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #h5Txt>{{ node.text }}</ng-template>
    </h5>
    <h6 *ngSwitchCase="'h6'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else h6Txt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #h6Txt>{{ node.text }}</ng-template>
    </h6>
    <p *ngSwitchCase="'p'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else pTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #pTxt>{{ node.text }}</ng-template>
    </p>
    <span *ngSwitchCase="'span'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else spanTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #spanTxt>{{ node.text }}</ng-template>
    </span>
    <label *ngSwitchCase="'label'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else labelTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #labelTxt>{{ node.text }}</ng-template>
    </label>
    <strong *ngSwitchCase="'strong'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else strongTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #strongTxt>{{ node.text }}</ng-template>
    </strong>
    <b *ngSwitchCase="'b'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else bTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #bTxt>{{ node.text }}</ng-template>
    </b>
    <em *ngSwitchCase="'em'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else emTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #emTxt>{{ node.text }}</ng-template>
    </em>
    <i *ngSwitchCase="'i'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else iTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #iTxt>{{ node.text }}</ng-template>
    </i>
    <u *ngSwitchCase="'u'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else uTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #uTxt>{{ node.text }}</ng-template>
    </u>
    <button *ngSwitchCase="'button'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)">{{ node.text || 'Button' }}</button>
    <input *ngSwitchCase="'input'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)"
      [attr.type]="node.attrs?.['type'] || 'text'" [attr.value]="node.attrs?.['value']" [attr.placeholder]="node.attrs?.['placeholder']"
      [attr.name]="node.attrs?.['name']" [attr.disabled]="node.attrs?.['disabled'] ? true : null" [attr.required]="node.attrs?.['required'] ? true : null" />
    <img *ngSwitchCase="'img'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)" [attr.src]="node.attrs?.['src']" [attr.alt]="node.attrs?.['alt']" />
    <a *ngSwitchCase="'a'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" [attr.href]="node.attrs?.['href']" (click)="$event.preventDefault(); onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </a>
    <aside *ngSwitchCase="'aside'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </aside>
    <nav *ngSwitchCase="'nav'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)" class="ui-node" [attr.aria-label]="node.attrs?.['aria-label']">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </nav>
    <article *ngSwitchCase="'article'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </article>
    <figure *ngSwitchCase="'figure'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </figure>
    <figcaption *ngSwitchCase="'figcaption'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)">{{ node.text }}</figcaption>
    <pre *ngSwitchCase="'pre'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)">{{ node.text }}</pre>
    <code *ngSwitchCase="'code'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)">{{ node.text }}</code>
    <blockquote *ngSwitchCase="'blockquote'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </blockquote>
    <hr *ngSwitchCase="'hr'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)"/>
    <ol *ngSwitchCase="'ol'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </ol>
    <dl *ngSwitchCase="'dl'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </dl>
    <dt *ngSwitchCase="'dt'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">{{ node.text }}</dt>
    <dd *ngSwitchCase="'dd'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">{{ node.text }}</dd>
    <form *ngSwitchCase="'form'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)" [attr.action]="node.attrs?.['action']" [attr.method]="node.attrs?.['method']">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </form>
    <fieldset *ngSwitchCase="'fieldset'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </fieldset>
    <legend *ngSwitchCase="'legend'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)">{{ node.text }}</legend>
    <select *ngSwitchCase="'select'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)">
      <option *ngFor="let c of node.children" [selected]="c.attrs?.['selected'] ? true : null">{{ c.text }}</option>
    </select>
    <table *ngSwitchCase="'table'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </table>
    <caption *ngSwitchCase="'caption'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">{{ node.text }}</caption>
    <thead *ngSwitchCase="'thead'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children"><ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view></ng-container>
    </thead>
    <tbody *ngSwitchCase="'tbody'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children"><ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view></ng-container>
    </tbody>
    <tfoot *ngSwitchCase="'tfoot'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <ng-container *ngFor="let c of node.children"><ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view></ng-container>
    </tfoot>
    <colgroup *ngSwitchCase="'colgroup'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngFor="let c of node.children"><ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view></ng-container>
    </colgroup>
    <col *ngSwitchCase="'col'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" [attr.span]="node.attrs?.['span']" [attr.width]="node.attrs?.['width']" />
    <tr *ngSwitchCase="'tr'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngFor="let c of node.children"><ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view></ng-container>
    </tr>
    <th *ngSwitchCase="'th'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" [attr.scope]="node.attrs?.['scope']">
      <ng-container *ngIf="(node.children?.length||0) > 0; else thTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #thTxt>{{ node.text }}</ng-template>
    </th>
    <td *ngSwitchCase="'td'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else tdTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #tdTxt>{{ node.text }}</ng-template>
    </td>
    <svg *ngSwitchCase="'svg'" [attr.width]="node.attrs?.['width']" [attr.height]="node.attrs?.['height']" [attr.viewBox]="node.attrs?.['viewBox']" [attr.fill]="node.attrs?.['fill']" [attr.stroke]="node.attrs?.['stroke']" [ngStyle]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngFor="let c of node.children">
        <rect *ngIf="c.tag==='rect'" [attr.x]="c.attrs?.['x']" [attr.y]="c.attrs?.['y']" [attr.width]="c.attrs?.['width']" [attr.height]="c.attrs?.['height']" [attr.rx]="c.attrs?.['rx']" [attr.ry]="c.attrs?.['ry']" [attr.fill]="c.attrs?.['fill']"></rect>
        <path *ngIf="c.tag==='path'" [attr.d]="c.attrs?.['d']" [attr.fill]="c.attrs?.['fill']" [attr.stroke]="c.attrs?.['stroke']" [attr.stroke-width]="c.attrs?.['stroke-width']" [attr.stroke-linecap]="c.attrs?.['stroke-linecap']"></path>
        <circle *ngIf="c.tag==='circle'" [attr.cx]="c.attrs?.['cx']" [attr.cy]="c.attrs?.['cy']" [attr.r]="c.attrs?.['r']" [attr.fill]="c.attrs?.['fill']"></circle>
        <line *ngIf="c.tag==='line'" [attr.x1]="c.attrs?.['x1']" [attr.y1]="c.attrs?.['y1']" [attr.x2]="c.attrs?.['x2']" [attr.y2]="c.attrs?.['y2']" [attr.stroke]="c.attrs?.['stroke']"></line>
        <polyline *ngIf="c.tag==='polyline'" [attr.points]="c.attrs?.['points']" [attr.stroke]="c.attrs?.['stroke']" [attr.fill]="c.attrs?.['fill']"></polyline>
        <polygon *ngIf="c.tag==='polygon'" [attr.points]="c.attrs?.['points']" [attr.stroke]="c.attrs?.['stroke']" [attr.fill]="c.attrs?.['fill']"></polygon>
        <g *ngIf="c.tag==='g'">
          <ng-container *ngFor="let gc of c.children">
            <path *ngIf="gc.tag==='path'" [attr.d]="gc.attrs?.['d']"></path>
          </ng-container>
        </g>
        <text *ngIf="c.tag==='text'">{{ c.text }}</text>
      </ng-container>
    </svg>
    <textarea *ngSwitchCase="'textarea'" [class.selected]="selected" [ngClass]="classList" [ngStyle]="effectiveStyle" (click)="onClick($event)" [disabled]="true">{{ node.text }}</textarea>
    <ul *ngSwitchCase="'ul'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <div class="hover-actions" (click)="$event.stopPropagation()">
        <button title="Ajouter dedans" (click)="addInside.emit(node.id)"><i class="fa-solid fa-plus"></i></button>
        <button title="Supprimer" (click)="remove.emit(node.id)"><i class="fa-regular fa-trash-can"></i></button>
      </div>
      <li *ngFor="let c of node.children" [class.selected]="c.id===selectedId" (click)="$event.stopPropagation(); select.emit(c.id)">{{ c.text || 'item' }}</li>
    </ul>
    <li *ngSwitchCase="'li'" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <ng-container *ngIf="(node.children?.length||0) > 0; else liTxt">
        <ng-container *ngFor="let c of node.children">
          <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
        </ng-container>
      </ng-container>
      <ng-template #liTxt>{{ node.text || 'item' }}</ng-template>
    </li>

    <!-- NG Zorro wrappers (basic demo) -->
    <nz-tabset *ngSwitchCase="'tabs'" [class.selected]="selected" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <div class="hover-actions" (click)="$event.stopPropagation()">
        <button title="Ajouter dedans" (click)="addInside.emit(node.id)"><i class="fa-solid fa-plus"></i></button>
        <button title="Supprimer" (click)="remove.emit(node.id)"><i class="fa-regular fa-trash-can"></i></button>
      </div>
      <nz-tab *ngFor="let c of node.children" [nzTitle]="c.attrs?.['title'] || c.text || 'Tab'">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </nz-tab>
    </nz-tabset>
    <nz-collapse *ngSwitchCase="'collapse'" [class.selected]="selected" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <nz-collapse-panel *ngFor="let c of node.children" [nzHeader]="c.attrs?.['title'] || c.text || 'Panel'">
        <ui-node-view [node]="c" [selectedId]="selectedId" [bp]="bp" (select)="select.emit($event)"></ui-node-view>
      </nz-collapse-panel>
    </nz-collapse>
    <nz-steps *ngSwitchCase="'steps'" [class.selected]="selected" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)">
      <nz-step *ngFor="let c of node.children" [nzTitle]="c.attrs?.['title'] || c.text || 'Step'"></nz-step>
    </nz-steps>
    <div *ngSwitchDefault [attr.data-tag]="node.tag" [class.selected]="selected" [ngClass]="classList" [uiApplyStyles]="effectiveStyle" (click)="onClick($event)" class="ui-node">
      <div class="hover-actions" (click)="$event.stopPropagation()">
        <button title="Ajouter dedans" (click)="addInside.emit(node.id)"><i class="fa-solid fa-plus"></i></button>
        <button title="Supprimer" (click)="remove.emit(node.id)"><i class="fa-regular fa-trash-can"></i></button>
      </div>
      <ng-container *ngFor="let c of node.children">
        <ui-node-view [node]="c" [selectedId]="selectedId" (select)="select.emit($event)"></ui-node-view>
      </ng-container>
    </div>
  </ng-container>
  `,
  styles: [`
  :host { display: contents; }
  .selected { outline: 2px solid #1677ff; outline-offset: 2px; }
  .ui-node { position: relative; }
  .hover-actions { position: absolute; top: -10px; right: -10px; display:none; gap:6px; }
  .ui-node:hover > .hover-actions { display: inline-flex; }
  .hover-actions button { width:24px; height:24px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  `]
})
export class UiNodeViewComponent {
  @Input() node!: UiNode;
  @Input() selectedId: string | null = null;
  @Input() bp: 'auto'|'xs'|'sm'|'md'|'lg'|'xl' = 'auto';
  @Input() state: UiState = 'base';
  @Output() select = new EventEmitter<string>();
  @Output() addInside = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  constructor(private cls: UiClassStyleService) {}
  get selected() { return this.node?.id === this.selectedId; }
  get effectiveStyle(): any {
    const base = this.node?.style || {};
    const overBp = this.bp && this.bp !== 'auto' ? (this.node?.styleBp?.[this.bp] || {}) : {};
    const classStyles = this.cls.effectiveForClasses(this.node?.classes, this.state, this.bp as UiBreakpoint | 'auto');
    const s: any = { ...classStyles, ...base, ...overBp };
    // Heuristic: if inline elements have dimensional constraints, inline-block is needed
    if (String(this.node?.tag || '').toLowerCase() === 'span') {
      const hasDim = !!(s['height'] || s['min-height'] || s['max-height'] || s['width'] || s['min-width'] || s['max-width']);
      const dsp = String(s['display'] || '').trim().toLowerCase();
      if (hasDim && (!dsp || dsp === 'inline')) s['display'] = 'inline-block';
    }
    return s;
  }
  get classList(): any { const c = this.node?.classes || []; const map: any = {}; c.forEach(x => map[x] = true); return map; }
  onClick(ev: MouseEvent) { ev.stopPropagation(); this.select.emit(this.node.id); }
}
