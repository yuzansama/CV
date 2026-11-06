import { Composition, registerRoot } from "remotion";
import { CvIntro, DURATION, FPS } from "./CvIntro";

const Root = () => (
  <>
    {/* 16:9 for the site and LinkedIn */}
    <Composition id="CvIntro" component={CvIntro} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
    {/* 9:16 for Instagram Reels and Stories */}
    <Composition id="CvIntroVertical" component={CvIntro} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
  </>
);

registerRoot(Root);
