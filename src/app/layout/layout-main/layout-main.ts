import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
@Component({
  selector: 'app-layout-main',
  standalone: true,
  imports: [
    RouterOutlet,
    NzFlexModule,
    NzIconModule,
    RouterModule,

    //Layout
    NzBreadCrumbModule,
    NzMenuModule,
    NzLayoutModule
  ],
  templateUrl: './layout-main.html',
  styleUrl: './layout-main.scss'
})
export class LayoutMain {

}
