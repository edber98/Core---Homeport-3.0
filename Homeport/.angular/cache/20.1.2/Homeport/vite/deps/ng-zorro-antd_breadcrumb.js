import {
  NzDropDownDirective,
  NzDropDownModule
} from "./chunk-LNSO6SDA.js";
import "./chunk-6KN5HNGG.js";
import "./chunk-N5DFO3JY.js";
import {
  ActivatedRoute,
  NavigationEnd,
  PRIMARY_OUTLET,
  Router
} from "./chunk-JUUQRKAQ.js";
import "./chunk-NE3ZETXZ.js";
import "./chunk-3GCQTVMX.js";
import "./chunk-76DJI4FU.js";
import "./chunk-D43TDAJ6.js";
import "./chunk-ZSNB6WH7.js";
import "./chunk-BC5JEP45.js";
import "./chunk-QP2VWOMV.js";
import {
  NzOutletModule,
  NzStringTemplateOutletDirective
} from "./chunk-YXUNP23K.js";
import {
  NzIconDirective,
  NzIconModule
} from "./chunk-OCUS5EEB.js";
import "./chunk-BQ76GOFF.js";
import "./chunk-DGKVKYZV.js";
import "./chunk-CMJBQ6NS.js";
import {
  takeUntilDestroyed
} from "./chunk-ZOU6Z72P.js";
import {
  PREFIX
} from "./chunk-EI4RHGFP.js";
import "./chunk-X7WAN5DI.js";
import "./chunk-OOGKVRFN.js";
import "./chunk-PI5QEHHS.js";
import "./chunk-UJCZ6AKW.js";
import "./chunk-7R335IKT.js";
import "./chunk-NKTOFDYH.js";
import "./chunk-F4JKROYU.js";
import "./chunk-N5LWPDVE.js";
import "./chunk-I7WV2ST6.js";
import {
  Directionality
} from "./chunk-BNB64QCY.js";
import "./chunk-ZHBKS434.js";
import {
  NgTemplateOutlet
} from "./chunk-JH6JEFGR.js";
import "./chunk-636JCMZ5.js";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  Input,
  NgModule,
  Renderer2,
  ViewEncapsulation,
  booleanAttribute,
  forwardRef,
  inject,
  setClassMetadata,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵelement,
  ɵɵelementContainerEnd,
  ɵɵelementContainerStart,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵreference,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-773N7WSB.js";
import "./chunk-4HUDV5O3.js";
import "./chunk-AKIDERDD.js";
import {
  filter,
  startWith
} from "./chunk-BO5NHC5P.js";
import "./chunk-ZY5HDIHX.js";

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-breadcrumb.mjs
var _c0 = ["*"];
function NzBreadCrumbItemComponent_Conditional_0_ng_template_1_Template(rf, ctx) {
}
function NzBreadCrumbItemComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 1);
    ɵɵtemplate(1, NzBreadCrumbItemComponent_Conditional_0_ng_template_1_Template, 0, 0, "ng-template", 2);
    ɵɵelement(2, "nz-icon", 3);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    const noMenuTpl_r2 = ɵɵreference(4);
    ɵɵproperty("nzDropdownMenu", ctx_r0.nzOverlay);
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", noMenuTpl_r2);
  }
}
function NzBreadCrumbItemComponent_Conditional_1_ng_template_0_Template(rf, ctx) {
}
function NzBreadCrumbItemComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, NzBreadCrumbItemComponent_Conditional_1_ng_template_0_Template, 0, 0, "ng-template", 2);
  }
  if (rf & 2) {
    ɵɵnextContext();
    const noMenuTpl_r2 = ɵɵreference(4);
    ɵɵproperty("ngTemplateOutlet", noMenuTpl_r2);
  }
}
function NzBreadCrumbItemComponent_Conditional_2_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", ctx_r0.nzBreadCrumbComponent.nzSeparator, " ");
  }
}
function NzBreadCrumbItemComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "nz-breadcrumb-separator");
    ɵɵtemplate(1, NzBreadCrumbItemComponent_Conditional_2_ng_container_1_Template, 2, 1, "ng-container", 4);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵproperty("nzStringTemplateOutlet", ctx_r0.nzBreadCrumbComponent.nzSeparator);
  }
}
function NzBreadCrumbItemComponent_ng_template_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 5);
    ɵɵprojection(1);
    ɵɵelementEnd();
  }
}
var _forTrack0 = ($index, $item) => $item.url;
function NzBreadCrumbComponent_Conditional_1_For_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "nz-breadcrumb-item")(1, "a", 0);
    ɵɵlistener("click", function NzBreadCrumbComponent_Conditional_1_For_1_Template_a_click_1_listener($event) {
      const breadcrumb_r2 = ɵɵrestoreView(_r1).$implicit;
      const ctx_r2 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r2.navigate(breadcrumb_r2.url, $event));
    });
    ɵɵtext(2);
    ɵɵelementEnd()();
  }
  if (rf & 2) {
    const breadcrumb_r2 = ctx.$implicit;
    ɵɵadvance();
    ɵɵattribute("href", breadcrumb_r2.url, ɵɵsanitizeUrl);
    ɵɵadvance();
    ɵɵtextInterpolate(breadcrumb_r2.label);
  }
}
function NzBreadCrumbComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵrepeaterCreate(0, NzBreadCrumbComponent_Conditional_1_For_1_Template, 3, 2, "nz-breadcrumb-item", null, _forTrack0);
  }
  if (rf & 2) {
    const ctx_r2 = ɵɵnextContext();
    ɵɵrepeater(ctx_r2.breadcrumbs);
  }
}
var NzBreadcrumb = class {
};
var NzBreadCrumbSeparatorComponent = class _NzBreadCrumbSeparatorComponent {
  static ɵfac = function NzBreadCrumbSeparatorComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzBreadCrumbSeparatorComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _NzBreadCrumbSeparatorComponent,
    selectors: [["nz-breadcrumb-separator"]],
    hostAttrs: [1, "ant-breadcrumb-separator"],
    exportAs: ["nzBreadcrumbSeparator"],
    ngContentSelectors: _c0,
    decls: 1,
    vars: 0,
    template: function NzBreadCrumbSeparatorComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef();
        ɵɵprojection(0);
      }
    },
    encapsulation: 2
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzBreadCrumbSeparatorComponent, [{
    type: Component,
    args: [{
      selector: "nz-breadcrumb-separator",
      exportAs: "nzBreadcrumbSeparator",
      template: `<ng-content></ng-content>`,
      host: {
        class: "ant-breadcrumb-separator"
      }
    }]
  }], null, null);
})();
var NzBreadCrumbItemComponent = class _NzBreadCrumbItemComponent {
  nzBreadCrumbComponent = inject(NzBreadcrumb);
  /**
   * Dropdown content of a breadcrumb item.
   */
  nzOverlay;
  static ɵfac = function NzBreadCrumbItemComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzBreadCrumbItemComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _NzBreadCrumbItemComponent,
    selectors: [["nz-breadcrumb-item"]],
    inputs: {
      nzOverlay: "nzOverlay"
    },
    exportAs: ["nzBreadcrumbItem"],
    ngContentSelectors: _c0,
    decls: 5,
    vars: 2,
    consts: [["noMenuTpl", ""], ["nz-dropdown", "", 1, "ant-breadcrumb-overlay-link", 3, "nzDropdownMenu"], [3, "ngTemplateOutlet"], ["nzType", "down"], [4, "nzStringTemplateOutlet"], [1, "ant-breadcrumb-link"]],
    template: function NzBreadCrumbItemComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef();
        ɵɵconditionalCreate(0, NzBreadCrumbItemComponent_Conditional_0_Template, 3, 2, "span", 1)(1, NzBreadCrumbItemComponent_Conditional_1_Template, 1, 1, null, 2);
        ɵɵconditionalCreate(2, NzBreadCrumbItemComponent_Conditional_2_Template, 2, 1, "nz-breadcrumb-separator");
        ɵɵtemplate(3, NzBreadCrumbItemComponent_ng_template_3_Template, 2, 0, "ng-template", null, 0, ɵɵtemplateRefExtractor);
      }
      if (rf & 2) {
        ɵɵconditional(!!ctx.nzOverlay ? 0 : 1);
        ɵɵadvance(2);
        ɵɵconditional(ctx.nzBreadCrumbComponent.nzSeparator ? 2 : -1);
      }
    },
    dependencies: [NgTemplateOutlet, NzBreadCrumbSeparatorComponent, NzDropDownModule, NzDropDownDirective, NzIconModule, NzIconDirective, NzOutletModule, NzStringTemplateOutletDirective],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzBreadCrumbItemComponent, [{
    type: Component,
    args: [{
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      selector: "nz-breadcrumb-item",
      exportAs: "nzBreadcrumbItem",
      imports: [NgTemplateOutlet, NzBreadCrumbSeparatorComponent, NzDropDownModule, NzIconModule, NzOutletModule],
      template: `
    @if (!!nzOverlay) {
      <span class="ant-breadcrumb-overlay-link" nz-dropdown [nzDropdownMenu]="nzOverlay">
        <ng-template [ngTemplateOutlet]="noMenuTpl"></ng-template>
        <nz-icon nzType="down" />
      </span>
    } @else {
      <ng-template [ngTemplateOutlet]="noMenuTpl" />
    }

    @if (nzBreadCrumbComponent.nzSeparator) {
      <nz-breadcrumb-separator>
        <ng-container *nzStringTemplateOutlet="nzBreadCrumbComponent.nzSeparator">
          {{ nzBreadCrumbComponent.nzSeparator }}
        </ng-container>
      </nz-breadcrumb-separator>
    }

    <ng-template #noMenuTpl>
      <span class="ant-breadcrumb-link">
        <ng-content />
      </span>
    </ng-template>
  `
    }]
  }], null, {
    nzOverlay: [{
      type: Input
    }]
  });
})();
var NzBreadCrumbComponent = class _NzBreadCrumbComponent {
  injector = inject(Injector);
  cdr = inject(ChangeDetectorRef);
  elementRef = inject(ElementRef);
  renderer = inject(Renderer2);
  directionality = inject(Directionality);
  destroyRef = inject(DestroyRef);
  nzAutoGenerate = false;
  nzSeparator = "/";
  nzRouteLabel = "breadcrumb";
  nzRouteLabelFn = (label) => label;
  nzRouteFn = (route) => route;
  breadcrumbs = [];
  dir = "ltr";
  ngOnInit() {
    if (this.nzAutoGenerate) {
      this.registerRouterChange();
    }
    this.directionality.change?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((direction) => {
      this.dir = direction;
      this.prepareComponentForRtl();
      this.cdr.detectChanges();
    });
    this.dir = this.directionality.value;
    this.prepareComponentForRtl();
  }
  navigate(url, e) {
    e.preventDefault();
    this.injector.get(Router).navigateByUrl(url);
  }
  registerRouterChange() {
    try {
      const router = this.injector.get(Router);
      const activatedRoute = this.injector.get(ActivatedRoute);
      router.events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
        startWith(true)
        // trigger initial render
      ).subscribe(() => {
        this.breadcrumbs = this.getBreadcrumbs(activatedRoute.root);
        this.cdr.markForCheck();
      });
    } catch {
      throw new Error(`${PREFIX} You should import RouterModule if you want to use 'NzAutoGenerate'.`);
    }
  }
  getBreadcrumbs(route, url = "", breadcrumbs = []) {
    const children = route.children;
    if (children.length === 0) {
      return breadcrumbs;
    }
    for (const child of children) {
      if (child.outlet === PRIMARY_OUTLET) {
        const routeUrl = child.snapshot.url.map((segment) => segment.path).filter((path) => path).join("/");
        const nextUrl = routeUrl ? `${url}/${routeUrl}` : url;
        const breadcrumbLabel = this.nzRouteLabelFn(child.snapshot.data[this.nzRouteLabel]);
        const shapedUrl = this.nzRouteFn(nextUrl);
        if (routeUrl && breadcrumbLabel) {
          const breadcrumb = {
            label: breadcrumbLabel,
            params: child.snapshot.params,
            url: shapedUrl
          };
          breadcrumbs.push(breadcrumb);
        }
        return this.getBreadcrumbs(child, nextUrl, breadcrumbs);
      }
    }
    return breadcrumbs;
  }
  prepareComponentForRtl() {
    if (this.dir === "rtl") {
      this.renderer.addClass(this.elementRef.nativeElement, "ant-breadcrumb-rtl");
    } else {
      this.renderer.removeClass(this.elementRef.nativeElement, "ant-breadcrumb-rtl");
    }
  }
  static ɵfac = function NzBreadCrumbComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzBreadCrumbComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _NzBreadCrumbComponent,
    selectors: [["nz-breadcrumb"]],
    hostAttrs: [1, "ant-breadcrumb"],
    inputs: {
      nzAutoGenerate: [2, "nzAutoGenerate", "nzAutoGenerate", booleanAttribute],
      nzSeparator: "nzSeparator",
      nzRouteLabel: "nzRouteLabel",
      nzRouteLabelFn: "nzRouteLabelFn",
      nzRouteFn: "nzRouteFn"
    },
    exportAs: ["nzBreadcrumb"],
    features: [ɵɵProvidersFeature([{
      provide: NzBreadcrumb,
      useExisting: forwardRef(() => _NzBreadCrumbComponent)
    }])],
    ngContentSelectors: _c0,
    decls: 2,
    vars: 1,
    consts: [[3, "click"]],
    template: function NzBreadCrumbComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef();
        ɵɵprojection(0);
        ɵɵconditionalCreate(1, NzBreadCrumbComponent_Conditional_1_Template, 2, 0);
      }
      if (rf & 2) {
        ɵɵadvance();
        ɵɵconditional(ctx.nzAutoGenerate && ctx.breadcrumbs.length ? 1 : -1);
      }
    },
    dependencies: [NzBreadCrumbItemComponent],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzBreadCrumbComponent, [{
    type: Component,
    args: [{
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      selector: "nz-breadcrumb",
      exportAs: "nzBreadcrumb",
      providers: [{
        provide: NzBreadcrumb,
        useExisting: forwardRef(() => NzBreadCrumbComponent)
      }],
      imports: [NzBreadCrumbItemComponent],
      template: `
    <ng-content />
    @if (nzAutoGenerate && breadcrumbs.length) {
      @for (breadcrumb of breadcrumbs; track breadcrumb.url) {
        <nz-breadcrumb-item>
          <a [attr.href]="breadcrumb.url" (click)="navigate(breadcrumb.url, $event)">{{ breadcrumb.label }}</a>
        </nz-breadcrumb-item>
      }
    }
  `,
      host: {
        class: "ant-breadcrumb"
      }
    }]
  }], null, {
    nzAutoGenerate: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    nzSeparator: [{
      type: Input
    }],
    nzRouteLabel: [{
      type: Input
    }],
    nzRouteLabelFn: [{
      type: Input
    }],
    nzRouteFn: [{
      type: Input
    }]
  });
})();
var NzBreadCrumbModule = class _NzBreadCrumbModule {
  static ɵfac = function NzBreadCrumbModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzBreadCrumbModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _NzBreadCrumbModule,
    imports: [NzBreadCrumbComponent, NzBreadCrumbItemComponent, NzBreadCrumbSeparatorComponent],
    exports: [NzBreadCrumbComponent, NzBreadCrumbItemComponent, NzBreadCrumbSeparatorComponent]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [NzBreadCrumbComponent, NzBreadCrumbItemComponent]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzBreadCrumbModule, [{
    type: NgModule,
    args: [{
      imports: [NzBreadCrumbComponent, NzBreadCrumbItemComponent, NzBreadCrumbSeparatorComponent],
      exports: [NzBreadCrumbComponent, NzBreadCrumbItemComponent, NzBreadCrumbSeparatorComponent]
    }]
  }], null, null);
})();
export {
  NzBreadCrumbComponent,
  NzBreadCrumbItemComponent,
  NzBreadCrumbModule,
  NzBreadCrumbSeparatorComponent
};
//# sourceMappingURL=ng-zorro-antd_breadcrumb.js.map
