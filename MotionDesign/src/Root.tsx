import { Composition } from "remotion";
import { KinnPromo } from "./KinnPromo";
import { KinnTeaser } from "./KinnTeaser";
import { KinnPitch } from "./KinnPitch";
import { loadFont } from "@remotion/google-fonts/Poppins";

loadFont("normal", { weights: ["300", "400", "500", "600", "700", "800"] });

const FPS = 30;

export const Root = () => {
  return (
    <>
      <Composition
        id="KinnPromo"
        component={KinnPromo}
        durationInFrames={FPS * 65}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="KinnTeaser"
        component={KinnTeaser}
        durationInFrames={FPS * 30}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="KinnPitch"
        component={KinnPitch}
        durationInFrames={11310}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
