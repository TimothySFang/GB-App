import { Hold, HoldRole, WallVersion } from '@/lib/types';

const roleColor: Record<HoldRole, string> = {
  start: '#22c55e',
  middle: '#f59e0b',
  finish: '#ec4899'
};

export function WallPreview({ version, highlighted }: { version: WallVersion; highlighted?: Array<{ hold: Hold; role?: HoldRole }> }) {
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
            background: role ? roleColor[role] : hold.color,
            boxShadow: role ? `0 0 0 4px ${roleColor[role]}33` : undefined
          }}
        />
      ))}
    </div>
  );
}
