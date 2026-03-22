import { Hold, HoldRole, WallVersion } from '@/lib/types';

const roleColor: Record<HoldRole, string> = {
  start: '#22c55e',
  middle: '#f59e0b',
  finish: '#ec4899'
};

export function WallPreview({
  version,
  highlighted,
  uniformColor,
  scale,
  offsetX,
  offsetY,
  rotation,
  wide = false
}: {
  version: WallVersion;
  highlighted?: Array<{ hold: Hold; role?: HoldRole }>;
  uniformColor?: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  wide?: boolean;
}) {
  const highlights: Array<{ hold: Hold; role?: HoldRole }> = highlighted ?? version.holds.map((hold) => ({ hold }));
  const resolvedScale = scale ?? version.photoScale;
  const resolvedOffsetX = offsetX ?? version.photoOffsetX;
  const resolvedOffsetY = offsetY ?? version.photoOffsetY;
  const resolvedRotation = rotation ?? version.photoRotation;

  return (
    <div className={`wall-preview ${wide ? 'wall-preview-wide' : ''}`}>
      <div className="wall-preview-image-layer" style={{ transform: `translate(${resolvedOffsetX}px, ${resolvedOffsetY}px) scale(${resolvedScale}) rotate(${resolvedRotation}deg)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wall-image" src={version.imageUrl} alt={version.name} />
      </div>
      <div className="wall-preview-inner">
        {highlights.map(({ hold, role }) => (
          <div
            key={`${hold.id}-${role ?? 'base'}`}
            className="hold-dot"
            title={`${hold.label}${role ? ` · ${role}` : ''}`}
            style={{
              left: `${hold.x}%`,
              top: `${hold.y}%`,
              color: uniformColor ?? (role ? roleColor[role] : hold.color),
              boxShadow: role
                ? `0 0 0 4px ${roleColor[role]}22`
                : `0 0 0 3px ${(uniformColor ?? hold.color)}18`
            }}
          />
        ))}
      </div>
    </div>
  );
}
