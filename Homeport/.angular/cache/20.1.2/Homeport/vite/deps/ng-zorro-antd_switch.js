import {
  NzWaveDirective,
  NzWaveModule
} from "./chunk-NJIMKKFA.js";
import {
  FocusMonitor
} from "./chunk-6QLLGJOB.js";
import "./chunk-YCAQCVJE.js";
import {
  ENTER,
  LEFT_ARROW,
  RIGHT_ARROW,
  SPACE
} from "./chunk-76DJI4FU.js";
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
import {
  NzConfigService,
  WithConfig
} from "./chunk-CMJBQ6NS.js";
import {
  takeUntilDestroyed
} from "./chunk-ZOU6Z72P.js";
import {
  fromEventOutsideAngular
} from "./chunk-EI4RHGFP.js";
import "./chunk-X7WAN5DI.js";
import "./chunk-OOGKVRFN.js";
import "./chunk-PI5QEHHS.js";
import "./chunk-7R335IKT.js";
import "./chunk-4NJAG2UW.js";
import "./chunk-F4JKROYU.js";
import "./chunk-N5LWPDVE.js";
import "./chunk-I7WV2ST6.js";
import {
  Directionality
} from "./chunk-BNB64QCY.js";
import "./chunk-ZHBKS434.js";
import {
  NG_VALUE_ACCESSOR
} from "./chunk-76Z72DDA.js";
import "./chunk-JH6JEFGR.js";
import "./chunk-636JCMZ5.js";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgModule,
  NgZone,
  ViewChild,
  ViewEncapsulation,
  booleanAttribute,
  forwardRef,
  inject,
  setClassMetadata,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
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
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵqueryRefresh,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵviewQuery
} from "./chunk-773N7WSB.js";
import "./chunk-4HUDV5O3.js";
import "./chunk-AKIDERDD.js";
import {
  __esDecorate,
  __runInitializers
} from "./chunk-BO5NHC5P.js";
import {
  __publicField
} from "./chunk-ZY5HDIHX.js";

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-switch.mjs
var _c0 = ["switchElement"];
function NzSwitchComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "nz-icon", 3);
  }
}
function NzSwitchComponent_Conditional_5_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵtextInterpolate(ctx_r0.nzCheckedChildren);
  }
}
function NzSwitchComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, NzSwitchComponent_Conditional_5_ng_container_0_Template, 2, 1, "ng-container", 6);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵproperty("nzStringTemplateOutlet", ctx_r0.nzCheckedChildren);
  }
}
function NzSwitchComponent_Conditional_6_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵtextInterpolate(ctx_r0.nzUnCheckedChildren);
  }
}
function NzSwitchComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, NzSwitchComponent_Conditional_6_ng_container_0_Template, 2, 1, "ng-container", 6);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵproperty("nzStringTemplateOutlet", ctx_r0.nzUnCheckedChildren);
  }
}
var NZ_CONFIG_MODULE_NAME = "switch";
var NzSwitchComponent = (() => {
  var _a;
  let _nzSize_decorators;
  let _nzSize_initializers = [];
  let _nzSize_extraInitializers = [];
  return _a = class {
    _nzModuleName = NZ_CONFIG_MODULE_NAME;
    nzConfigService = inject(NzConfigService);
    el = inject(ElementRef).nativeElement;
    ngZone = inject(NgZone);
    cdr = inject(ChangeDetectorRef);
    focusMonitor = inject(FocusMonitor);
    directionality = inject(Directionality);
    destroyRef = inject(DestroyRef);
    isChecked = false;
    onChange = () => {
    };
    onTouched = () => {
    };
    switchElement;
    nzLoading = false;
    nzDisabled = false;
    nzControl = false;
    nzCheckedChildren = null;
    nzUnCheckedChildren = null;
    nzSize = __runInitializers(this, _nzSize_initializers, "default");
    nzId = (__runInitializers(this, _nzSize_extraInitializers), null);
    dir = "ltr";
    isNzDisableFirstChange = true;
    updateValue(value) {
      if (this.isChecked !== value) {
        this.isChecked = value;
        this.onChange(this.isChecked);
      }
    }
    focus() {
      this.focusMonitor.focusVia(this.switchElement.nativeElement, "keyboard");
    }
    blur() {
      this.switchElement.nativeElement.blur();
    }
    constructor() {
      this.destroyRef.onDestroy(() => {
        this.focusMonitor.stopMonitoring(this.switchElement.nativeElement);
      });
    }
    ngOnInit() {
      this.directionality.change.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((direction) => {
        this.dir = direction;
        this.cdr.detectChanges();
      });
      this.dir = this.directionality.value;
      fromEventOutsideAngular(this.el, "click").pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        event.preventDefault();
        if (this.nzControl || this.nzDisabled || this.nzLoading) {
          return;
        }
        this.ngZone.run(() => {
          this.updateValue(!this.isChecked);
          this.cdr.markForCheck();
        });
      });
      fromEventOutsideAngular(this.switchElement.nativeElement, "keydown").pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        if (this.nzControl || this.nzDisabled || this.nzLoading) {
          return;
        }
        const {
          keyCode
        } = event;
        if (keyCode !== LEFT_ARROW && keyCode !== RIGHT_ARROW && keyCode !== SPACE && keyCode !== ENTER) {
          return;
        }
        event.preventDefault();
        this.ngZone.run(() => {
          if (keyCode === LEFT_ARROW) {
            this.updateValue(false);
          } else if (keyCode === RIGHT_ARROW) {
            this.updateValue(true);
          } else if (keyCode === SPACE || keyCode === ENTER) {
            this.updateValue(!this.isChecked);
          }
          this.cdr.markForCheck();
        });
      });
    }
    ngAfterViewInit() {
      this.focusMonitor.monitor(this.switchElement.nativeElement, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((focusOrigin) => {
        if (!focusOrigin) {
          Promise.resolve().then(() => this.onTouched());
        }
      });
    }
    writeValue(value) {
      this.isChecked = value;
      this.cdr.markForCheck();
    }
    registerOnChange(fn) {
      this.onChange = fn;
    }
    registerOnTouched(fn) {
      this.onTouched = fn;
    }
    setDisabledState(disabled) {
      this.nzDisabled = this.isNzDisableFirstChange && this.nzDisabled || disabled;
      this.isNzDisableFirstChange = false;
      this.cdr.markForCheck();
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
  })(), __publicField(_a, "ɵfac", function NzSwitchComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _a)();
  }), __publicField(_a, "ɵcmp", ɵɵdefineComponent({
    type: _a,
    selectors: [["nz-switch"]],
    viewQuery: function NzSwitchComponent_Query(rf, ctx) {
      if (rf & 1) {
        ɵɵviewQuery(_c0, 7);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.switchElement = _t.first);
      }
    },
    inputs: {
      nzLoading: [2, "nzLoading", "nzLoading", booleanAttribute],
      nzDisabled: [2, "nzDisabled", "nzDisabled", booleanAttribute],
      nzControl: [2, "nzControl", "nzControl", booleanAttribute],
      nzCheckedChildren: "nzCheckedChildren",
      nzUnCheckedChildren: "nzUnCheckedChildren",
      nzSize: "nzSize",
      nzId: "nzId"
    },
    exportAs: ["nzSwitch"],
    features: [ɵɵProvidersFeature([{
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => _a),
      multi: true
    }])],
    decls: 8,
    vars: 15,
    consts: [["switchElement", ""], ["nz-wave", "", "type", "button", 1, "ant-switch", 3, "disabled", "nzWaveExtraNode"], [1, "ant-switch-handle"], ["nzType", "loading", 1, "ant-switch-loading-icon"], [1, "ant-switch-inner"], [1, "ant-click-animating-node"], [4, "nzStringTemplateOutlet"]],
    template: function NzSwitchComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵelementStart(0, "button", 1, 0)(2, "span", 2);
        ɵɵconditionalCreate(3, NzSwitchComponent_Conditional_3_Template, 1, 0, "nz-icon", 3);
        ɵɵelementEnd();
        ɵɵelementStart(4, "span", 4);
        ɵɵconditionalCreate(5, NzSwitchComponent_Conditional_5_Template, 1, 1, "ng-container")(6, NzSwitchComponent_Conditional_6_Template, 1, 1, "ng-container");
        ɵɵelementEnd();
        ɵɵelement(7, "div", 5);
        ɵɵelementEnd();
      }
      if (rf & 2) {
        ɵɵclassProp("ant-switch-checked", ctx.isChecked)("ant-switch-loading", ctx.nzLoading)("ant-switch-disabled", ctx.nzDisabled)("ant-switch-small", ctx.nzSize === "small")("ant-switch-rtl", ctx.dir === "rtl");
        ɵɵproperty("disabled", ctx.nzDisabled)("nzWaveExtraNode", true);
        ɵɵattribute("id", ctx.nzId);
        ɵɵadvance(3);
        ɵɵconditional(ctx.nzLoading ? 3 : -1);
        ɵɵadvance(2);
        ɵɵconditional(ctx.isChecked ? 5 : 6);
      }
    },
    dependencies: [NzWaveModule, NzWaveDirective, NzIconModule, NzIconDirective, NzOutletModule, NzStringTemplateOutletDirective],
    encapsulation: 2,
    changeDetection: 0
  })), _a;
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzSwitchComponent, [{
    type: Component,
    args: [{
      selector: "nz-switch",
      exportAs: "nzSwitch",
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => NzSwitchComponent),
        multi: true
      }],
      template: `
    <button
      nz-wave
      type="button"
      class="ant-switch"
      #switchElement
      [attr.id]="nzId"
      [disabled]="nzDisabled"
      [class.ant-switch-checked]="isChecked"
      [class.ant-switch-loading]="nzLoading"
      [class.ant-switch-disabled]="nzDisabled"
      [class.ant-switch-small]="nzSize === 'small'"
      [class.ant-switch-rtl]="dir === 'rtl'"
      [nzWaveExtraNode]="true"
    >
      <span class="ant-switch-handle">
        @if (nzLoading) {
          <nz-icon nzType="loading" class="ant-switch-loading-icon" />
        }
      </span>
      <span class="ant-switch-inner">
        @if (isChecked) {
          <ng-container *nzStringTemplateOutlet="nzCheckedChildren">{{ nzCheckedChildren }}</ng-container>
        } @else {
          <ng-container *nzStringTemplateOutlet="nzUnCheckedChildren">{{ nzUnCheckedChildren }}</ng-container>
        }
      </span>
      <div class="ant-click-animating-node"></div>
    </button>
  `,
      imports: [NzWaveModule, NzIconModule, NzOutletModule]
    }]
  }], () => [], {
    switchElement: [{
      type: ViewChild,
      args: ["switchElement", {
        static: true
      }]
    }],
    nzLoading: [{
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
    nzControl: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    nzCheckedChildren: [{
      type: Input
    }],
    nzUnCheckedChildren: [{
      type: Input
    }],
    nzSize: [{
      type: Input
    }],
    nzId: [{
      type: Input
    }]
  });
})();
var NzSwitchModule = class _NzSwitchModule {
  static ɵfac = function NzSwitchModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzSwitchModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _NzSwitchModule,
    imports: [NzSwitchComponent],
    exports: [NzSwitchComponent]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [NzSwitchComponent]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzSwitchModule, [{
    type: NgModule,
    args: [{
      imports: [NzSwitchComponent],
      exports: [NzSwitchComponent]
    }]
  }], null, null);
})();
export {
  NzSwitchComponent,
  NzSwitchModule
};
//# sourceMappingURL=ng-zorro-antd_switch.js.map
