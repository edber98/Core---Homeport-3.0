import { AbsoluteFill, Sequence } from "remotion";
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

// Kinn Pitch v7 — ~7:10 — visual backdrop for a 10-minute sales pitch.
// Scene plan (frames @ 30fps):
//  P00  Origin (C4RBON → Kinn) ... 0     – 750    (25s)  — NEW : histoire + timeline
//  P01  Hook ..................... 750   – 1200   (15s)  — Problème
//  P02  WorkflowConcept .......... 1200  – 1860   (22s)  — Solution 1 : workflows
//  P03  WorkflowBuilderDemo ...... 1860  – 3570   (57s)  — DÉMO workflow + AI panel
//  P04  WorkflowAgentsBridge ..... 3570  – 4290   (24s)  — Relation workflow ↔ agents
//  P05  AgentsAsTeam ............. 4290  – 4830   (18s)  — Solution 2 : agents
//  P06  PromptDemo ............... 4830  – 7110   (76s)  — DÉMO chat live (étude c4rbon)
//  P07  SandboxCode .............. 7110  – 7860   (25s)  — Infra sandbox
//  P08  Permissions .............. 7860  – 8460   (20s)  — Contrôle
//  P09  WorkflowAgentic .......... 8460  – 9120   (22s)  — Événement → réaction
//  P10  Confidentiality .......... 9120  – 9960   (28s)  — R&D anonymisation
//  P11  UseCases ................. 9960  – 10860  (30s)  — Cas d'usage + plus-value
//  P12  Closing .................. 10860 – 11310  (15s)  — Slogan + kinn.fr

export const KinnPitch: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#f5f5f7", fontFamily: theme.font.family }}>
      {/* Inject CSS keyframes for ambient animations (caret blink, flowing
          packets, pulses) — these keep running even when Remotion Player is
          paused on a checkpoint, critical for the live pitch experience. */}
      <AmbientStyles />
      {/*
        AUDIO SLOTS — plug in your voice-over or music track here.
        <Audio src={staticFile('pitch-voiceover.mp3')} />
      */}

      <Sequence from={0} durationInFrames={750}>
        <P00_Origin />
      </Sequence>
      <Sequence from={750} durationInFrames={450}>
        <P01_Hook />
      </Sequence>
      <Sequence from={1200} durationInFrames={660}>
        <P02_WorkflowConcept />
      </Sequence>
      <Sequence from={1860} durationInFrames={1710}>
        <P03_WorkflowBuilderDemo />
      </Sequence>
      <Sequence from={3570} durationInFrames={720}>
        <P04_WorkflowAgentsBridge />
      </Sequence>
      <Sequence from={4290} durationInFrames={540}>
        <P05_AgentsAsTeam />
      </Sequence>
      <Sequence from={4830} durationInFrames={2280}>
        <P06_PromptDemo />
      </Sequence>
      <Sequence from={7110} durationInFrames={750}>
        <P07_SandboxCode />
      </Sequence>
      <Sequence from={7860} durationInFrames={600}>
        <P08_Permissions />
      </Sequence>
      <Sequence from={8460} durationInFrames={660}>
        <P09_WorkflowAgentic />
      </Sequence>
      <Sequence from={9120} durationInFrames={840}>
        <P10_Confidentiality />
      </Sequence>
      <Sequence from={9960} durationInFrames={900}>
        <P11_UseCases />
      </Sequence>
      <Sequence from={10860} durationInFrames={450}>
        <P12_Closing />
      </Sequence>
    </AbsoluteFill>
  );
};
