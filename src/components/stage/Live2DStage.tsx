/**
 * Live2DStage — Dormant Placeholder
 *
 * Will house the Cubism SDK renderer when pixi.js vulnerability is resolved.
 * Shares the same stage slot and z-index contract as VideoLoopStage.
 */

interface Live2DStageProps {
  objectPosition?: string;
}

export default function Live2DStage({ objectPosition: _op }: Live2DStageProps) {
  return (
    <canvas
      className="absolute inset-0 w-full h-full z-[2]"
      style={{ pointerEvents: "none" }}
    />
  );
}
