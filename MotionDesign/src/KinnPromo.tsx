import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { S01_ColdOpen } from "./scenes/S01_ColdOpen";
import { S02_Problem } from "./scenes/S02_Problem";
import { S03_Interface } from "./scenes/S03_Interface";
import { S04_MultiAgent } from "./scenes/S04_MultiAgent";
import { S05_TodoList } from "./scenes/S05_TodoList";
import { S06_FlowBuilder } from "./scenes/S06_FlowBuilder";
import { S07_AgentGallery } from "./scenes/S07_AgentGallery";
import { S08_Autonomy } from "./scenes/S08_Autonomy";
import { S09_IntegrationsCTA } from "./scenes/S09_IntegrationsCTA";
import { theme } from "./theme";

// 65s @ 30fps = 1950 frames
// Scene durations (frames):
// S01 ColdOpen:   90  (3s)   [0   - 90]
// S02 Problem:    150 (5s)   [90  - 240]
// S03 Interface:  150 (5s)   [240 - 390]
// S04 MultiAgent: 330 (11s)  [390 - 720]  ⭐ vedette
// S05 TodoList:   210 (7s)   [720 - 930]
// S06 FlowBuilder:330 (11s)  [930 - 1260] ⭐ vedette
// S07 Gallery:    240 (8s)   [1260 - 1500]
// S08 Autonomy:   180 (6s)   [1500 - 1680]
// S09 CTA:        240 (8s)   [1680 - 1920]
// Buffer:         30  (1s)   [1920 - 1950]

export const KinnPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: theme.font.family }}>
      {/*
        AUDIO SLOT — décommenter et placer votre voix-off / musique dans public/audio.mp3
        <Audio src={staticFile("audio.mp3")} />
      */}

      <Sequence from={0} durationInFrames={90}>
        <S01_ColdOpen />
      </Sequence>
      <Sequence from={90} durationInFrames={150}>
        <S02_Problem />
      </Sequence>
      <Sequence from={240} durationInFrames={150}>
        <S03_Interface />
      </Sequence>
      <Sequence from={390} durationInFrames={330}>
        <S04_MultiAgent />
      </Sequence>
      <Sequence from={720} durationInFrames={210}>
        <S05_TodoList />
      </Sequence>
      <Sequence from={930} durationInFrames={330}>
        <S06_FlowBuilder />
      </Sequence>
      <Sequence from={1260} durationInFrames={240}>
        <S07_AgentGallery />
      </Sequence>
      <Sequence from={1500} durationInFrames={180}>
        <S08_Autonomy />
      </Sequence>
      <Sequence from={1680} durationInFrames={240}>
        <S09_IntegrationsCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
