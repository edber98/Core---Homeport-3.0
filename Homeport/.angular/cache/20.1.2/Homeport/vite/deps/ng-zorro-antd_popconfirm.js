import {
  NzTooltipBaseDirective,
  NzTooltipComponent
} from "./chunk-G5PAEZG4.js";
import {
  NzI18nModule,
  NzI18nPipe
} from "./chunk-EM2WCZXX.js";
import {
  NzConnectedOverlayDirective,
  NzOverlayModule
} from "./chunk-N5DFO3JY.js";
import {
  NzButtonComponent,
  NzButtonModule
} from "./chunk-YJ6H2KUM.js";
import {
  NzTransitionPatchDirective
} from "./chunk-2UMYPTEY.js";
import {
  NzWaveDirective
} from "./chunk-NJIMKKFA.js";
import {
  CdkConnectedOverlay,
  OverlayModule
} from "./chunk-NE3ZETXZ.js";
import "./chunk-3GCQTVMX.js";
import "./chunk-ASI6M5Y7.js";
import {
  A11yModule,
  CdkTrapFocus
} from "./chunk-6QLLGJOB.js";
import "./chunk-YCAQCVJE.js";
import "./chunk-76DJI4FU.js";
import {
  NzNoAnimationDirective
} from "./chunk-D43TDAJ6.js";
import {
  zoomBigMotion
} from "./chunk-ZSNB6WH7.js";
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
  WithConfig
} from "./chunk-CMJBQ6NS.js";
import {
  takeUntilDestroyed
} from "./chunk-ZOU6Z72P.js";
import {
  wrapIntoObservable
} from "./chunk-EI4RHGFP.js";
import "./chunk-X7WAN5DI.js";
import "./chunk-OOGKVRFN.js";
import "./chunk-PI5QEHHS.js";
import "./chunk-UJCZ6AKW.js";
import "./chunk-7R335IKT.js";
import "./chunk-NKTOFDYH.js";
import "./chunk-4NJAG2UW.js";
import "./chunk-F4JKROYU.js";
import "./chunk-N5LWPDVE.js";
import "./chunk-I7WV2ST6.js";
import "./chunk-BNB64QCY.js";
import "./chunk-ZHBKS434.js";
import "./chunk-JH6JEFGR.js";
import "./chunk-636JCMZ5.js";
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  NgModule,
  Output,
  ViewChildren,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
  setClassMetadata,
  signal,
  ɵɵInheritDefinitionFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdeclareLet,
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
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵproperty,
  ɵɵqueryRefresh,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleMap,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵviewQuery
} from "./chunk-773N7WSB.js";
import "./chunk-4HUDV5O3.js";
import "./chunk-AKIDERDD.js";
import {
  Subject,
  __esDecorate,
  __runInitializers,
  filter,
  finalize,
  first
} from "./chunk-BO5NHC5P.js";
import {
  __publicField,
  __spreadProps,
  __spreadValues
} from "./chunk-ZY5HDIHX.js";

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-popconfirm.mjs
var _c0 = ["okBtn"];
var _c1 = ["cancelBtn"];
function NzPopconfirmComponent_ng_template_0_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 6);
    ɵɵelement(1, "span", 14);
    ɵɵelementEnd();
  }
}
function NzPopconfirmComponent_ng_template_0_ng_container_7_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵelementStart(1, "span", 17);
    ɵɵelement(2, "nz-icon", 18);
    ɵɵelementEnd();
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const icon_r3 = ctx.$implicit;
    ɵɵadvance(2);
    ɵɵproperty("nzType", icon_r3 || "exclamation-circle");
  }
}
function NzPopconfirmComponent_ng_template_0_ng_container_7_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, NzPopconfirmComponent_ng_template_0_ng_container_7_ng_container_1_Template, 3, 1, "ng-container", 15);
    ɵɵelementStart(2, "div", 16);
    ɵɵtext(3);
    ɵɵelementEnd();
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r3 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵproperty("nzStringTemplateOutlet", ctx_r3.nzIcon);
    ɵɵadvance(2);
    ɵɵtextInterpolate(ctx_r3.nzTitle);
  }
}
function NzPopconfirmComponent_ng_template_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div", 4)(1, "div", 5);
    ɵɵconditionalCreate(2, NzPopconfirmComponent_ng_template_0_Conditional_2_Template, 2, 0, "div", 6);
    ɵɵelementStart(3, "div", 7)(4, "div")(5, "div", 8)(6, "div", 9);
    ɵɵtemplate(7, NzPopconfirmComponent_ng_template_0_ng_container_7_Template, 4, 2, "ng-container", 10);
    ɵɵelementEnd();
    ɵɵelementStart(8, "div", 11)(9, "button", 12, 1);
    ɵɵlistener("click", function NzPopconfirmComponent_ng_template_0_Template_button_click_9_listener() {
      ɵɵrestoreView(_r2);
      const ctx_r3 = ɵɵnextContext();
      return ɵɵresetView(ctx_r3.onCancel());
    });
    ɵɵdeclareLet(11);
    ɵɵpipe(12, "nzI18n");
    ɵɵtext(13);
    ɵɵelementEnd();
    ɵɵelementStart(14, "button", 13, 2);
    ɵɵlistener("click", function NzPopconfirmComponent_ng_template_0_Template_button_click_14_listener() {
      ɵɵrestoreView(_r2);
      const ctx_r3 = ɵɵnextContext();
      return ɵɵresetView(ctx_r3.onConfirm());
    });
    ɵɵdeclareLet(16);
    ɵɵpipe(17, "nzI18n");
    ɵɵtext(18);
    ɵɵelementEnd()()()()()()();
  }
  if (rf & 2) {
    let tmp_15_0;
    let tmp_16_0;
    const ctx_r3 = ɵɵnextContext();
    ɵɵstyleMap(ctx_r3.nzOverlayStyle);
    ɵɵclassMap(ctx_r3._classMap);
    ɵɵclassProp("ant-popover-rtl", ctx_r3.dir === "rtl");
    ɵɵproperty("cdkTrapFocusAutoCapture", ctx_r3.nzAutoFocus !== null)("@.disabled", !!(ctx_r3.noAnimation == null ? null : ctx_r3.noAnimation.nzNoAnimation))("nzNoAnimation", ctx_r3.noAnimation == null ? null : ctx_r3.noAnimation.nzNoAnimation)("@zoomBigMotion", "active");
    ɵɵadvance(2);
    ɵɵconditional(ctx_r3.nzPopconfirmShowArrow ? 2 : -1);
    ɵɵadvance(5);
    ɵɵproperty("nzStringTemplateOutlet", ctx_r3.nzTitle)("nzStringTemplateOutletContext", ctx_r3.nzTitleContext);
    ɵɵadvance(2);
    ɵɵproperty("nzSize", "small")("nzDanger", (tmp_15_0 = ctx_r3.nzCancelButtonProps()) == null ? null : tmp_15_0.nzDanger)("disabled", (tmp_16_0 = ctx_r3.nzCancelButtonProps()) == null ? null : tmp_16_0.nzDisabled);
    ɵɵattribute("cdkFocusInitial", ctx_r3.nzAutoFocus === "cancel" || null);
    const cancelText_r5 = ctx_r3.nzCancelText() || ɵɵpipeBind1(12, 25, "Modal.cancelText");
    ɵɵadvance(4);
    ɵɵtextInterpolate1(" ", cancelText_r5, " ");
    ɵɵadvance();
    ɵɵproperty("nzSize", "small")("nzType", ctx_r3.nzOkButtonProps().nzType)("nzDanger", ctx_r3.nzOkButtonProps().nzDanger)("nzLoading", ctx_r3.confirmLoading)("disabled", ctx_r3.nzOkButtonProps().nzDisabled);
    ɵɵattribute("cdkFocusInitial", ctx_r3.nzAutoFocus === "ok" || null);
    const okText_r6 = ctx_r3.nzOkText() || ɵɵpipeBind1(17, 27, "Modal.okText");
    ɵɵadvance(4);
    ɵɵtextInterpolate1(" ", okText_r6, " ");
  }
}
var NZ_CONFIG_MODULE_NAME = "popconfirm";
var NzPopconfirmDirective = (() => {
  var _a;
  let _classSuper = NzTooltipBaseDirective;
  let _nzPopconfirmBackdrop_decorators;
  let _nzPopconfirmBackdrop_initializers = [];
  let _nzPopconfirmBackdrop_extraInitializers = [];
  let _nzAutofocus_decorators;
  let _nzAutofocus_initializers = [];
  let _nzAutofocus_extraInitializers = [];
  return _a = class extends _classSuper {
    _nzModuleName = NZ_CONFIG_MODULE_NAME;
    /* eslint-disable @angular-eslint/no-input-rename, @angular-eslint/no-output-rename */
    arrowPointAtCenter;
    title;
    titleContext = null;
    directiveTitle;
    trigger = "click";
    placement = "top";
    origin;
    mouseEnterDelay;
    mouseLeaveDelay;
    overlayClassName;
    overlayStyle;
    visible;
    nzBeforeConfirm;
    nzIcon;
    nzCondition = false;
    nzPopconfirmShowArrow = true;
    nzPopconfirmBackdrop = __runInitializers(this, _nzPopconfirmBackdrop_initializers, false);
    nzAutofocus = (__runInitializers(this, _nzPopconfirmBackdrop_extraInitializers), __runInitializers(this, _nzAutofocus_initializers, null));
    nzOkText = (__runInitializers(this, _nzAutofocus_extraInitializers), input(null, ...ngDevMode ? [{
      debugName: "nzOkText"
    }] : []));
    nzOkType = input("primary", ...ngDevMode ? [{
      debugName: "nzOkType"
    }] : []);
    nzCancelText = input(null, ...ngDevMode ? [{
      debugName: "nzCancelText"
    }] : []);
    nzOkButtonProps = input(null, ...ngDevMode ? [{
      debugName: "nzOkButtonProps"
    }] : []);
    nzCancelButtonProps = input(null, ...ngDevMode ? [{
      debugName: "nzCancelButtonProps"
    }] : []);
    /**
     * @deprecated v21
     * please use the nzOkButton object input to describe option of the ok button
     */
    nzOkDisabled = input(false, ...ngDevMode ? [{
      debugName: "nzOkDisabled",
      transform: booleanAttribute
    }] : [{
      transform: booleanAttribute
    }]);
    /**
     * @deprecated v21
     * please use the nzOkButton object input to describe option of the ok button
     */
    nzOkDanger = input(false, ...ngDevMode ? [{
      debugName: "nzOkDanger",
      transform: booleanAttribute
    }] : [{
      transform: booleanAttribute
    }]);
    okButtonProps = computed(() => __spreadProps(__spreadValues({}, this.nzOkButtonProps()), {
      nzType: this.nzOkButtonProps()?.nzType || this.nzOkType() === "danger" ? "primary" : this.nzOkType(),
      nzDanger: this.nzOkDanger() || this.nzOkButtonProps()?.nzDanger || this.nzOkType() === "danger",
      nzDisabled: this.nzOkDisabled() || this.nzOkButtonProps()?.nzDisabled
    }), ...ngDevMode ? [{
      debugName: "okButtonProps"
    }] : []);
    cancelButtonProps = computed(() => __spreadValues({}, this.nzCancelButtonProps()), ...ngDevMode ? [{
      debugName: "cancelButtonProps"
    }] : []);
    directiveContent = null;
    content = null;
    overlayClickable;
    visibleChange = new EventEmitter();
    nzOnCancel = new EventEmitter();
    nzOnConfirm = new EventEmitter();
    getProxyPropertyMap() {
      return __spreadValues({
        nzOkText: ["nzOkText", () => this.nzOkText],
        nzCancelText: ["nzCancelText", () => this.nzCancelText],
        nzOkButtonProps: ["nzOkButtonProps", () => this.okButtonProps],
        nzCancelButtonProps: ["nzCancelButtonProps", () => this.cancelButtonProps],
        nzBeforeConfirm: ["nzBeforeConfirm", () => this.nzBeforeConfirm],
        nzCondition: ["nzCondition", () => this.nzCondition],
        nzIcon: ["nzIcon", () => this.nzIcon],
        nzPopconfirmShowArrow: ["nzPopconfirmShowArrow", () => this.nzPopconfirmShowArrow],
        nzPopconfirmBackdrop: ["nzBackdrop", () => this.nzPopconfirmBackdrop],
        nzPopconfirmContext: ["nzTitleContext", () => this.titleContext],
        nzAutoFocus: ["nzAutoFocus", () => this.nzAutofocus]
      }, super.getProxyPropertyMap());
    }
    constructor() {
      super(NzPopconfirmComponent);
    }
    /**
     * @override
     */
    createComponent() {
      super.createComponent();
      this.component.nzOnCancel.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.nzOnCancel.emit();
      });
      this.component.nzOnConfirm.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.nzOnConfirm.emit();
      });
    }
  }, (() => {
    const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
    _nzPopconfirmBackdrop_decorators = [WithConfig()];
    _nzAutofocus_decorators = [WithConfig()];
    __esDecorate(null, null, _nzPopconfirmBackdrop_decorators, {
      kind: "field",
      name: "nzPopconfirmBackdrop",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzPopconfirmBackdrop" in obj,
        get: (obj) => obj.nzPopconfirmBackdrop,
        set: (obj, value) => {
          obj.nzPopconfirmBackdrop = value;
        }
      },
      metadata: _metadata
    }, _nzPopconfirmBackdrop_initializers, _nzPopconfirmBackdrop_extraInitializers);
    __esDecorate(null, null, _nzAutofocus_decorators, {
      kind: "field",
      name: "nzAutofocus",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzAutofocus" in obj,
        get: (obj) => obj.nzAutofocus,
        set: (obj, value) => {
          obj.nzAutofocus = value;
        }
      },
      metadata: _metadata
    }, _nzAutofocus_initializers, _nzAutofocus_extraInitializers);
    if (_metadata) Object.defineProperty(_a, Symbol.metadata, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: _metadata
    });
  })(), __publicField(_a, "ɵfac", function NzPopconfirmDirective_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _a)();
  }), __publicField(_a, "ɵdir", ɵɵdefineDirective({
    type: _a,
    selectors: [["", "nz-popconfirm", ""]],
    hostVars: 2,
    hostBindings: function NzPopconfirmDirective_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵclassProp("ant-popover-open", ctx.visible);
      }
    },
    inputs: {
      arrowPointAtCenter: [2, "nzPopconfirmArrowPointAtCenter", "arrowPointAtCenter", booleanAttribute],
      title: [0, "nzPopconfirmTitle", "title"],
      titleContext: [0, "nzPopconfirmTitleContext", "titleContext"],
      directiveTitle: [0, "nz-popconfirm", "directiveTitle"],
      trigger: [0, "nzPopconfirmTrigger", "trigger"],
      placement: [0, "nzPopconfirmPlacement", "placement"],
      origin: [0, "nzPopconfirmOrigin", "origin"],
      mouseEnterDelay: [0, "nzPopconfirmMouseEnterDelay", "mouseEnterDelay"],
      mouseLeaveDelay: [0, "nzPopconfirmMouseLeaveDelay", "mouseLeaveDelay"],
      overlayClassName: [0, "nzPopconfirmOverlayClassName", "overlayClassName"],
      overlayStyle: [0, "nzPopconfirmOverlayStyle", "overlayStyle"],
      visible: [0, "nzPopconfirmVisible", "visible"],
      nzBeforeConfirm: "nzBeforeConfirm",
      nzIcon: "nzIcon",
      nzCondition: [2, "nzCondition", "nzCondition", booleanAttribute],
      nzPopconfirmShowArrow: [2, "nzPopconfirmShowArrow", "nzPopconfirmShowArrow", booleanAttribute],
      nzPopconfirmBackdrop: "nzPopconfirmBackdrop",
      nzAutofocus: "nzAutofocus",
      nzOkText: [1, "nzOkText"],
      nzOkType: [1, "nzOkType"],
      nzCancelText: [1, "nzCancelText"],
      nzOkButtonProps: [1, "nzOkButtonProps"],
      nzCancelButtonProps: [1, "nzCancelButtonProps"],
      nzOkDisabled: [1, "nzOkDisabled"],
      nzOkDanger: [1, "nzOkDanger"]
    },
    outputs: {
      visibleChange: "nzPopconfirmVisibleChange",
      nzOnCancel: "nzOnCancel",
      nzOnConfirm: "nzOnConfirm"
    },
    exportAs: ["nzPopconfirm"],
    features: [ɵɵInheritDefinitionFeature]
  })), _a;
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzPopconfirmDirective, [{
    type: Directive,
    args: [{
      selector: "[nz-popconfirm]",
      exportAs: "nzPopconfirm",
      host: {
        "[class.ant-popover-open]": "visible"
      }
    }]
  }], () => [], {
    arrowPointAtCenter: [{
      type: Input,
      args: [{
        alias: "nzPopconfirmArrowPointAtCenter",
        transform: booleanAttribute
      }]
    }],
    title: [{
      type: Input,
      args: ["nzPopconfirmTitle"]
    }],
    titleContext: [{
      type: Input,
      args: ["nzPopconfirmTitleContext"]
    }],
    directiveTitle: [{
      type: Input,
      args: ["nz-popconfirm"]
    }],
    trigger: [{
      type: Input,
      args: ["nzPopconfirmTrigger"]
    }],
    placement: [{
      type: Input,
      args: ["nzPopconfirmPlacement"]
    }],
    origin: [{
      type: Input,
      args: ["nzPopconfirmOrigin"]
    }],
    mouseEnterDelay: [{
      type: Input,
      args: ["nzPopconfirmMouseEnterDelay"]
    }],
    mouseLeaveDelay: [{
      type: Input,
      args: ["nzPopconfirmMouseLeaveDelay"]
    }],
    overlayClassName: [{
      type: Input,
      args: ["nzPopconfirmOverlayClassName"]
    }],
    overlayStyle: [{
      type: Input,
      args: ["nzPopconfirmOverlayStyle"]
    }],
    visible: [{
      type: Input,
      args: ["nzPopconfirmVisible"]
    }],
    nzBeforeConfirm: [{
      type: Input
    }],
    nzIcon: [{
      type: Input
    }],
    nzCondition: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    nzPopconfirmShowArrow: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    nzPopconfirmBackdrop: [{
      type: Input
    }],
    nzAutofocus: [{
      type: Input
    }],
    visibleChange: [{
      type: Output,
      args: ["nzPopconfirmVisibleChange"]
    }],
    nzOnCancel: [{
      type: Output
    }],
    nzOnConfirm: [{
      type: Output
    }]
  });
})();
var NzPopconfirmComponent = class _NzPopconfirmComponent extends NzTooltipComponent {
  okBtn;
  cancelBtn;
  nzCondition = false;
  nzPopconfirmShowArrow = true;
  nzIcon;
  nzAutoFocus = null;
  nzBeforeConfirm = null;
  nzOkText = signal(null, ...ngDevMode ? [{
    debugName: "nzOkText"
  }] : []);
  nzCancelText = signal(null, ...ngDevMode ? [{
    debugName: "nzCancelText"
  }] : []);
  nzOkButtonProps = signal({
    nzType: "primary"
  }, ...ngDevMode ? [{
    debugName: "nzOkButtonProps"
  }] : []);
  nzCancelButtonProps = signal(null, ...ngDevMode ? [{
    debugName: "nzCancelButtonProps"
  }] : []);
  nzOnCancel = new Subject();
  nzOnConfirm = new Subject();
  _trigger = "click";
  elementFocusedBeforeModalWasOpened = null;
  document = inject(DOCUMENT);
  _prefix = "ant-popover";
  confirmLoading = false;
  constructor() {
    super();
    this.destroyRef.onDestroy(() => {
      this.nzVisibleChange.complete();
    });
  }
  /**
   * @override
   */
  show() {
    if (!this.nzCondition) {
      this.capturePreviouslyFocusedElement();
      super.show();
    } else {
      this.onConfirm();
    }
  }
  hide() {
    super.hide();
    this.restoreFocus();
  }
  handleConfirm() {
    this.nzOnConfirm.next();
    super.hide();
  }
  onCancel() {
    this.nzOnCancel.next();
    super.hide();
  }
  onConfirm() {
    if (this.nzBeforeConfirm) {
      this.confirmLoading = true;
      this.cdr.markForCheck();
      wrapIntoObservable(this.nzBeforeConfirm()).pipe(first(), filter(Boolean), finalize(() => {
        this.confirmLoading = false;
        this.cdr.markForCheck();
      })).subscribe(() => this.handleConfirm());
    } else {
      this.handleConfirm();
    }
  }
  capturePreviouslyFocusedElement() {
    if (this.document) {
      this.elementFocusedBeforeModalWasOpened = this.document.activeElement;
    }
  }
  restoreFocus() {
    const toFocus = this.elementFocusedBeforeModalWasOpened;
    if (toFocus && typeof toFocus.focus === "function") {
      const activeElement = this.document.activeElement;
      const element = this.elementRef.nativeElement;
      if (!activeElement || activeElement === this.document.body || activeElement === element || element.contains(activeElement)) {
        toFocus.focus();
      }
    }
  }
  static ɵfac = function NzPopconfirmComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzPopconfirmComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _NzPopconfirmComponent,
    selectors: [["nz-popconfirm"]],
    viewQuery: function NzPopconfirmComponent_Query(rf, ctx) {
      if (rf & 1) {
        ɵɵviewQuery(_c0, 5, ElementRef);
        ɵɵviewQuery(_c1, 5, ElementRef);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.okBtn = _t);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.cancelBtn = _t);
      }
    },
    exportAs: ["nzPopconfirmComponent"],
    features: [ɵɵInheritDefinitionFeature],
    decls: 2,
    vars: 6,
    consts: [["overlay", "cdkConnectedOverlay"], ["cancelBtn", ""], ["okBtn", ""], ["cdkConnectedOverlay", "", "nzConnectedOverlay", "", 3, "overlayOutsideClick", "detach", "positionChange", "cdkConnectedOverlayHasBackdrop", "cdkConnectedOverlayOrigin", "cdkConnectedOverlayPositions", "cdkConnectedOverlayOpen", "cdkConnectedOverlayPush", "nzArrowPointAtCenter"], ["cdkTrapFocus", "", 1, "ant-popover", 3, "cdkTrapFocusAutoCapture", "nzNoAnimation"], [1, "ant-popover-content"], [1, "ant-popover-arrow"], [1, "ant-popover-inner"], [1, "ant-popover-inner-content"], [1, "ant-popover-message"], [4, "nzStringTemplateOutlet", "nzStringTemplateOutletContext"], [1, "ant-popover-buttons"], ["nz-button", "", 3, "click", "nzSize", "nzDanger", "disabled"], ["nz-button", "", 3, "click", "nzSize", "nzType", "nzDanger", "nzLoading", "disabled"], [1, "ant-popover-arrow-content"], [4, "nzStringTemplateOutlet"], [1, "ant-popover-message-title"], [1, "ant-popover-message-icon"], ["nzTheme", "fill", 3, "nzType"]],
    template: function NzPopconfirmComponent_Template(rf, ctx) {
      if (rf & 1) {
        const _r1 = ɵɵgetCurrentView();
        ɵɵtemplate(0, NzPopconfirmComponent_ng_template_0_Template, 19, 29, "ng-template", 3, 0, ɵɵtemplateRefExtractor);
        ɵɵlistener("overlayOutsideClick", function NzPopconfirmComponent_Template_ng_template_overlayOutsideClick_0_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.onClickOutside($event));
        })("detach", function NzPopconfirmComponent_Template_ng_template_detach_0_listener() {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.hide());
        })("positionChange", function NzPopconfirmComponent_Template_ng_template_positionChange_0_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.onPositionChange($event));
        });
      }
      if (rf & 2) {
        ɵɵproperty("cdkConnectedOverlayHasBackdrop", ctx.nzBackdrop)("cdkConnectedOverlayOrigin", ctx.origin)("cdkConnectedOverlayPositions", ctx._positions)("cdkConnectedOverlayOpen", ctx._visible)("cdkConnectedOverlayPush", ctx.cdkConnectedOverlayPush)("nzArrowPointAtCenter", ctx.nzArrowPointAtCenter);
      }
    },
    dependencies: [OverlayModule, CdkConnectedOverlay, NzOverlayModule, NzConnectedOverlayDirective, A11yModule, CdkTrapFocus, NzNoAnimationDirective, NzOutletModule, NzStringTemplateOutletDirective, NzIconModule, NzIconDirective, NzButtonModule, NzButtonComponent, NzTransitionPatchDirective, NzWaveDirective, NzI18nModule, NzI18nPipe],
    encapsulation: 2,
    data: {
      animation: [zoomBigMotion]
    },
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzPopconfirmComponent, [{
    type: Component,
    args: [{
      selector: "nz-popconfirm",
      exportAs: "nzPopconfirmComponent",
      animations: [zoomBigMotion],
      template: `
    <ng-template
      #overlay="cdkConnectedOverlay"
      cdkConnectedOverlay
      nzConnectedOverlay
      [cdkConnectedOverlayHasBackdrop]="nzBackdrop"
      [cdkConnectedOverlayOrigin]="origin"
      (overlayOutsideClick)="onClickOutside($event)"
      (detach)="hide()"
      (positionChange)="onPositionChange($event)"
      [cdkConnectedOverlayPositions]="_positions"
      [cdkConnectedOverlayOpen]="_visible"
      [cdkConnectedOverlayPush]="cdkConnectedOverlayPush"
      [nzArrowPointAtCenter]="nzArrowPointAtCenter"
    >
      <div
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="nzAutoFocus !== null"
        class="ant-popover"
        [class]="_classMap"
        [class.ant-popover-rtl]="dir === 'rtl'"
        [style]="nzOverlayStyle"
        [@.disabled]="!!noAnimation?.nzNoAnimation"
        [nzNoAnimation]="noAnimation?.nzNoAnimation"
        [@zoomBigMotion]="'active'"
      >
        <div class="ant-popover-content">
          @if (nzPopconfirmShowArrow) {
            <div class="ant-popover-arrow">
              <span class="ant-popover-arrow-content"></span>
            </div>
          }
          <div class="ant-popover-inner">
            <div>
              <div class="ant-popover-inner-content">
                <div class="ant-popover-message">
                  <ng-container *nzStringTemplateOutlet="nzTitle; context: nzTitleContext">
                    <ng-container *nzStringTemplateOutlet="nzIcon; let icon">
                      <span class="ant-popover-message-icon">
                        <nz-icon [nzType]="icon || 'exclamation-circle'" nzTheme="fill" />
                      </span>
                    </ng-container>
                    <div class="ant-popover-message-title">{{ nzTitle }}</div>
                  </ng-container>
                </div>
                <div class="ant-popover-buttons">
                  <button
                    nz-button
                    #cancelBtn
                    [nzSize]="'small'"
                    [nzDanger]="nzCancelButtonProps()?.nzDanger"
                    (click)="onCancel()"
                    [disabled]="nzCancelButtonProps()?.nzDisabled"
                    [attr.cdkFocusInitial]="nzAutoFocus === 'cancel' || null"
                  >
                    @let cancelText = nzCancelText() || ('Modal.cancelText' | nzI18n);
                    {{ cancelText }}
                  </button>
                  <button
                    nz-button
                    #okBtn
                    [nzSize]="'small'"
                    [nzType]="nzOkButtonProps().nzType"
                    [nzDanger]="nzOkButtonProps().nzDanger"
                    [nzLoading]="confirmLoading"
                    [disabled]="nzOkButtonProps().nzDisabled"
                    (click)="onConfirm()"
                    [attr.cdkFocusInitial]="nzAutoFocus === 'ok' || null"
                  >
                    @let okText = nzOkText() || ('Modal.okText' | nzI18n);
                    {{ okText }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
      imports: [OverlayModule, NzOverlayModule, A11yModule, NzNoAnimationDirective, NzOutletModule, NzIconModule, NzButtonModule, NzI18nModule],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None
    }]
  }], () => [], {
    okBtn: [{
      type: ViewChildren,
      args: ["okBtn", {
        read: ElementRef
      }]
    }],
    cancelBtn: [{
      type: ViewChildren,
      args: ["cancelBtn", {
        read: ElementRef
      }]
    }]
  });
})();
var NzPopconfirmModule = class _NzPopconfirmModule {
  static ɵfac = function NzPopconfirmModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzPopconfirmModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _NzPopconfirmModule,
    imports: [NzPopconfirmComponent, NzPopconfirmDirective],
    exports: [NzPopconfirmComponent, NzPopconfirmDirective]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [NzPopconfirmComponent]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzPopconfirmModule, [{
    type: NgModule,
    args: [{
      imports: [NzPopconfirmComponent, NzPopconfirmDirective],
      exports: [NzPopconfirmComponent, NzPopconfirmDirective]
    }]
  }], null, null);
})();
export {
  NzPopconfirmComponent,
  NzPopconfirmDirective,
  NzPopconfirmModule
};
//# sourceMappingURL=ng-zorro-antd_popconfirm.js.map
