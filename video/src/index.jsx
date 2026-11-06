import { Composition, registerRoot } from "remotion";
import { CvIntro, DURATION, FPS } from "./CvIntro";

const Root = () => (
  <Composition id="CvIntro" component={CvIntro} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
);

registerRoot(Root);
