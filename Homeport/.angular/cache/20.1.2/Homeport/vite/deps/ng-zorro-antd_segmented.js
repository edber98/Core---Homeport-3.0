import {
  thumbMotion
} from "./chunk-ZSNB6WH7.js";
import {
  NzOutletModule
} from "./chunk-YXUNP23K.js";
import {
  NzIconDirective,
  NzIconModule
} from "./chunk-OCUS5EEB.js";
import "./chunk-BQ76GOFF.js";
import "./chunk-DGKVKYZV.js";
import {
  NzConfigService,
  WithConfig
} from "./chunk-CMJBQ6NS.js";
import {
  takeUntilDestroyed,
  toSignal
} from "./chunk-ZOU6Z72P.js";
import "./chunk-EI4RHGFP.js";
import "./chunk-X7WAN5DI.js";
import "./chunk-OOGKVRFN.js";
import "./chunk-PI5QEHHS.js";
import "./chunk-UJCZ6AKW.js";
import "./chunk-7R335IKT.js";
import "./chunk-N5LWPDVE.js";
import "./chunk-I7WV2ST6.js";
import {
  Directionality
} from "./chunk-BNB64QCY.js";
import "./chunk-ZHBKS434.js";
import {
  NG_VALUE_ACCESSOR
} from "./chunk-76Z72DDA.js";
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
  EventEmitter,
  Injectable,
  Input,
  NgModule,
  Output,
  ViewEncapsulation,
  booleanAttribute,
  contentChildren,
  effect,
  forwardRef,
  inject,
  setClassMetadata,
  viewChildren,
  ɵɵNgOnChangesFeature,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵcontentQuerySignal,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵqueryAdvance,
  ɵɵreference,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate1,
  ɵɵviewQuerySignal
} from "./chunk-773N7WSB.js";
import "./chunk-4HUDV5O3.js";
import "./chunk-AKIDERDD.js";
import {
  ReplaySubject,
  Subject,
  __esDecorate,
  __runInitializers,
  bufferCount,
  filter,
  map,
  switchMap,
  take,
  tap
} from "./chunk-BO5NHC5P.js";
import {
  __publicField
} from "./chunk-ZY5HDIHX.js";

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-segmented.mjs
var _c0 = ["nz-segmented-item", ""];
var _c1 = ["*"];
function NzSegmentedItemComponent_Conditional_2_ng_template_3_Template(rf, ctx) {
}
function NzSegmentedItemComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 4);
    ɵɵelement(1, "nz-icon", 5);
    ɵɵelementEnd();
    ɵɵelementStart(2, "span");
    ɵɵtemplate(3, NzSegmentedItemComponent_Conditional_2_ng_template_3_Template, 0, 0, "ng-template", 3);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    const content_r3 = ɵɵreference(5);
    ɵɵadvance();
    ɵɵproperty("nzType", ctx_r1.nzIcon);
    ɵɵadvance(2);
    ɵɵproperty("ngTemplateOutlet", content_r3);
  }
}
function NzSegmentedItemComponent_Conditional_3_ng_template_0_Template(rf, ctx) {
}
function NzSegmentedItemComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, NzSegmentedItemComponent_Conditional_3_ng_template_0_Template, 0, 0, "ng-template", 3);
  }
  if (rf & 2) {
    ɵɵnextContext();
    const content_r3 = ɵɵreference(5);
    ɵɵproperty("ngTemplateOutlet", content_r3);
  }
}
function NzSegmentedItemComponent_ng_template_4_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵprojection(0);
  }
}
var _forTrack0 = ($index, $item) => $item.value;
function NzSegmentedComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div", 1);
    ɵɵlistener("@thumbMotion.done", function NzSegmentedComponent_Conditional_1_Template_div_animation_thumbMotion_done_0_listener($event) {
      ɵɵrestoreView(_r1);
      const ctx_r1 = ɵɵnextContext();
      return ɵɵresetView(ctx_r1.handleThumbAnimationDone($event));
    });
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵproperty("@thumbMotion", ctx_r1.animationState);
  }
}
function NzSegmentedComponent_ProjectionFallback_2_For_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "label", 2);
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const item_r3 = ctx.$implicit;
    ɵɵproperty("nzIcon", item_r3.icon)("nzValue", item_r3.value)("nzDisabled", item_r3.disabled);
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", item_r3.label, " ");
  }
}
function NzSegmentedComponent_ProjectionFallback_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵrepeaterCreate(0, NzSegmentedComponent_ProjectionFallback_2_For_1_Template, 2, 4, "label", 2, _forTrack0);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵrepeater(ctx_r1.normalizedOptions);
  }
}
var NzSegmentedService = class _NzSegmentedService {
  selected$ = new ReplaySubject(1);
  activated$ = new ReplaySubject(1);
  change$ = new Subject();
  disabled$ = new ReplaySubject(1);
  animationDone$ = new Subject();
  ngOnDestroy() {
    this.selected$.complete();
    this.activated$.complete();
    this.change$.complete();
    this.disabled$.complete();
    this.animationDone$.complete();
  }
  static ɵfac = function NzSegmentedService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzSegmentedService)();
  };
  static ɵprov = ɵɵdefineInjectable({
    token: _NzSegmentedService,
    factory: _NzSegmentedService.ɵfac
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzSegmentedService, [{
    type: Injectable
  }], null, null);
})();
var NzSegmentedItemComponent = class _NzSegmentedItemComponent {
  service = inject(NzSegmentedService);
  cdr = inject(ChangeDetectorRef);
  elementRef = inject(ElementRef);
  destroyRef = inject(DestroyRef);
  nzIcon;
  nzValue;
  nzDisabled;
  isChecked = false;
  parentDisabled = toSignal(this.service.disabled$, {
    initialValue: false
  });
  ngOnInit() {
    this.service.selected$.pipe(tap((value) => {
      this.isChecked = false;
      this.cdr.markForCheck();
      if (value === this.nzValue) {
        this.service.activated$.next(this.elementRef.nativeElement);
      }
    }), switchMap((value) => this.service.animationDone$.pipe(filter((event) => event.toState === "to"), take(1), map(() => value))), filter((value) => value === this.nzValue), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.isChecked = true;
      this.cdr.markForCheck();
    });
  }
  handleClick() {
    if (!this.nzDisabled && !this.parentDisabled()) {
      this.service.selected$.next(this.nzValue);
      this.service.change$.next(this.nzValue);
    }
  }
  static ɵfac = function NzSegmentedItemComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzSegmentedItemComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _NzSegmentedItemComponent,
    selectors: [["label", "nz-segmented-item", ""], ["label", "nzSegmentedItem", ""]],
    hostAttrs: [1, "ant-segmented-item"],
    hostVars: 4,
    hostBindings: function NzSegmentedItemComponent_HostBindings(rf, ctx) {
      if (rf & 1) {
        ɵɵlistener("click", function NzSegmentedItemComponent_click_HostBindingHandler() {
          return ctx.handleClick();
        });
      }
      if (rf & 2) {
        ɵɵclassProp("ant-segmented-item-selected", ctx.isChecked)("ant-segmented-item-disabled", ctx.nzDisabled || ctx.parentDisabled());
      }
    },
    inputs: {
      nzIcon: "nzIcon",
      nzValue: "nzValue",
      nzDisabled: "nzDisabled"
    },
    exportAs: ["nzSegmentedItem"],
    attrs: _c0,
    ngContentSelectors: _c1,
    decls: 6,
    vars: 2,
    consts: [["content", ""], ["type", "radio", 1, "ant-segmented-item-input", 3, "click", "checked"], [1, "ant-segmented-item-label"], [3, "ngTemplateOutlet"], [1, "ant-segmented-item-icon"], [3, "nzType"]],
    template: function NzSegmentedItemComponent_Template(rf, ctx) {
      if (rf & 1) {
        const _r1 = ɵɵgetCurrentView();
        ɵɵprojectionDef();
        ɵɵelementStart(0, "input", 1);
        ɵɵlistener("click", function NzSegmentedItemComponent_Template_input_click_0_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView($event.stopPropagation());
        });
        ɵɵelementEnd();
        ɵɵelementStart(1, "div", 2);
        ɵɵconditionalCreate(2, NzSegmentedItemComponent_Conditional_2_Template, 4, 2)(3, NzSegmentedItemComponent_Conditional_3_Template, 1, 1, null, 3);
        ɵɵelementEnd();
        ɵɵtemplate(4, NzSegmentedItemComponent_ng_template_4_Template, 1, 0, "ng-template", null, 0, ɵɵtemplateRefExtractor);
      }
      if (rf & 2) {
        ɵɵproperty("checked", ctx.isChecked);
        ɵɵadvance(2);
        ɵɵconditional(ctx.nzIcon ? 2 : 3);
      }
    },
    dependencies: [NzIconModule, NzIconDirective, NgTemplateOutlet],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzSegmentedItemComponent, [{
    type: Component,
    args: [{
      selector: "label[nz-segmented-item],label[nzSegmentedItem]",
      exportAs: "nzSegmentedItem",
      imports: [NzIconModule, NgTemplateOutlet],
      template: `
    <input class="ant-segmented-item-input" type="radio" [checked]="isChecked" (click)="$event.stopPropagation()" />
    <div class="ant-segmented-item-label">
      @if (nzIcon) {
        <span class="ant-segmented-item-icon"><nz-icon [nzType]="nzIcon" /></span>
        <span>
          <ng-template [ngTemplateOutlet]="content" />
        </span>
      } @else {
        <ng-template [ngTemplateOutlet]="content" />
      }
    </div>

    <ng-template #content>
      <ng-content></ng-content>
    </ng-template>
  `,
      host: {
        class: "ant-segmented-item",
        "[class.ant-segmented-item-selected]": "isChecked",
        "[class.ant-segmented-item-disabled]": "nzDisabled || parentDisabled()",
        "(click)": "handleClick()"
      },
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None
    }]
  }], null, {
    nzIcon: [{
      type: Input
    }],
    nzValue: [{
      type: Input
    }],
    nzDisabled: [{
      type: Input
    }]
  });
})();
function normalizeOptions(unnormalized) {
  return unnormalized.map((item) => {
    if (typeof item === "string" || typeof item === "number") {
      return {
        label: `${item}`,
        value: item
      };
    }
    return item;
  });
}
var NZ_CONFIG_MODULE_NAME = "segmented";
var NzSegmentedComponent = (() => {
  var _a;
  let _nzSize_decorators;
  let _nzSize_initializers = [];
  let _nzSize_extraInitializers = [];
  return _a = class {
    _nzModuleName = NZ_CONFIG_MODULE_NAME;
    nzConfigService = inject(NzConfigService);
    cdr = inject(ChangeDetectorRef);
    directionality = inject(Directionality);
    service = inject(NzSegmentedService);
    nzBlock = false;
    nzDisabled = false;
    nzOptions = [];
    nzSize = __runInitializers(this, _nzSize_initializers, "default");
    nzValueChange = (__runInitializers(this, _nzSize_extraInitializers), new EventEmitter());
    viewItemCmps = viewChildren(NzSegmentedItemComponent, ...ngDevMode ? [{
      debugName: "viewItemCmps"
    }] : []);
    contentItemCmps = contentChildren(NzSegmentedItemComponent, ...ngDevMode ? [{
      debugName: "contentItemCmps"
    }] : []);
    isDisabledFirstChange = true;
    dir = "ltr";
    value;
    animationState = {
      value: "to",
      params: thumbAnimationParamsOf()
    };
    normalizedOptions = [];
    onChange = () => {
    };
    onTouched = () => {
    };
    constructor() {
      this.directionality.change.pipe(takeUntilDestroyed()).subscribe((direction) => {
        this.dir = direction;
        this.cdr.markForCheck();
      });
      this.service.selected$.pipe(takeUntilDestroyed()).subscribe((value) => {
        this.value = value;
      });
      this.service.change$.pipe(takeUntilDestroyed()).subscribe((value) => {
        this.nzValueChange.emit(value);
        this.onChange(value);
      });
      this.service.activated$.pipe(bufferCount(2, 1), takeUntilDestroyed()).subscribe((elements) => {
        this.animationState = {
          value: "from",
          params: thumbAnimationParamsOf(elements[0])
        };
        this.cdr.detectChanges();
        this.animationState = {
          value: "to",
          params: thumbAnimationParamsOf(elements[1])
        };
        this.cdr.detectChanges();
      });
      effect(() => {
        const itemCmps = this.viewItemCmps().concat(this.contentItemCmps());
        if (!itemCmps.length) {
          return;
        }
        if (this.value === void 0 || // If no value is set, select the first item
        !itemCmps.some((item) => item.nzValue === this.value)) {
          this.service.selected$.next(itemCmps[0].nzValue);
        }
      });
    }
    ngOnChanges(changes) {
      const {
        nzOptions,
        nzDisabled
      } = changes;
      if (nzOptions) {
        this.normalizedOptions = normalizeOptions(nzOptions.currentValue);
      }
      if (nzDisabled) {
        this.service.disabled$.next(nzDisabled.currentValue);
      }
    }
    handleThumbAnimationDone(event) {
      if (event.toState === "to") {
        this.animationState = null;
      }
      this.service.animationDone$.next(event);
    }
    writeValue(value) {
      this.service.selected$.next(value);
    }
    registerOnChange(fn) {
      this.onChange = fn;
    }
    registerOnTouched(fn) {
      this.onTouched = fn;
    }
    setDisabledState(disabled) {
      this.nzDisabled = this.isDisabledFirstChange && this.nzDisabled || disabled;
      this.isDisabledFirstChange = false;
    }
  }, (() => {
    const _metadata = typeof Symbol === "function" && Symbol.metadata ? /* @__PURE__ */ Object.create(null) : void 0;
    _nzSize_decorators = [WithConfig()];
    __esDecorate(null, null, _nzSize_decorators, {
      kind: "field",
      name: "nzSize",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzSize" in obj,
        get: (obj) => obj.nzSize,
        set: (obj, value) => {
          obj.nzSize = value;
        }
      },
      metadata: _metadata
    }, _nzSize_initializers, _nzSize_extraInitializers);
    if (_metadata) Object.defineProperty(_a, Symbol.metadata, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: _metadata
    });
  })(), __publicField(_a, "ɵfac", function NzSegmentedComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _a)();
  }), __publicField(_a, "ɵcmp", ɵɵdefineComponent({
    type: _a,
    selectors: [["nz-segmented"]],
    contentQueries: function NzSegmentedComponent_ContentQueries(rf, ctx, dirIndex) {
      if (rf & 1) {
        ɵɵcontentQuerySignal(dirIndex, ctx.contentItemCmps, NzSegmentedItemComponent, 4);
      }
      if (rf & 2) {
        ɵɵqueryAdvance();
      }
    },
    viewQuery: function NzSegmentedComponent_Query(rf, ctx) {
      if (rf & 1) {
        ɵɵviewQuerySignal(ctx.viewItemCmps, NzSegmentedItemComponent, 5);
      }
      if (rf & 2) {
        ɵɵqueryAdvance();
      }
    },
    hostAttrs: [1, "ant-segmented"],
    hostVars: 10,
    hostBindings: function NzSegmentedComponent_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵclassProp("ant-segmented-disabled", ctx.nzDisabled)("ant-segmented-rtl", ctx.dir === "rtl")("ant-segmented-lg", ctx.nzSize === "large")("ant-segmented-sm", ctx.nzSize === "small")("ant-segmented-block", ctx.nzBlock);
      }
    },
    inputs: {
      nzBlock: [2, "nzBlock", "nzBlock", booleanAttribute],
      nzDisabled: [2, "nzDisabled", "nzDisabled", booleanAttribute],
      nzOptions: "nzOptions",
      nzSize: "nzSize"
    },
    outputs: {
      nzValueChange: "nzValueChange"
    },
    exportAs: ["nzSegmented"],
    features: [ɵɵProvidersFeature([NzSegmentedService, {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => _a),
      multi: true
    }]), ɵɵNgOnChangesFeature],
    ngContentSelectors: _c1,
    decls: 4,
    vars: 1,
    consts: [[1, "ant-segmented-group"], [1, "ant-segmented-thumb", "ant-segmented-thumb-motion"], ["nz-segmented-item", "", 3, "nzIcon", "nzValue", "nzDisabled"]],
    template: function NzSegmentedComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef();
        ɵɵelementStart(0, "div", 0);
        ɵɵconditionalCreate(1, NzSegmentedComponent_Conditional_1_Template, 1, 1, "div", 1);
        ɵɵprojection(2, 0, null, NzSegmentedComponent_ProjectionFallback_2_Template, 2, 0);
        ɵɵelementEnd();
      }
      if (rf & 2) {
        ɵɵadvance();
        ɵɵconditional(ctx.animationState ? 1 : -1);
      }
    },
    dependencies: [NzIconModule, NzOutletModule, NzSegmentedItemComponent],
    encapsulation: 2,
    data: {
      animation: [thumbMotion]
    },
    changeDetection: 0
  })), _a;
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzSegmentedComponent, [{
    type: Component,
    args: [{
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      selector: "nz-segmented",
      exportAs: "nzSegmented",
      template: `
    <!-- thumb motion div -->
    <div class="ant-segmented-group">
      @if (animationState) {
        <div
          class="ant-segmented-thumb ant-segmented-thumb-motion"
          [@thumbMotion]="animationState"
          (@thumbMotion.done)="handleThumbAnimationDone($event)"
        ></div>
      }

      <ng-content>
        @for (item of normalizedOptions; track item.value) {
          <label nz-segmented-item [nzIcon]="item.icon" [nzValue]="item.value" [nzDisabled]="item.disabled">
            {{ item.label }}
          </label>
        }
      </ng-content>
    </div>
  `,
      host: {
        class: "ant-segmented",
        "[class.ant-segmented-disabled]": "nzDisabled",
        "[class.ant-segmented-rtl]": `dir === 'rtl'`,
        "[class.ant-segmented-lg]": `nzSize === 'large'`,
        "[class.ant-segmented-sm]": `nzSize === 'small'`,
        "[class.ant-segmented-block]": `nzBlock`
      },
      providers: [NzSegmentedService, {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => NzSegmentedComponent),
        multi: true
      }],
      animations: [thumbMotion],
      imports: [NzIconModule, NzOutletModule, NzSegmentedItemComponent]
    }]
  }], () => [], {
    nzBlock: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    nzDisabled: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    nzOptions: [{
      type: Input
    }],
    nzSize: [{
      type: Input
    }],
    nzValueChange: [{
      type: Output
    }]
  });
})();
function thumbAnimationParamsOf(element) {
  return {
    transform: element?.offsetLeft ?? 0,
    width: element?.clientWidth ?? 0
  };
}
var NzSegmentedModule = class _NzSegmentedModule {
  static ɵfac = function NzSegmentedModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzSegmentedModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _NzSegmentedModule,
    imports: [NzSegmentedComponent, NzSegmentedItemComponent],
    exports: [NzSegmentedComponent, NzSegmentedItemComponent]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [NzSegmentedComponent, NzSegmentedItemComponent]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzSegmentedModule, [{
    type: NgModule,
    args: [{
      imports: [NzSegmentedComponent, NzSegmentedItemComponent],
      exports: [NzSegmentedComponent, NzSegmentedItemComponent]
    }]
  }], null, null);
})();
export {
  NzSegmentedComponent,
  NzSegmentedItemComponent,
  NzSegmentedModule,
  normalizeOptions
};
//# sourceMappingURL=ng-zorro-antd_segmented.js.map
