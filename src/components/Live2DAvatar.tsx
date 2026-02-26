/**
 * Live2DAvatar Component — DORMANT PLACEHOLDER
 * 
 * The pixi.js and pixi-live2d-display dependencies were removed
 * due to a critical supply chain vulnerability (GHSA-8mmm-9v2q-x3f9).
 * 
 * To re-enable, install updated/patched versions of:
 * - pixi.js v7
 * - pixi-live2d-display
 * and restore the original implementation.
 */

interface Live2DAvatarProps {
  modelUrl?: string;
  audioUrl?: string | null;
  className?: string;
}

export default function Live2DAvatar({
  className = "",
}: Live2DAvatarProps) {
  return (
    <canvas
      className={`absolute inset-0 w-full h-full z-0 ${className}`}
      style={{ pointerEvents: "none" }}
    />
  );
}
