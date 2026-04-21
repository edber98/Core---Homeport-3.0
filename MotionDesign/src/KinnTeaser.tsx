import { AbsoluteFill, Sequence } from "remotion";
import { S01_ColdOpen } from "./scenes/S01_ColdOpen";
import { S04_MultiAgent } from "./scenes/S04_MultiAgent";
import { S06_FlowBuilder } from "./scenes/S06_FlowBuilder";
import { S07_AgentGallery } from "./scenes/S07_AgentGallery";
import { S09_IntegrationsCTA } from "./scenes/S09_IntegrationsCTA";
import { theme } from "./theme";

// 30s @ 30fps = 900 frames — version teaser
// S01 ColdOpen:     60  (2s)   [0   - 60]
// S04 MultiAgent:   300 (10s)  [60  - 360]   ⭐
// S06 FlowBuilder:  270 (9s)   [360 - 630]   ⭐
// S07 Gallery:      120 (4s)   [630 - 750]
// S09 CTA:          150 (5s)   [750 - 900]

export const KinnTeaser: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: theme.font.family }}>
      {/*
        AUDIO SLOT — piste teaser plus courte.
        <Audio src={staticFile("audio-teaser.mp3")} />
      */}
      <Sequence from={0} durationInFrames={60}>
        <S01_ColdOpen />
      </Sequence>
      <Sequence from={60} durationInFrames={300}>
        <S04_MultiAgent />
      </Sequence>
      <Sequence from={360} durationInFrames={270}>
        <S06_FlowBuilder />
      </Sequence>
      <Sequence from={630} durationInFrames={120}>
        <S07_AgentGallery />
      </Sequence>
      <Sequence from={750} durationInFrames={150}>
        <S09_IntegrationsCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
