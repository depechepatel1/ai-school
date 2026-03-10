import { PROVIDERS } from "@/lib/provider-config";
import VideoLoopStage from "./VideoLoopStage";
import Live2DStage from "./Live2DStage";

interface BackgroundStageProps {
  videoList?: string[];
  playIntro?: boolean;
  objectPosition?: string;
  scaleClass?: string;
}

export default function BackgroundStage(props: BackgroundStageProps) {
  if (PROVIDERS.avatar === "live2d") {
    return <Live2DStage objectPosition={props.objectPosition} />;
  }
  return <VideoLoopStage {...props} />;
}
