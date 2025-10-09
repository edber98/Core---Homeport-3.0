import {
  NzOutletModule,
  NzStringTemplateOutletDirective
} from "./chunk-YXUNP23K.js";
import {
  NzIconDirective,
  NzIconModule
} from "./chunk-HV6NOEIW.js";
import "./chunk-BQ76GOFF.js";
import {
  WithConfig,
  onConfigChangeEventForComponent
} from "./chunk-CMJBQ6NS.js";
import {
  takeUntilDestroyed
} from "./chunk-ZOU6Z72P.js";
import {
  fromEventOutsideAngular,
  isNotNil,
  numberAttributeWithZeroFallback,
  toBoolean
} from "./chunk-EI4RHGFP.js";
import "./chunk-DGKVKYZV.js";
import "./chunk-I7WV2ST6.js";
import "./chunk-N5LWPDVE.js";
import {
  Directionality
} from "./chunk-BNB64QCY.js";
import "./chunk-PN4PGAHN.js";
import "./chunk-OOGKVRFN.js";
import "./chunk-ZHBKS434.js";
import "./chunk-PI5QEHHS.js";
import {
  NgTemplateOutlet
} from "./chunk-JH6JEFGR.js";
import "./chunk-636JCMZ5.js";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DestroyRef,
  EventEmitter,
  Input,
  NgModule,
  NgZone,
  Output,
  TemplateRef,
  ViewChild,
  ViewEncapsulation,
  booleanAttribute,
  inject,
  numberAttribute,
  setClassMetadata,
  ɵɵNgOnChangesFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵcontentQuery,
  ɵɵdefineComponent,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵelement,
  ɵɵelementContainerEnd,
  ɵɵelementContainerStart,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵloadQuery,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵpureFunction3,
  ɵɵqueryRefresh,
  ɵɵreference,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIndex,
  ɵɵstyleMap,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵviewQuery
} from "./chunk-773N7WSB.js";
import "./chunk-AKIDERDD.js";
import {
  merge
} from "./chunk-4HUDV5O3.js";
import {
  Subject,
  Subscription,
  __esDecorate,
  __runInitializers,
  filter,
  startWith
} from "./chunk-BO5NHC5P.js";
import {
  __objRest,
  __publicField
} from "./chunk-ZY5HDIHX.js";

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-progress.mjs
var _c0 = (a0) => ({
  $implicit: a0
});
function NzProgressComponent_ng_template_0_Conditional_0_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "nz-icon", 3);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(3);
    ɵɵproperty("nzType", ctx_r0.icon);
  }
}
function NzProgressComponent_ng_template_0_Conditional_0_Conditional_2_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const formatter_r2 = ctx.$implicit;
    const ctx_r0 = ɵɵnextContext(4);
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", formatter_r2(ctx_r0.nzPercent), " ");
  }
}
function NzProgressComponent_ng_template_0_Conditional_0_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, NzProgressComponent_ng_template_0_Conditional_0_Conditional_2_ng_container_0_Template, 2, 1, "ng-container", 4);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(3);
    ɵɵproperty("nzStringTemplateOutlet", ctx_r0.formatter)("nzStringTemplateOutletContext", ɵɵpureFunction1(2, _c0, ctx_r0.nzPercent));
  }
}
function NzProgressComponent_ng_template_0_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 2);
    ɵɵconditionalCreate(1, NzProgressComponent_ng_template_0_Conditional_0_Conditional_1_Template, 1, 1, "nz-icon", 3)(2, NzProgressComponent_ng_template_0_Conditional_0_Conditional_2_Template, 1, 4, "ng-container");
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵconditional((ctx_r0.status === "exception" || ctx_r0.status === "success") && !ctx_r0.nzFormat ? 1 : 2);
  }
}
function NzProgressComponent_ng_template_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵconditionalCreate(0, NzProgressComponent_ng_template_0_Conditional_0_Template, 3, 1, "span", 2);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵconditional(ctx_r0.nzShowInfo ? 0 : -1);
  }
}
function NzProgressComponent_Conditional_3_Conditional_1_For_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "div", 8);
  }
  if (rf & 2) {
    const step_r3 = ctx.$implicit;
    ɵɵstyleMap(step_r3);
  }
}
function NzProgressComponent_Conditional_3_Conditional_1_ng_template_3_Template(rf, ctx) {
}
function NzProgressComponent_Conditional_3_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 5);
    ɵɵrepeaterCreate(1, NzProgressComponent_Conditional_3_Conditional_1_For_2_Template, 1, 2, "div", 6, ɵɵrepeaterTrackByIndex);
    ɵɵtemplate(3, NzProgressComponent_Conditional_3_Conditional_1_ng_template_3_Template, 0, 0, "ng-template", 7);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    const progressInfoTemplate_r4 = ɵɵreference(1);
    ɵɵadvance();
    ɵɵrepeater(ctx_r0.steps);
    ɵɵadvance(2);
    ɵɵproperty("ngTemplateOutlet", progressInfoTemplate_r4);
  }
}
function NzProgressComponent_Conditional_3_Conditional_2_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "div", 13);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(3);
    ɵɵstyleProp("width", ctx_r0.nzSuccessPercent, "%")("border-radius", ctx_r0.nzStrokeLinecap === "round" ? "100px" : "0")("height", ctx_r0.strokeWidth, "px");
  }
}
function NzProgressComponent_Conditional_3_Conditional_2_ng_template_4_Template(rf, ctx) {
}
function NzProgressComponent_Conditional_3_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 9)(1, "div", 10);
    ɵɵelement(2, "div", 11);
    ɵɵconditionalCreate(3, NzProgressComponent_Conditional_3_Conditional_2_Conditional_3_Template, 1, 6, "div", 12);
    ɵɵelementEnd()();
    ɵɵtemplate(4, NzProgressComponent_Conditional_3_Conditional_2_ng_template_4_Template, 0, 0, "ng-template", 7);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    const progressInfoTemplate_r4 = ɵɵreference(1);
    ɵɵadvance(2);
    ɵɵstyleProp("width", ctx_r0.nzPercent, "%")("border-radius", ctx_r0.nzStrokeLinecap === "round" ? "100px" : "0")("background", !ctx_r0.isGradient ? ctx_r0.nzStrokeColor : null)("background-image", ctx_r0.isGradient ? ctx_r0.lineGradient : null)("height", ctx_r0.strokeWidth, "px");
    ɵɵadvance();
    ɵɵconditional(ctx_r0.nzSuccessPercent || ctx_r0.nzSuccessPercent === 0 ? 3 : -1);
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", progressInfoTemplate_r4);
  }
}
function NzProgressComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div");
    ɵɵconditionalCreate(1, NzProgressComponent_Conditional_3_Conditional_1_Template, 4, 1, "div", 5)(2, NzProgressComponent_Conditional_3_Conditional_2_Template, 5, 12);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵconditional(ctx_r0.isSteps ? 1 : 2);
  }
}
function NzProgressComponent_Conditional_4_Conditional_2_For_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵnamespaceSVG();
    ɵɵelement(0, "stop");
  }
  if (rf & 2) {
    const i_r5 = ctx.$implicit;
    ɵɵattribute("offset", i_r5.offset)("stop-color", i_r5.color);
  }
}
function NzProgressComponent_Conditional_4_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵnamespaceSVG();
    ɵɵelementStart(0, "defs")(1, "linearGradient", 17);
    ɵɵrepeaterCreate(2, NzProgressComponent_Conditional_4_Conditional_2_For_3_Template, 1, 2, ":svg:stop", null, ɵɵrepeaterTrackByIndex);
    ɵɵelementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵproperty("id", "gradient-" + ctx_r0.gradientId);
    ɵɵadvance();
    ɵɵrepeater(ctx_r0.circleGradient);
  }
}
function NzProgressComponent_Conditional_4_For_5_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵnamespaceSVG();
    ɵɵelement(0, "path", 18);
  }
  if (rf & 2) {
    const p_r6 = ctx.$implicit;
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵstyleMap(p_r6.strokePathStyle);
    ɵɵattribute("d", ctx_r0.pathString)("stroke-linecap", ctx_r0.nzStrokeLinecap)("stroke", p_r6.stroke)("stroke-width", ctx_r0.nzPercent ? ctx_r0.strokeWidth : 0);
  }
}
function NzProgressComponent_Conditional_4_ng_template_6_Template(rf, ctx) {
}
function NzProgressComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 10);
    ɵɵnamespaceSVG();
    ɵɵelementStart(1, "svg", 14);
    ɵɵconditionalCreate(2, NzProgressComponent_Conditional_4_Conditional_2_Template, 4, 1, ":svg:defs");
    ɵɵelement(3, "path", 15);
    ɵɵrepeaterCreate(4, NzProgressComponent_Conditional_4_For_5_Template, 1, 6, ":svg:path", 16, ɵɵrepeaterTrackByIndex);
    ɵɵelementEnd();
    ɵɵtemplate(6, NzProgressComponent_Conditional_4_ng_template_6_Template, 0, 0, "ng-template", 7);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    const progressInfoTemplate_r4 = ɵɵreference(1);
    ɵɵstyleProp("width", ctx_r0.nzWidth, "px")("height", ctx_r0.nzWidth, "px")("font-size", ctx_r0.nzWidth * 0.15 + 6, "px");
    ɵɵclassProp("ant-progress-circle-gradient", ctx_r0.isGradient);
    ɵɵadvance(2);
    ɵɵconditional(ctx_r0.isGradient ? 2 : -1);
    ɵɵadvance();
    ɵɵstyleMap(ctx_r0.trailPathStyle);
    ɵɵattribute("stroke-width", ctx_r0.strokeWidth)("d", ctx_r0.pathString);
    ɵɵadvance();
    ɵɵrepeater(ctx_r0.progressCirclePath);
    ɵɵadvance(2);
    ɵɵproperty("ngTemplateOutlet", progressInfoTemplate_r4);
  }
}
function stripPercentToNumber(percent) {
  return +percent.replace("%", "");
}
var sortGradient = (gradients) => {
  let tempArr = [];
  Object.keys(gradients).forEach((key) => {
    const value = gradients[key];
    const formatKey = stripPercentToNumber(key);
    if (!isNaN(formatKey)) {
      tempArr.push({
        key: formatKey,
        value
      });
    }
  });
  tempArr = tempArr.sort((a, b) => a.key - b.key);
  return tempArr;
};
var handleCircleGradient = (strokeColor) => sortGradient(strokeColor).map(({
  key,
  value
}) => ({
  offset: `${key}%`,
  color: value
}));
var handleLinearGradient = (strokeColor) => {
  const _a = strokeColor, {
    from = "#1890ff",
    to = "#1890ff",
    direction = "to right"
  } = _a, rest = __objRest(_a, [
    "from",
    "to",
    "direction"
  ]);
  if (Object.keys(rest).length !== 0) {
    const sortedGradients = sortGradient(rest).map(({
      key,
      value
    }) => `${value} ${key}%`).join(", ");
    return `linear-gradient(${direction}, ${sortedGradients})`;
  }
  return `linear-gradient(${direction}, ${from}, ${to})`;
};
var gradientIdSeed = 0;
var NZ_CONFIG_MODULE_NAME = "progress";
var statusIconNameMap = /* @__PURE__ */ new Map([["success", "check"], ["exception", "close"]]);
var statusColorMap = /* @__PURE__ */ new Map([["normal", "#108ee9"], ["exception", "#ff5500"], ["success", "#87d068"]]);
var defaultFormatter = (p) => `${p}%`;
var NzProgressComponent = (() => {
  var _a;
  let _nzShowInfo_decorators;
  let _nzShowInfo_initializers = [];
  let _nzShowInfo_extraInitializers = [];
  let _nzStrokeColor_decorators;
  let _nzStrokeColor_initializers = [];
  let _nzStrokeColor_extraInitializers = [];
  let _nzSize_decorators;
  let _nzSize_initializers = [];
  let _nzSize_extraInitializers = [];
  let _nzStrokeWidth_decorators;
  let _nzStrokeWidth_initializers = [];
  let _nzStrokeWidth_extraInitializers = [];
  let _nzGapDegree_decorators;
  let _nzGapDegree_initializers = [];
  let _nzGapDegree_extraInitializers = [];
  let _nzGapPosition_decorators;
  let _nzGapPosition_initializers = [];
  let _nzGapPosition_extraInitializers = [];
  let _nzStrokeLinecap_decorators;
  let _nzStrokeLinecap_initializers = [];
  let _nzStrokeLinecap_extraInitializers = [];
  return _a = class {
    _nzModuleName = NZ_CONFIG_MODULE_NAME;
    cdr = inject(ChangeDetectorRef);
    directionality = inject(Directionality);
    destroyRef = inject(DestroyRef);
    nzShowInfo = __runInitializers(this, _nzShowInfo_initializers, true);
    nzWidth = (__runInitializers(this, _nzShowInfo_extraInitializers), 132);
    nzStrokeColor = __runInitializers(this, _nzStrokeColor_initializers, void 0);
    nzSize = (__runInitializers(this, _nzStrokeColor_extraInitializers), __runInitializers(this, _nzSize_initializers, "default"));
    nzFormat = __runInitializers(this, _nzSize_extraInitializers);
    nzSuccessPercent;
    nzPercent = 0;
    nzStrokeWidth = __runInitializers(this, _nzStrokeWidth_initializers, void 0);
    nzGapDegree = (__runInitializers(this, _nzStrokeWidth_extraInitializers), __runInitializers(this, _nzGapDegree_initializers, void 0));
    nzStatus = __runInitializers(this, _nzGapDegree_extraInitializers);
    nzType = "line";
    nzGapPosition = __runInitializers(this, _nzGapPosition_initializers, "top");
    nzStrokeLinecap = (__runInitializers(this, _nzGapPosition_extraInitializers), __runInitializers(this, _nzStrokeLinecap_initializers, "round"));
    nzSteps = (__runInitializers(this, _nzStrokeLinecap_extraInitializers), 0);
    steps = [];
    /** Gradient style when `nzType` is `line`. */
    lineGradient = null;
    /** If user uses gradient color. */
    isGradient = false;
    /** If the linear progress is a step progress. */
    isSteps = false;
    /**
     * Each progress whose `nzType` is circle or dashboard should have unique id to
     * define `<linearGradient>`.
     */
    gradientId = gradientIdSeed++;
    /** Paths to rendered in the template. */
    progressCirclePath = [];
    circleGradient;
    trailPathStyle = null;
    pathString;
    icon;
    dir = "ltr";
    get formatter() {
      return this.nzFormat || defaultFormatter;
    }
    get status() {
      return this.nzStatus || this.inferredStatus;
    }
    get strokeWidth() {
      return this.nzStrokeWidth || (this.nzType === "line" && this.nzSize !== "small" ? 8 : 6);
    }
    get isCircleStyle() {
      return this.nzType === "circle" || this.nzType === "dashboard";
    }
    cachedStatus = "normal";
    inferredStatus = "normal";
    constructor() {
      onConfigChangeEventForComponent(NZ_CONFIG_MODULE_NAME, () => {
        this.updateIcon();
        this.setStrokeColor();
        this.getCirclePaths();
      });
    }
    ngOnChanges(changes) {
      const {
        nzSteps,
        nzGapPosition,
        nzStrokeLinecap,
        nzStrokeColor,
        nzGapDegree,
        nzType,
        nzStatus,
        nzPercent,
        nzSuccessPercent,
        nzStrokeWidth
      } = changes;
      if (nzStatus) {
        this.cachedStatus = this.nzStatus || this.cachedStatus;
      }
      if (nzPercent || nzSuccessPercent) {
        const fillAll = parseInt(this.nzPercent.toString(), 10) >= 100;
        if (fillAll) {
          if (isNotNil(this.nzSuccessPercent) && this.nzSuccessPercent >= 100 || this.nzSuccessPercent === void 0) {
            this.inferredStatus = "success";
          }
        } else {
          this.inferredStatus = this.cachedStatus;
        }
      }
      if (nzStatus || nzPercent || nzSuccessPercent || nzStrokeColor) {
        this.updateIcon();
      }
      if (nzStrokeColor) {
        this.setStrokeColor();
      }
      if (nzGapPosition || nzStrokeLinecap || nzGapDegree || nzType || nzPercent || nzStrokeColor || nzStrokeColor) {
        this.getCirclePaths();
      }
      if (nzPercent || nzSteps || nzStrokeWidth) {
        this.isSteps = this.nzSteps > 0;
        if (this.isSteps) {
          this.getSteps();
        }
      }
    }
    ngOnInit() {
      this.directionality.change?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((direction) => {
        this.dir = direction;
        this.cdr.detectChanges();
      });
      this.dir = this.directionality.value;
    }
    updateIcon() {
      const ret = statusIconNameMap.get(this.status);
      this.icon = ret ? ret + (this.isCircleStyle ? "-o" : "-circle-fill") : "";
    }
    /**
     * Calculate step render configs.
     */
    getSteps() {
      const current = Math.floor(this.nzSteps * (this.nzPercent / 100));
      const stepWidth = this.nzSize === "small" ? 2 : 14;
      const steps = [];
      for (let i = 0; i < this.nzSteps; i++) {
        let color;
        if (i <= current - 1) {
          color = this.nzStrokeColor;
        }
        const stepStyle = {
          backgroundColor: `${color}`,
          width: `${stepWidth}px`,
          height: `${this.strokeWidth}px`
        };
        steps.push(stepStyle);
      }
      this.steps = steps;
    }
    /**
     * Calculate paths when the type is circle or dashboard.
     */
    getCirclePaths() {
      if (!this.isCircleStyle) {
        return;
      }
      const values = isNotNil(this.nzSuccessPercent) ? [this.nzSuccessPercent, this.nzPercent] : [this.nzPercent];
      const radius = 50 - this.strokeWidth / 2;
      const gapPosition = this.nzGapPosition || (this.nzType === "circle" ? "top" : "bottom");
      const len = Math.PI * 2 * radius;
      const gapDegree = this.nzGapDegree || (this.nzType === "circle" ? 0 : 75);
      let beginPositionX = 0;
      let beginPositionY = -radius;
      let endPositionX = 0;
      let endPositionY = radius * -2;
      switch (gapPosition) {
        case "left":
          beginPositionX = -radius;
          beginPositionY = 0;
          endPositionX = radius * 2;
          endPositionY = 0;
          break;
        case "right":
          beginPositionX = radius;
          beginPositionY = 0;
          endPositionX = radius * -2;
          endPositionY = 0;
          break;
        case "bottom":
          beginPositionY = radius;
          endPositionY = radius * 2;
          break;
        default:
      }
      this.pathString = `M 50,50 m ${beginPositionX},${beginPositionY}
       a ${radius},${radius} 0 1 1 ${endPositionX},${-endPositionY}
       a ${radius},${radius} 0 1 1 ${-endPositionX},${endPositionY}`;
      this.trailPathStyle = {
        strokeDasharray: `${len - gapDegree}px ${len}px`,
        strokeDashoffset: `-${gapDegree / 2}px`,
        transition: "stroke-dashoffset .3s ease 0s, stroke-dasharray .3s ease 0s, stroke .3s"
      };
      this.progressCirclePath = values.map((value, index) => {
        const isSuccessPercent = values.length === 2 && index === 0;
        return {
          stroke: this.isGradient && !isSuccessPercent ? `url(#gradient-${this.gradientId})` : null,
          strokePathStyle: {
            stroke: !this.isGradient ? isSuccessPercent ? statusColorMap.get("success") : this.nzStrokeColor : null,
            transition: "stroke-dashoffset .3s ease 0s, stroke-dasharray .3s ease 0s, stroke .3s, stroke-width .06s ease .3s",
            strokeDasharray: `${(value || 0) / 100 * (len - gapDegree)}px ${len}px`,
            strokeDashoffset: `-${gapDegree / 2}px`
          }
        };
      }).reverse();
    }
    setStrokeColor() {
      const color = this.nzStrokeColor;
      const isGradient = this.isGradient = !!color && typeof color !== "string";
      if (isGradient && !this.isCircleStyle) {
        this.lineGradient = handleLinearGradient(color);
      } else if (isGradient && this.isCircleStyle) {
        this.circleGradient = handleCircleGradient(this.nzStrokeColor);
      } else {
        this.lineGradient = null;
        this.circleGradient = [];
      }
    }
  }, (() => {
    const _metadata = typeof Symbol === "function" && Symbol.metadata ? /* @__PURE__ */ Object.create(null) : void 0;
    _nzShowInfo_decorators = [WithConfig()];
    _nzStrokeColor_decorators = [WithConfig()];
    _nzSize_decorators = [WithConfig()];
    _nzStrokeWidth_decorators = [WithConfig()];
    _nzGapDegree_decorators = [WithConfig()];
    _nzGapPosition_decorators = [WithConfig()];
    _nzStrokeLinecap_decorators = [WithConfig()];
    __esDecorate(null, null, _nzShowInfo_decorators, {
      kind: "field",
      name: "nzShowInfo",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzShowInfo" in obj,
        get: (obj) => obj.nzShowInfo,
        set: (obj, value) => {
          obj.nzShowInfo = value;
        }
      },
      metadata: _metadata
    }, _nzShowInfo_initializers, _nzShowInfo_extraInitializers);
    __esDecorate(null, null, _nzStrokeColor_decorators, {
      kind: "field",
      name: "nzStrokeColor",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzStrokeColor" in obj,
        get: (obj) => obj.nzStrokeColor,
        set: (obj, value) => {
          obj.nzStrokeColor = value;
        }
      },
      metadata: _metadata
    }, _nzStrokeColor_initializers, _nzStrokeColor_extraInitializers);
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
    __esDecorate(null, null, _nzStrokeWidth_decorators, {
      kind: "field",
      name: "nzStrokeWidth",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzStrokeWidth" in obj,
        get: (obj) => obj.nzStrokeWidth,
        set: (obj, value) => {
          obj.nzStrokeWidth = value;
        }
      },
      metadata: _metadata
    }, _nzStrokeWidth_initializers, _nzStrokeWidth_extraInitializers);
    __esDecorate(null, null, _nzGapDegree_decorators, {
      kind: "field",
      name: "nzGapDegree",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzGapDegree" in obj,
        get: (obj) => obj.nzGapDegree,
        set: (obj, value) => {
          obj.nzGapDegree = value;
        }
      },
      metadata: _metadata
    }, _nzGapDegree_initializers, _nzGapDegree_extraInitializers);
    __esDecorate(null, null, _nzGapPosition_decorators, {
      kind: "field",
      name: "nzGapPosition",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzGapPosition" in obj,
        get: (obj) => obj.nzGapPosition,
        set: (obj, value) => {
          obj.nzGapPosition = value;
        }
      },
      metadata: _metadata
    }, _nzGapPosition_initializers, _nzGapPosition_extraInitializers);
    __esDecorate(null, null, _nzStrokeLinecap_decorators, {
      kind: "field",
      name: "nzStrokeLinecap",
      static: false,
      private: false,
      access: {
        has: (obj) => "nzStrokeLinecap" in obj,
        get: (obj) => obj.nzStrokeLinecap,
        set: (obj, value) => {
          obj.nzStrokeLinecap = value;
        }
      },
      metadata: _metadata
    }, _nzStrokeLinecap_initializers, _nzStrokeLinecap_extraInitializers);
    if (_metadata) Object.defineProperty(_a, Symbol.metadata, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: _metadata
    });
  })(), __publicField(_a, "ɵfac", function NzProgressComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _a)();
  }), __publicField(_a, "ɵcmp", ɵɵdefineComponent({
    type: _a,
    selectors: [["nz-progress"]],
    inputs: {
      nzShowInfo: "nzShowInfo",
      nzWidth: "nzWidth",
      nzStrokeColor: "nzStrokeColor",
      nzSize: "nzSize",
      nzFormat: "nzFormat",
      nzSuccessPercent: [2, "nzSuccessPercent", "nzSuccessPercent", numberAttributeWithZeroFallback],
      nzPercent: [2, "nzPercent", "nzPercent", numberAttribute],
      nzStrokeWidth: [2, "nzStrokeWidth", "nzStrokeWidth", numberAttributeWithZeroFallback],
      nzGapDegree: [2, "nzGapDegree", "nzGapDegree", numberAttributeWithZeroFallback],
      nzStatus: "nzStatus",
      nzType: "nzType",
      nzGapPosition: "nzGapPosition",
      nzStrokeLinecap: "nzStrokeLinecap",
      nzSteps: [2, "nzSteps", "nzSteps", numberAttribute]
    },
    exportAs: ["nzProgress"],
    features: [ɵɵNgOnChangesFeature],
    decls: 5,
    vars: 18,
    consts: [["progressInfoTemplate", ""], [1, "ant-progress-inner", 3, "width", "height", "fontSize", "ant-progress-circle-gradient"], [1, "ant-progress-text"], [3, "nzType"], [4, "nzStringTemplateOutlet", "nzStringTemplateOutletContext"], [1, "ant-progress-steps-outer"], [1, "ant-progress-steps-item", 3, "style"], [3, "ngTemplateOutlet"], [1, "ant-progress-steps-item"], [1, "ant-progress-outer"], [1, "ant-progress-inner"], [1, "ant-progress-bg"], [1, "ant-progress-success-bg", 3, "width", "border-radius", "height"], [1, "ant-progress-success-bg"], ["viewBox", "0 0 100 100", 1, "ant-progress-circle"], ["stroke", "#f3f3f3", "fill-opacity", "0", 1, "ant-progress-circle-trail"], ["fill-opacity", "0", 1, "ant-progress-circle-path", 3, "style"], ["x1", "100%", "y1", "0%", "x2", "0%", "y2", "0%", 3, "id"], ["fill-opacity", "0", 1, "ant-progress-circle-path"]],
    template: function NzProgressComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵtemplate(0, NzProgressComponent_ng_template_0_Template, 1, 1, "ng-template", null, 0, ɵɵtemplateRefExtractor);
        ɵɵelementStart(2, "div");
        ɵɵconditionalCreate(3, NzProgressComponent_Conditional_3_Template, 3, 1, "div");
        ɵɵconditionalCreate(4, NzProgressComponent_Conditional_4_Template, 7, 14, "div", 1);
        ɵɵelementEnd();
      }
      if (rf & 2) {
        ɵɵadvance(2);
        ɵɵclassMap("ant-progress ant-progress-status-" + ctx.status);
        ɵɵclassProp("ant-progress-line", ctx.nzType === "line")("ant-progress-small", ctx.nzSize === "small")("ant-progress-default", ctx.nzSize === "default")("ant-progress-show-info", ctx.nzShowInfo)("ant-progress-circle", ctx.isCircleStyle)("ant-progress-steps", ctx.isSteps)("ant-progress-rtl", ctx.dir === "rtl");
        ɵɵadvance();
        ɵɵconditional(ctx.nzType === "line" ? 3 : -1);
        ɵɵadvance();
        ɵɵconditional(ctx.isCircleStyle ? 4 : -1);
      }
    },
    dependencies: [NzIconModule, NzIconDirective, NzOutletModule, NzStringTemplateOutletDirective, NgTemplateOutlet],
    encapsulation: 2,
    changeDetection: 0
  })), _a;
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzProgressComponent, [{
    type: Component,
    args: [{
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      selector: "nz-progress",
      exportAs: "nzProgress",
      imports: [NzIconModule, NzOutletModule, NgTemplateOutlet],
      template: `
    <ng-template #progressInfoTemplate>
      @if (nzShowInfo) {
        <span class="ant-progress-text">
          @if ((status === 'exception' || status === 'success') && !nzFormat) {
            <nz-icon [nzType]="icon" />
          } @else {
            <ng-container *nzStringTemplateOutlet="formatter; context: { $implicit: nzPercent }; let formatter">
              {{ formatter(nzPercent) }}
            </ng-container>
          }
        </span>
      }
    </ng-template>

    <div
      [class]="'ant-progress ant-progress-status-' + status"
      [class.ant-progress-line]="nzType === 'line'"
      [class.ant-progress-small]="nzSize === 'small'"
      [class.ant-progress-default]="nzSize === 'default'"
      [class.ant-progress-show-info]="nzShowInfo"
      [class.ant-progress-circle]="isCircleStyle"
      [class.ant-progress-steps]="isSteps"
      [class.ant-progress-rtl]="dir === 'rtl'"
    >
      @if (nzType === 'line') {
        <div>
          <!-- normal line style -->
          @if (isSteps) {
            <div class="ant-progress-steps-outer">
              @for (step of steps; track $index) {
                <div class="ant-progress-steps-item" [style]="step"></div>
              }
              <ng-template [ngTemplateOutlet]="progressInfoTemplate" />
            </div>
          } @else {
            <div class="ant-progress-outer">
              <div class="ant-progress-inner">
                <div
                  class="ant-progress-bg"
                  [style.width.%]="nzPercent"
                  [style.border-radius]="nzStrokeLinecap === 'round' ? '100px' : '0'"
                  [style.background]="!isGradient ? nzStrokeColor : null"
                  [style.background-image]="isGradient ? lineGradient : null"
                  [style.height.px]="strokeWidth"
                ></div>
                @if (nzSuccessPercent || nzSuccessPercent === 0) {
                  <div
                    class="ant-progress-success-bg"
                    [style.width.%]="nzSuccessPercent"
                    [style.border-radius]="nzStrokeLinecap === 'round' ? '100px' : '0'"
                    [style.height.px]="strokeWidth"
                  ></div>
                }
              </div>
            </div>
            <ng-template [ngTemplateOutlet]="progressInfoTemplate" />
          }
        </div>
      }
      <!-- line progress -->

      <!-- circle / dashboard progress -->

      @if (isCircleStyle) {
        <div
          [style.width.px]="this.nzWidth"
          [style.height.px]="this.nzWidth"
          [style.fontSize.px]="this.nzWidth * 0.15 + 6"
          class="ant-progress-inner"
          [class.ant-progress-circle-gradient]="isGradient"
        >
          <svg class="ant-progress-circle " viewBox="0 0 100 100">
            @if (isGradient) {
              <defs>
                <linearGradient [id]="'gradient-' + gradientId" x1="100%" y1="0%" x2="0%" y2="0%">
                  @for (i of circleGradient; track $index) {
                    <stop [attr.offset]="i.offset" [attr.stop-color]="i.color"></stop>
                  }
                </linearGradient>
              </defs>
            }

            <path
              class="ant-progress-circle-trail"
              stroke="#f3f3f3"
              fill-opacity="0"
              [attr.stroke-width]="strokeWidth"
              [attr.d]="pathString"
              [style]="trailPathStyle"
            ></path>
            @for (p of progressCirclePath; track $index) {
              <path
                class="ant-progress-circle-path"
                fill-opacity="0"
                [attr.d]="pathString"
                [attr.stroke-linecap]="nzStrokeLinecap"
                [attr.stroke]="p.stroke"
                [attr.stroke-width]="nzPercent ? strokeWidth : 0"
                [style]="p.strokePathStyle"
              ></path>
            }
          </svg>
          <ng-template [ngTemplateOutlet]="progressInfoTemplate" />
        </div>
      }
    </div>
  `
    }]
  }], () => [], {
    nzShowInfo: [{
      type: Input
    }],
    nzWidth: [{
      type: Input
    }],
    nzStrokeColor: [{
      type: Input
    }],
    nzSize: [{
      type: Input
    }],
    nzFormat: [{
      type: Input
    }],
    nzSuccessPercent: [{
      type: Input,
      args: [{
        transform: numberAttributeWithZeroFallback
      }]
    }],
    nzPercent: [{
      type: Input,
      args: [{
        transform: numberAttribute
      }]
    }],
    nzStrokeWidth: [{
      type: Input,
      args: [{
        transform: numberAttributeWithZeroFallback
      }]
    }],
    nzGapDegree: [{
      type: Input,
      args: [{
        transform: numberAttributeWithZeroFallback
      }]
    }],
    nzStatus: [{
      type: Input
    }],
    nzType: [{
      type: Input
    }],
    nzGapPosition: [{
      type: Input
    }],
    nzStrokeLinecap: [{
      type: Input
    }],
    nzSteps: [{
      type: Input,
      args: [{
        transform: numberAttribute
      }]
    }]
  });
})();
var NzProgressModule = class _NzProgressModule {
  static ɵfac = function NzProgressModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzProgressModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _NzProgressModule,
    imports: [NzProgressComponent],
    exports: [NzProgressComponent]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [NzProgressComponent]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzProgressModule, [{
    type: NgModule,
    args: [{
      imports: [NzProgressComponent],
      exports: [NzProgressComponent]
    }]
  }], null, null);
})();

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-steps.mjs
var _c02 = ["processDotTemplate"];
var _c1 = ["itemContainer"];
var _c2 = (a0, a1, a2) => ({
  $implicit: a0,
  status: a1,
  index: a2
});
function NzStepComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "div", 3);
  }
}
function NzStepComponent_Conditional_4_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 11);
    ɵɵelement(1, "nz-progress", 12);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵproperty("nzPercent", ctx_r0.nzPercentage)("nzWidth", ctx_r0.nzSize === "small" ? 32 : 40)("nzFormat", ctx_r0.nullProcessFormat)("nzStrokeWidth", 4);
  }
}
function NzStepComponent_Conditional_4_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 5);
    ɵɵelement(1, "nz-icon", 13);
    ɵɵelementEnd();
  }
}
function NzStepComponent_Conditional_4_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 5);
    ɵɵelement(1, "nz-icon", 14);
    ɵɵelementEnd();
  }
}
function NzStepComponent_Conditional_4_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 5);
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", ctx_r0.index + 1, " ");
  }
}
function NzStepComponent_Conditional_4_Conditional_4_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵelement(1, "nz-icon", 15);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const icon_r2 = ctx.$implicit;
    ɵɵadvance();
    ɵɵproperty("nzType", icon_r2);
  }
}
function NzStepComponent_Conditional_4_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 5);
    ɵɵtemplate(1, NzStepComponent_Conditional_4_Conditional_4_ng_container_1_Template, 2, 1, "ng-container", 8);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵproperty("nzStringTemplateOutlet", ctx_r0.nzIcon);
  }
}
function NzStepComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵconditionalCreate(0, NzStepComponent_Conditional_4_Conditional_0_Template, 2, 4, "div", 11);
    ɵɵconditionalCreate(1, NzStepComponent_Conditional_4_Conditional_1_Template, 2, 0, "span", 5);
    ɵɵconditionalCreate(2, NzStepComponent_Conditional_4_Conditional_2_Template, 2, 0, "span", 5);
    ɵɵconditionalCreate(3, NzStepComponent_Conditional_4_Conditional_3_Template, 2, 1, "span", 5);
    ɵɵconditionalCreate(4, NzStepComponent_Conditional_4_Conditional_4_Template, 2, 1, "span", 5);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵconditional(ctx_r0.showProgress ? 0 : -1);
    ɵɵadvance();
    ɵɵconditional(ctx_r0.nzStatus === "finish" && !ctx_r0.nzIcon ? 1 : -1);
    ɵɵadvance();
    ɵɵconditional(ctx_r0.nzStatus === "error" ? 2 : -1);
    ɵɵadvance();
    ɵɵconditional((ctx_r0.nzStatus === "process" || ctx_r0.nzStatus === "wait") && !ctx_r0.nzIcon ? 3 : -1);
    ɵɵadvance();
    ɵɵconditional(ctx_r0.nzIcon ? 4 : -1);
  }
}
function NzStepComponent_Conditional_5_ng_template_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "span", 17);
  }
}
function NzStepComponent_Conditional_5_ng_template_3_Template(rf, ctx) {
}
function NzStepComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 5);
    ɵɵtemplate(1, NzStepComponent_Conditional_5_ng_template_1_Template, 1, 0, "ng-template", null, 1, ɵɵtemplateRefExtractor)(3, NzStepComponent_Conditional_5_ng_template_3_Template, 0, 0, "ng-template", 16);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const processDotTemplate_r3 = ɵɵreference(2);
    const ctx_r0 = ɵɵnextContext();
    ɵɵadvance(3);
    ɵɵproperty("ngTemplateOutlet", ctx_r0.customProcessTemplate || processDotTemplate_r3)("ngTemplateOutletContext", ɵɵpureFunction3(2, _c2, processDotTemplate_r3, ctx_r0.nzStatus, ctx_r0.index));
  }
}
function NzStepComponent_ng_container_8_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵtextInterpolate(ctx_r0.nzTitle);
  }
}
function NzStepComponent_Conditional_9_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵtextInterpolate(ctx_r0.nzSubtitle);
  }
}
function NzStepComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 9);
    ɵɵtemplate(1, NzStepComponent_Conditional_9_ng_container_1_Template, 2, 1, "ng-container", 8);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵproperty("nzStringTemplateOutlet", ctx_r0.nzSubtitle);
  }
}
function NzStepComponent_ng_container_11_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtext(1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵtextInterpolate(ctx_r0.nzDescription);
  }
}
var _c3 = ["*"];
var NzStepComponent = class _NzStepComponent {
  cdr = inject(ChangeDetectorRef);
  destroyRef = inject(DestroyRef);
  processDotTemplate;
  itemContainer;
  nzTitle;
  nzSubtitle;
  nzDescription;
  nzDisabled = false;
  nzPercentage = null;
  nzSize = "default";
  get nzStatus() {
    return this._status;
  }
  set nzStatus(status) {
    this._status = status;
    this.isCustomStatus = true;
  }
  isCustomStatus = false;
  _status = "wait";
  get nzIcon() {
    return this._icon;
  }
  set nzIcon(value) {
    if (!(value instanceof TemplateRef)) {
      this.oldAPIIcon = typeof value === "string" && value.indexOf("anticon") > -1;
    }
    this._icon = value;
  }
  oldAPIIcon = true;
  _icon;
  customProcessTemplate;
  // Set by parent.
  direction = "horizontal";
  index = 0;
  last = false;
  outStatus = "process";
  showProcessDot = false;
  clickable = false;
  clickOutsideAngular$ = new Subject();
  nullProcessFormat = () => null;
  get showProgress() {
    return this.nzPercentage !== null && !this.nzIcon && this.nzStatus === "process" && this.nzPercentage >= 0 && this.nzPercentage <= 100;
  }
  get currentIndex() {
    return this._currentIndex;
  }
  set currentIndex(current) {
    this._currentIndex = current;
    if (!this.isCustomStatus) {
      this._status = current > this.index ? "finish" : current === this.index ? this.outStatus || "" : "wait";
    }
  }
  _currentIndex = 0;
  ngOnInit() {
    fromEventOutsideAngular(this.itemContainer.nativeElement, "click").pipe(filter(() => this.clickable && this.currentIndex !== this.index && !this.nzDisabled), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clickOutsideAngular$.next(this.index);
    });
  }
  enable() {
    this.nzDisabled = false;
    this.cdr.markForCheck();
  }
  disable() {
    this.nzDisabled = true;
    this.cdr.markForCheck();
  }
  markForCheck() {
    this.cdr.markForCheck();
  }
  static ɵfac = function NzStepComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzStepComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _NzStepComponent,
    selectors: [["nz-step"]],
    viewQuery: function NzStepComponent_Query(rf, ctx) {
      if (rf & 1) {
        ɵɵviewQuery(_c02, 5);
        ɵɵviewQuery(_c1, 7);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.processDotTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.itemContainer = _t.first);
      }
    },
    hostAttrs: [1, "ant-steps-item"],
    hostVars: 16,
    hostBindings: function NzStepComponent_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵclassProp("ant-steps-item-wait", ctx.nzStatus === "wait")("ant-steps-item-process", ctx.nzStatus === "process")("ant-steps-item-finish", ctx.nzStatus === "finish")("ant-steps-item-error", ctx.nzStatus === "error")("ant-steps-item-active", ctx.currentIndex === ctx.index)("ant-steps-item-disabled", ctx.nzDisabled)("ant-steps-item-custom", !!ctx.nzIcon)("ant-steps-next-error", ctx.outStatus === "error" && ctx.currentIndex === ctx.index + 1);
      }
    },
    inputs: {
      nzTitle: "nzTitle",
      nzSubtitle: "nzSubtitle",
      nzDescription: "nzDescription",
      nzDisabled: [2, "nzDisabled", "nzDisabled", booleanAttribute],
      nzPercentage: "nzPercentage",
      nzSize: "nzSize",
      nzStatus: "nzStatus",
      nzIcon: "nzIcon"
    },
    exportAs: ["nzStep"],
    decls: 12,
    vars: 8,
    consts: [["itemContainer", ""], ["processDotTemplate", ""], [1, "ant-steps-item-container", 3, "tabindex"], [1, "ant-steps-item-tail"], [1, "ant-steps-item-icon"], [1, "ant-steps-icon"], [1, "ant-steps-item-content"], [1, "ant-steps-item-title"], [4, "nzStringTemplateOutlet"], [1, "ant-steps-item-subtitle"], [1, "ant-steps-item-description"], [1, "ant-steps-progress-icon"], ["nzType", "circle", 3, "nzPercent", "nzWidth", "nzFormat", "nzStrokeWidth"], ["nzType", "check"], ["nzType", "close"], [3, "nzType"], [3, "ngTemplateOutlet", "ngTemplateOutletContext"], [1, "ant-steps-icon-dot"]],
    template: function NzStepComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵelementStart(0, "div", 2, 0);
        ɵɵconditionalCreate(2, NzStepComponent_Conditional_2_Template, 1, 0, "div", 3);
        ɵɵelementStart(3, "div", 4);
        ɵɵconditionalCreate(4, NzStepComponent_Conditional_4_Template, 5, 5);
        ɵɵconditionalCreate(5, NzStepComponent_Conditional_5_Template, 4, 6, "span", 5);
        ɵɵelementEnd();
        ɵɵelementStart(6, "div", 6)(7, "div", 7);
        ɵɵtemplate(8, NzStepComponent_ng_container_8_Template, 2, 1, "ng-container", 8);
        ɵɵconditionalCreate(9, NzStepComponent_Conditional_9_Template, 2, 1, "div", 9);
        ɵɵelementEnd();
        ɵɵelementStart(10, "div", 10);
        ɵɵtemplate(11, NzStepComponent_ng_container_11_Template, 2, 1, "ng-container", 8);
        ɵɵelementEnd()()();
      }
      if (rf & 2) {
        ɵɵproperty("tabindex", ctx.clickable && !ctx.nzDisabled ? 0 : null);
        ɵɵattribute("role", ctx.clickable && !ctx.nzDisabled ? "button" : null);
        ɵɵadvance(2);
        ɵɵconditional(!ctx.last ? 2 : -1);
        ɵɵadvance(2);
        ɵɵconditional(!ctx.showProcessDot ? 4 : -1);
        ɵɵadvance();
        ɵɵconditional(ctx.showProcessDot ? 5 : -1);
        ɵɵadvance(3);
        ɵɵproperty("nzStringTemplateOutlet", ctx.nzTitle);
        ɵɵadvance();
        ɵɵconditional(ctx.nzSubtitle ? 9 : -1);
        ɵɵadvance(2);
        ɵɵproperty("nzStringTemplateOutlet", ctx.nzDescription);
      }
    },
    dependencies: [NzProgressModule, NzProgressComponent, NzIconModule, NzIconDirective, NzOutletModule, NzStringTemplateOutletDirective, NgTemplateOutlet],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzStepComponent, [{
    type: Component,
    args: [{
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      selector: "nz-step",
      exportAs: "nzStep",
      template: `
    <div
      #itemContainer
      class="ant-steps-item-container"
      [attr.role]="clickable && !nzDisabled ? 'button' : null"
      [tabindex]="clickable && !nzDisabled ? 0 : null"
    >
      @if (!last) {
        <div class="ant-steps-item-tail"></div>
      }
      <div class="ant-steps-item-icon">
        @if (!showProcessDot) {
          @if (showProgress) {
            <div class="ant-steps-progress-icon">
              <nz-progress
                [nzPercent]="nzPercentage"
                nzType="circle"
                [nzWidth]="nzSize === 'small' ? 32 : 40"
                [nzFormat]="nullProcessFormat"
                [nzStrokeWidth]="4"
              ></nz-progress>
            </div>
          }
          @if (nzStatus === 'finish' && !nzIcon) {
            <span class="ant-steps-icon"><nz-icon nzType="check" /></span>
          }
          @if (nzStatus === 'error') {
            <span class="ant-steps-icon"><nz-icon nzType="close" /></span>
          }
          @if ((nzStatus === 'process' || nzStatus === 'wait') && !nzIcon) {
            <span class="ant-steps-icon">
              {{ index + 1 }}
            </span>
          }
          @if (nzIcon) {
            <span class="ant-steps-icon">
              <ng-container *nzStringTemplateOutlet="nzIcon; let icon">
                <nz-icon [nzType]="icon" />
              </ng-container>
            </span>
          }
        }
        @if (showProcessDot) {
          <span class="ant-steps-icon">
            <ng-template #processDotTemplate>
              <span class="ant-steps-icon-dot"></span>
            </ng-template>
            <ng-template
              [ngTemplateOutlet]="customProcessTemplate || processDotTemplate"
              [ngTemplateOutletContext]="{
                $implicit: processDotTemplate,
                status: nzStatus,
                index: index
              }"
            ></ng-template>
          </span>
        }
      </div>
      <div class="ant-steps-item-content">
        <div class="ant-steps-item-title">
          <ng-container *nzStringTemplateOutlet="nzTitle">{{ nzTitle }}</ng-container>
          @if (nzSubtitle) {
            <div class="ant-steps-item-subtitle">
              <ng-container *nzStringTemplateOutlet="nzSubtitle">{{ nzSubtitle }}</ng-container>
            </div>
          }
        </div>
        <div class="ant-steps-item-description">
          <ng-container *nzStringTemplateOutlet="nzDescription">{{ nzDescription }}</ng-container>
        </div>
      </div>
    </div>
  `,
      host: {
        class: "ant-steps-item",
        "[class.ant-steps-item-wait]": 'nzStatus === "wait"',
        "[class.ant-steps-item-process]": 'nzStatus === "process"',
        "[class.ant-steps-item-finish]": 'nzStatus === "finish"',
        "[class.ant-steps-item-error]": 'nzStatus === "error"',
        "[class.ant-steps-item-active]": "currentIndex === index",
        "[class.ant-steps-item-disabled]": "nzDisabled",
        "[class.ant-steps-item-custom]": "!!nzIcon",
        "[class.ant-steps-next-error]": '(outStatus === "error") && (currentIndex === index + 1)'
      },
      imports: [NzProgressModule, NzIconModule, NzOutletModule, NgTemplateOutlet]
    }]
  }], null, {
    processDotTemplate: [{
      type: ViewChild,
      args: ["processDotTemplate", {
        static: false
      }]
    }],
    itemContainer: [{
      type: ViewChild,
      args: ["itemContainer", {
        static: true
      }]
    }],
    nzTitle: [{
      type: Input
    }],
    nzSubtitle: [{
      type: Input
    }],
    nzDescription: [{
      type: Input
    }],
    nzDisabled: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    nzPercentage: [{
      type: Input
    }],
    nzSize: [{
      type: Input
    }],
    nzStatus: [{
      type: Input
    }],
    nzIcon: [{
      type: Input
    }]
  });
})();
var NzStepsComponent = class _NzStepsComponent {
  static ngAcceptInputType_nzProgressDot;
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);
  directionality = inject(Directionality);
  destroyRef = inject(DestroyRef);
  steps;
  nzCurrent = 0;
  nzDirection = "horizontal";
  nzLabelPlacement = "horizontal";
  nzType = "default";
  nzSize = "default";
  nzStartIndex = 0;
  nzStatus = "process";
  set nzProgressDot(value) {
    if (value instanceof TemplateRef) {
      this.showProcessDot = true;
      this.customProcessDotTemplate = value;
    } else {
      this.showProcessDot = toBoolean(value);
    }
    this.updateChildrenSteps();
  }
  nzIndexChange = new EventEmitter();
  indexChangeSubscription = Subscription.EMPTY;
  showProcessDot = false;
  showProgress = false;
  customProcessDotTemplate;
  dir = "ltr";
  ngOnChanges(changes) {
    const {
      nzStartIndex,
      nzDirection,
      nzStatus,
      nzCurrent,
      nzSize
    } = changes;
    if (nzStartIndex || nzDirection || nzStatus || nzCurrent || nzSize) {
      this.updateChildrenSteps();
    }
  }
  ngOnInit() {
    this.directionality.change?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((direction) => {
      this.dir = direction;
      this.cdr.detectChanges();
    });
    this.dir = this.directionality.value;
    this.updateChildrenSteps();
  }
  ngAfterContentInit() {
    if (this.steps) {
      this.steps.changes.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.updateHostProgressClass();
        this.updateChildrenSteps();
      });
    }
  }
  updateHostProgressClass() {
    if (this.steps && !this.showProcessDot) {
      this.showProgress = !!this.steps.toArray().find((step) => step.nzPercentage !== null);
    }
  }
  updateChildrenSteps() {
    if (this.steps) {
      const length = this.steps.length;
      this.steps.toArray().forEach((step, index) => {
        Promise.resolve().then(() => {
          step.nzSize = this.nzSize;
          step.outStatus = this.nzStatus;
          step.showProcessDot = this.showProcessDot;
          if (this.customProcessDotTemplate) {
            step.customProcessTemplate = this.customProcessDotTemplate;
          }
          step.clickable = this.nzIndexChange.observers.length > 0;
          step.direction = this.nzDirection;
          step.index = index + this.nzStartIndex;
          step.currentIndex = this.nzCurrent;
          step.last = length === index + 1;
          step.markForCheck();
        });
      });
      this.indexChangeSubscription.unsubscribe();
      this.indexChangeSubscription = merge(...this.steps.map((step) => step.clickOutsideAngular$)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((index) => {
        if (this.nzIndexChange.observers.length) {
          this.ngZone.run(() => this.nzIndexChange.emit(index));
        }
      });
    }
  }
  static ɵfac = function NzStepsComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzStepsComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _NzStepsComponent,
    selectors: [["nz-steps"]],
    contentQueries: function NzStepsComponent_ContentQueries(rf, ctx, dirIndex) {
      if (rf & 1) {
        ɵɵcontentQuery(dirIndex, NzStepComponent, 4);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.steps = _t);
      }
    },
    hostAttrs: [1, "ant-steps"],
    hostVars: 18,
    hostBindings: function NzStepsComponent_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵclassProp("ant-steps-horizontal", ctx.nzDirection === "horizontal")("ant-steps-vertical", ctx.nzDirection === "vertical")("ant-steps-label-horizontal", ctx.nzDirection === "horizontal")("ant-steps-label-vertical", (ctx.showProcessDot || ctx.nzLabelPlacement === "vertical") && ctx.nzDirection === "horizontal")("ant-steps-dot", ctx.showProcessDot)("ant-steps-small", ctx.nzSize === "small")("ant-steps-navigation", ctx.nzType === "navigation")("ant-steps-rtl", ctx.dir === "rtl")("ant-steps-with-progress", ctx.showProgress);
      }
    },
    inputs: {
      nzCurrent: "nzCurrent",
      nzDirection: "nzDirection",
      nzLabelPlacement: "nzLabelPlacement",
      nzType: "nzType",
      nzSize: "nzSize",
      nzStartIndex: "nzStartIndex",
      nzStatus: "nzStatus",
      nzProgressDot: "nzProgressDot"
    },
    outputs: {
      nzIndexChange: "nzIndexChange"
    },
    exportAs: ["nzSteps"],
    features: [ɵɵNgOnChangesFeature],
    ngContentSelectors: _c3,
    decls: 1,
    vars: 0,
    template: function NzStepsComponent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef();
        ɵɵprojection(0);
      }
    },
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzStepsComponent, [{
    type: Component,
    args: [{
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      selector: "nz-steps",
      exportAs: "nzSteps",
      template: `<ng-content></ng-content>`,
      host: {
        class: "ant-steps",
        "[class.ant-steps-horizontal]": `nzDirection === 'horizontal'`,
        "[class.ant-steps-vertical]": `nzDirection === 'vertical'`,
        "[class.ant-steps-label-horizontal]": `nzDirection === 'horizontal'`,
        "[class.ant-steps-label-vertical]": `(showProcessDot || nzLabelPlacement === 'vertical') && nzDirection === 'horizontal'`,
        "[class.ant-steps-dot]": "showProcessDot",
        "[class.ant-steps-small]": `nzSize === 'small'`,
        "[class.ant-steps-navigation]": `nzType === 'navigation'`,
        "[class.ant-steps-rtl]": `dir === 'rtl'`,
        "[class.ant-steps-with-progress]": "showProgress"
      }
    }]
  }], null, {
    steps: [{
      type: ContentChildren,
      args: [NzStepComponent]
    }],
    nzCurrent: [{
      type: Input
    }],
    nzDirection: [{
      type: Input
    }],
    nzLabelPlacement: [{
      type: Input
    }],
    nzType: [{
      type: Input
    }],
    nzSize: [{
      type: Input
    }],
    nzStartIndex: [{
      type: Input
    }],
    nzStatus: [{
      type: Input
    }],
    nzProgressDot: [{
      type: Input
    }],
    nzIndexChange: [{
      type: Output
    }]
  });
})();
var NzStepsModule = class _NzStepsModule {
  static ɵfac = function NzStepsModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NzStepsModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _NzStepsModule,
    imports: [NzStepsComponent, NzStepComponent],
    exports: [NzStepsComponent, NzStepComponent]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [NzStepComponent]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzStepsModule, [{
    type: NgModule,
    args: [{
      imports: [NzStepsComponent, NzStepComponent],
      exports: [NzStepsComponent, NzStepComponent]
    }]
  }], null, null);
})();
export {
  NzStepComponent,
  NzStepsComponent,
  NzStepsModule
};
//# sourceMappingURL=ng-zorro-antd_steps.js.map
