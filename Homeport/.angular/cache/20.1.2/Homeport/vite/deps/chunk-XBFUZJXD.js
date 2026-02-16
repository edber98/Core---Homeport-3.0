import {
  NzTooltipBaseDirective,
  NzTooltipComponent,
  isTooltipEmpty
} from "./chunk-OOW2V5OK.js";
import {
  NzConnectedOverlayDirective,
  NzOverlayModule
} from "./chunk-HEW6ARJR.js";
import {
  CdkConnectedOverlay,
  OverlayModule
} from "./chunk-I6IJXFM3.js";
import {
  NzNoAnimationDirective
} from "./chunk-3GA2OJ6V.js";
import {
  zoomBigMotion
} from "./chunk-ZSNB6WH7.js";
import {
  NzOutletModule,
  NzStringTemplateOutletDirective
} from "./chunk-ODSOMI3E.js";
import {
  WithConfig
} from "./chunk-CUX2N4JD.js";
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  EventEmitter,
  Input,
  NgModule,
  Output,
  ViewEncapsulation,
  booleanAttribute,
  setClassMetadata,
  ɵɵInheritDefinitionFeature,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵelement,
  ɵɵelementContainerEnd,
  ɵɵelementContainerStart,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵgetInheritedFactory,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleMap,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate1
} from "./chunk-BJ4AXIGZ.js";
import {
  __esDecorate,
  __runInitializers
} from "./chunk-BO5NHC5P.js";
import {
  __publicField,
  __spreadValues
} from "./chunk-BZU26Y7K.js";

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-popover.mjs
var _c0 = (a0) => ({
  $implicit: a0
});
function NzPopoverComponent_ng_template_0_Conditional_6_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", ctx_r1.nzTitle, " ");
  }
}
function NzPopoverComponent_ng_template_0_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 7);
    ɵɵtemplate(1, NzPopoverComponent_ng_template_0_Conditional_6_ng_container_1_Template, 2, 1, "ng-container", 9);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵproperty("nzStringTemplateOutlet", ctx_r1.nzTitle)("nzStringTemplateOutletContext", ɵɵpureFunction1(2, _c0, ctx_r1.nzTitleContext));
  }
}
function NzPopoverComponent_ng_template_0_ng_container_8_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", ctx_r1.nzContent, " ");
  }
}
function NzPopoverComponent_ng_template_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 2)(1, "div", 3)(2, "div", 4);
    ɵɵelement(3, "span", 5);
    ɵɵelementEnd();
    ɵɵelementStart(4, "div", 6)(5, "div");
    ɵɵconditionalCreate(6, NzPopoverComponent_ng_template_0_Conditional_6_Template, 2, 4, "div", 7);
    ɵɵelementStart(7, "div", 8);
    ɵɵtemplate(8, NzPopoverComponent_ng_template_0_ng_container_8_Template, 2, 1, "ng-container", 9);
    ɵɵelementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵstyleMap(ctx_r1.nzOverlayStyle);
    ɵɵclassMap(ctx_r1._classMap);
    ɵɵclassProp("ant-popover-rtl", ctx_r1.dir === "rtl");
    ɵɵproperty("@.disabled", !!(ctx_r1.noAnimation == null ? null : ctx_r1.noAnimation.nzNoAnimation))("nzNoAnimation", ctx_r1.noAnimation == null ? null : ctx_r1.noAnimation.nzNoAnimation)("@zoomBigMotion", "active");
    ɵɵadvance(6);
    ɵɵconditional(ctx_r1.nzTitle ? 6 : -1);
    ɵɵadvance(2);
    ɵɵproperty("nzStringTemplateOutlet", ctx_r1.nzContent)("nzStringTemplateOutletContext", ɵɵpureFunction1(12, _c0, ctx_r1.nzContentContext));
  }
}
var NZ_CONFIG_MODULE_NAME = "popover";
var NzPopoverDirective = (() => {
  var _a;
  let _classSuper = NzTooltipBaseDirective;
  let _nzPopoverBackdrop_decorators;
  let _nzPopoverBackdrop_initializers = [];
  let _nzPopoverBackdrop_extraInitializers = [];
  return _a = class extends _classSuper {
    _nzModuleName = NZ_CONFIG_MODULE_NAME;
    /* eslint-disable @angular-eslint/no-input-rename, @angular-eslint/no-output-rename */
    arrowPointAtCenter;
    title;
    titleContext = null;
    content;
    contentContext = null;
    directiveTitle;
    trigger = "hover";
    placement = "top";
    origin;
    visible;
    mouseEnterDelay;
    mouseLeaveDelay;
    overlayClassName;
    overlayStyle;
    overlayClickable;
    directiveContent = null;
    nzPopoverBackdrop = __runInitializers(this, _nzPopoverBackdrop_initializers, false);
    visibleChange = (__runInitializers(this, _nzPopoverBackdrop_extraInitializers), new EventEmitter());
    getProxyPropertyMap() {
      return __spreadValues({
        nzPopoverBackdrop: ["nzBackdrop", () => this.nzPopoverBackdrop],
        titleContext: ["nzTitleContext", () => this.titleContext],
        contentContext: ["nzContentContext", () => this.contentContext]
      }, super.getProxyPropertyMap());
    }
    constructor() {
      super(NzPopoverComponent);
    }
  }, (() => {
    const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
    _nzPopoverBackdrop_decorators = [WithConfig()];
    __esDecorate(null, null, _nzPopoverBackdrop_decorators, {
      kind: "field",
      name: "nzPopoverBackdrop",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzPopoverBackdrop" in obj,
        get: (obj) => obj.nzPopoverBackdrop,
        set: (obj, value) => {
          obj.nzPopoverBackdrop = value;
        }
      },
      metadata: _metadata
    }, _nzPopoverBackdrop_initializers, _nzPopoverBackdrop_extraInitializers);
    if (_metadata) Object.defineProperty(_a, Symbol.metadata, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: _metadata
    });
  })(), __publicField(_a, "ɵfac", function NzPopoverDirective_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _a)();
  }), __publicField(_a, "ɵdir", ɵɵdefineDirective({
    type: _a,
    selectors: [["", "nz-popover", ""]],
    hostVars: 2,
    hostBindings: function NzPopoverDirective_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵclassProp("ant-popover-open", ctx.visible);
      }
    },
    inputs: {
      arrowPointAtCenter: [2, "nzPopoverArrowPointAtCenter", "arrowPointAtCenter", booleanAttribute],
      title: [0, "nzPopoverTitle", "title"],
      titleContext: [0, "nzPopoverTitleContext", "titleContext"],
      content: [0, "nzPopoverContent", "content"],
      contentContext: [0, "nzPopoverContentContext", "contentContext"],
      directiveTitle: [0, "nz-popover", "directiveTitle"],
      trigger: [0, "nzPopoverTrigger", "trigger"],
      placement: [0, "nzPopoverPlacement", "placement"],
      origin: [0, "nzPopoverOrigin", "origin"],
      visible: [0, "nzPopoverVisible", "visible"],
      mouseEnterDelay: [0, "nzPopoverMouseEnterDelay", "mouseEnterDelay"],
      mouseLeaveDelay: [0, "nzPopoverMouseLeaveDelay", "mouseLeaveDelay"],
      overlayClassName: [0, "nzPopoverOverlayClassName", "overlayClassName"],
      overlayStyle: [0, "nzPopoverOverlayStyle", "overlayStyle"],
      overlayClickable: [0, "nzPopoverOverlayClickable", "overlayClickable"],
      nzPopoverBackdrop: "nzPopoverBackdrop"
    },
    outputs: {
      visibleChange: "nzPopoverVisibleChange"
    },
    exportAs: ["nzPopover"],
    features: [ɵɵInheritDefinitionFeature]
  })), _a;
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzPopoverDirective, [{
    type: Directive,
    args: [{
      selector: "[nz-popover]",
      exportAs: "nzPopover",
      host: {
        "[class.ant-popover-open]": "visible"
      }
    }]
  }], () => [], {
    arrowPointAtCenter: [{
      type: Input,
      args: [{
        alias: "nzPopoverArrowPointAtCenter",
        transform: booleanAttribute
      }]
    }],
    title: [{
      type: Input,
      args: ["nzPopoverTitle"]
    }],
    titleContext: [{
      type: Input,
      args: ["nzPopoverTitleContext"]
    }],
    content: [{
      type: Input,
      args: ["nzPopoverContent"]
    }],
    contentContext: [{
      type: Input,
      args: ["nzPopoverContentContext"]
    }],
    directiveTitle: [{
      type: Input,
      args: ["nz-popover"]
    }],
    trigger: [{
      type: Input,
      args: ["nzPopoverTrigger"]
    }],
    placement: [{
      type: Input,
      args: ["nzPopoverPlacement"]
    }],
    origin: [{
      type: Input,
      args: ["nzPopoverOrigin"]
    }],
    visible: [{
      type: Input,
      args: ["nzPopoverVisible"]
    }],
    mouseEnterDelay: [{
      type: Input,
      args: ["nzPopoverMouseEnterDelay"]
    }],
    mouseLeaveDelay: [{
      type: Input,
      args: ["nzPopoverMouseLeaveDelay"]
    }],
    overlayClassName: [{
      type: Input,
      args: ["nzPopoverOverlayClassName"]
    }],
    overlayStyle: [{
      type: Input,
      args: ["nzPopoverOverlayStyle"]
    }],
    overlayClickable: [{
      type: Input,
      args: ["nzPopoverOverlayClickable"]
    }],
    nzPopoverBackdrop: [{
      type: Input
    }],
    visibleChange: [{
      type: Output,
      args: ["nzPopoverVisibleChange"]
    }]
  });
})();
var NzPopoverComponent = class _NzPopoverComponent extends NzTooltipComponent {
  _prefix = "ant-popover";
  nzContentContext = null;
  get hasBackdrop() {
    return this.nzTrigger === "click" ? this.nzBackdrop : false;
  }
  isEmpty() {
    return isTooltipEmpty(this.nzTitle) && isTooltipEmpty(this.nzContent);
  }
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵNzPopoverComponent_BaseFactory;
    return function NzPopoverComponent_Factory(__ngFactoryType__) {
      return (ɵNzPopoverComponent_BaseFactory || (ɵNzPopoverComponent_BaseFactory = ɵɵgetInheritedFactory(_NzPopoverComponent)))(__ngFactoryType__ || _NzPopoverComponent);
    };
  })();
  static ɵcmp = ɵɵdefineComponent({
    type: _NzPopoverComponent,
    selectors: [["nz-popover"]],
    exportAs: ["nzPopoverComponent"],
    features: [ɵɵInheritDefinitionFeature],
    decls: 2,
    vars: 6,
    consts: [["overlay", "cdkConnectedOverlay"], ["cdkConnectedOverlay", "", "nzConnectedOverlay", "", 3, "overlayOutsideClick", "detach", "positionChange", "cdkConnectedOverlayHasBackdrop", "cdkConnectedOverlayOrigin", "cdkConnectedOverlayPositions", "cdkConnectedOverlayOpen", "cdkConnectedOverlayPush", "nzArrowPointAtCenter"], [1, "ant-popover", 3, "nzNoAnimation"], [1, "ant-popover-content"], [1, "ant-popover-arrow"], [1, "ant-popover-arrow-content"], ["role", "tooltip", 1, "ant-popover-inner"], [1, "ant-popover-title"], [1, "ant-popover-inner-content"], [4, "nzStringTemplateOutlet", "nzStringTemplateOutletContext"]],
    template: function NzPopoverComponent_Template(rf, ctx) {
      if (rf & 1) {
        const _r1 = ɵɵgetCurrentView();
        ɵɵtemplate(0, NzPopoverComponent_ng_template_0_Template, 9, 14, "ng-template", 1, 0, ɵɵtemplateRefExtractor);
        ɵɵlistener("overlayOutsideClick", function NzPopoverComponent_Template_ng_template_overlayOutsideClick_0_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.onClickOutside($event));
        })("detach", function NzPopoverComponent_Template_ng_template_detach_0_listener() {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.hide());
        })("positionChange", function NzPopoverComponent_Template_ng_template_positionChange_0_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.onPositionChange($event));
        });
      }
      if (rf & 2) {
        ɵɵproperty("cdkConnectedOverlayHasBackdrop", ctx.hasBackdrop)("cdkConnectedOverlayOrigin", ctx.origin)("cdkConnectedOverlayPositions", ctx._positions)("cdkConnectedOverlayOpen", ctx._visible)("cdkConnectedOverlayPush", ctx.cdkConnectedOverlayPush)("nzArrowPointAtCenter", ctx.nzArrowPointAtCenter);
      }
    },
    dependencies: [OverlayModule, CdkConnectedOverlay, NzOverlayModule, NzConnectedOverlayDirective, NzNoAnimationDirective, NzOutletModule, NzStringTemplateOutletDirective],
    encapsulation: 2,
    data: {
      animation: [zoomBigMotion]
    },
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzPopoverComponent, [{
    type: Component,
    args: [{
      selector: "nz-popover",
      exportAs: "nzPopoverComponent",
      animations: [zoomBigMotion],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      template: `
    <ng-template
      #overlay="cdkConnectedOverlay"
      cdkConnectedOverlay
      nzConnectedOverlay
      [cdkConnectedOverlayHasBackdrop]="hasBackdrop"
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayPositions]="_positions"
      [cdkConnectedOverlayOpen]="_visible"
      [cdkConnectedOverlayPush]="cdkConnectedOverlayPush"
      [nzArrowPointAtCenter]="nzArrowPointAtCenter"
      (overlayOutsideClick)="onClickOutside($event)"
      (detach)="hide()"
      (positionChange)="onPositionChange($event)"
    >
      <div
        class="ant-popover"
        [class.ant-popover-rtl]="dir === 'rtl'"
        [class]="_classMap"
        [style]="nzOverlayStyle"
        [@.disabled]="!!noAnimation?.nzNoAnimation"
        [nzNoAnimation]="noAnimation?.nzNoAnimation"
        [@zoomBigMotion]="'active'"
      >
        <div class="ant-popover-content">
          <div class="ant-popover-arrow">
            <span class="ant-popover-arrow-content"></span>
          </div>
          <div class="ant-popover-inner" role="tooltip">
            <div>
              @if (nzTitle) {
                <div class="ant-popover-title">
                  <ng-container *nzStringTemplateOutlet="nzTitle; context: { $implicit: nzTitleContext }">
                    {{ nzTitle }}
                  </ng-container>
                </div>
              }
              <div class="ant-popover-inner-content">
                <ng-container *nzStringTemplateOutlet="nzContent; context: { $implicit: nzContentContext }">
                  {{ nzContent }}
                </ng-container>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
      imports: [OverlayModule, NzOverlayModule, NzNoAnimationDirective, NzOutletModule]
    }]
  }], null, null);
})();
var NzPopoverModule = class _NzPopoverModule {
  static ɵfac = function NzPopoverModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzPopoverModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _NzPopoverModule,
    imports: [NzPopoverDirective, NzPopoverComponent],
    exports: [NzPopoverDirective, NzPopoverComponent]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [NzPopoverComponent]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzPopoverModule, [{
    type: NgModule,
    args: [{
      imports: [NzPopoverDirective, NzPopoverComponent],
      exports: [NzPopoverDirective, NzPopoverComponent]
    }]
  }], null, null);
})();

export {
  NzPopoverDirective,
  NzPopoverComponent,
  NzPopoverModule
};
//# sourceMappingURL=chunk-XBFUZJXD.js.map
