import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";
import { FadeBoundary } from "./FadeBoundary";

// Import all 13 scenes and the ambient styles wrapper.
import { P00_Origin } from "./scenes/pitch/P00_Origin";
import { P01_Hook } from "./scenes/pitch/P01_Hook";
import { P02_WorkflowConcept } from "./scenes/pitch/P02_WorkflowConcept";
import { P03_WorkflowBuilderDemo } from "./scenes/pitch/P03_WorkflowBuilderDemo";
import { P04_WorkflowAgentsBridge } from "./scenes/pitch/P04_WorkflowAgentsBridge";
import { P03_AgentsAsTeam as P05_AgentsAsTeam } from "./scenes/pitch/P03_AgentsAsTeam";
import { P04_PromptDemo as P06_PromptDemo } from "./scenes/pitch/P04_PromptDemo";
import { P05_SandboxCode as P07_SandboxCode } from "./scenes/pitch/P05_SandboxCode";
import { P06_Permissions as P08_Permissions } from "./scenes/pitch/P06_Permissions";
import { P07_Confidentiality as P10_Confidentiality } from "./scenes/pitch/P07_Confidentiality";
import { P08_WorkflowAgentic as P09_WorkflowAgentic } from "./scenes/pitch/P08_WorkflowAgentic";
import { P10_UseCases as P11_UseCases } from "./scenes/pitch/P10_UseCases";
import { P09_Closing as P12_Closing } from "./scenes/pitch/P09_Closing";
import { AmbientStyles } from "./components/AmbientStyles";
import { theme } from "./theme";

loadFont("normal", { weights: ["300", "400", "500", "600", "700", "800"] });

const FPS = 30;

type SliceProps = {
  durationInFrames: number;
};

// Helper to wrap a scene with AmbientStyles + FadeBoundary. Each slice is a
// standalone composition that can be rendered as its own MP4.
const makeSlice = (Scene: React.FC) => () => (
  <div style={{ fontFamily: theme.font.family, position: "absolute", inset: 0, background: "#f5f5f7" }}>
    <AmbientStyles />
    <FadeBoundary>
      <Scene />
    </FadeBoundary>
  </div>
);

// Slice durations must match the Sequence durations in the original KinnPitch.
const SLICES: { id: string; frames: number; component: React.FC }[] = [
  { id: "p00-origin",                frames: 750,  component: P00_Origin },
  { id: "p01-hook",                  frames: 450,  component: P01_Hook },
  { id: "p02-workflow-concept",      frames: 660,  component: P02_WorkflowConcept },
  { id: "p03-workflow-builder",      frames: 1710, component: P03_WorkflowBuilderDemo },
  { id: "p04-bridge",                frames: 720,  component: P04_WorkflowAgentsBridge },
  { id: "p05-agents",                frames: 540,  component: P05_AgentsAsTeam },
  { id: "p06-prompt-demo",           frames: 2280, component: P06_PromptDemo },
  { id: "p07-sandbox",               frames: 750,  component: P07_SandboxCode },
  { id: "p08-permissions",           frames: 600,  component: P08_Permissions },
  { id: "p09-workflow-agentic",      frames: 660,  component: P09_WorkflowAgentic },
  { id: "p10-confidentiality",       frames: 840,  component: P10_Confidentiality },
  { id: "p11-use-cases",             frames: 900,  component: P11_UseCases },
  { id: "p12-closing",               frames: 450,  component: P12_Closing },
];

export const Root: React.FC = () => (
  <>
    {SLICES.map((s) => (
      <Composition
        key={s.id}
        id={s.id}
        component={makeSlice(s.component)}
        durationInFrames={s.frames}
        fps={FPS}
        width={1920}
        height={1080}
      />
    ))}
  </>
);
