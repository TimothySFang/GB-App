import { Hold, HoldRole, WallVersion } from '@/lib/types';

const roleColor: Record<HoldRole, string> = {
  start: '#22c55e',
  middle: '#f59e0b',
  finish: '#ec4899'
};

export function WallPreview({ version, highlighted, uniformColor }: { version: WallVersion; highlighted?: Array<{ hold: Hold; role?: HoldRole }>; uniformColor?: string }) {
  const highlights: Array<{ hold: Hold; role?: HoldRole }> = highlighted ?? version.holds.map((hold) => ({ hold }));

  return (
    <div className="wall-preview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wall-image" src={version.imageUrl} alt={version.name} />
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
  );
}
