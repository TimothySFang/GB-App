import { mockData } from '@/lib/mock-data';
import { averageRating, communityGrade, getCompatibility, getLatestVersion, groupClimbHolds } from '@/lib/utils';
import { WallPreview } from './wall-preview';

export function Dashboard() {
  const data = mockData;
  const latest = getLatestVersion(data);
  const latestClimbs = data.climbs.filter((climb) => climb.wallVersionId === latest.id);
  const inheritedClimbs = data.climbs.filter((climb) => climb.wallVersionId !== latest.id);

  return (
    <div className="container col">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="badge">MVP1 · private wall app</div>
            <h1 className="page-title">{data.wall.name}</h1>
            <p className="page-subtitle">
              Save climbs, manage wall versions, and let friends/family grade and rate problems.
            </p>
          </div>
          <div className="row">
            <div className="card" style={{ minWidth: 120 }}>
              <div className="small">Current version</div>
              <p className="kpi">{latest.name}</p>
            </div>
            <div className="card" style={{ minWidth: 120 }}>
              <div className="small">Climbs</div>
              <p className="kpi">{data.climbs.length}</p>
            </div>
            <div className="card" style={{ minWidth: 120 }}>
              <div className="small">Members</div>
              <p className="kpi">{data.users.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card col">
          <div>
            <h2 className="section-title">Current wall version</h2>
            <p className="section-subtitle">Upload a wall photo, mark holds manually, and create new versions from the previous hold map.</p>
          </div>
          <WallPreview version={latest} />
          <div className="row">
            <span className="badge">{latest.changeType}</span>
            <span className="badge">{latest.holds.length} holds</span>
            <span className="badge">Owner-safe climb editing</span>
          </div>
          <p className="small">{latest.notes}</p>
        </div>

        <div className="card col">
          <div>
            <h2 className="section-title">MVP1 feature checklist</h2>
            <p className="section-subtitle">The app scope we discussed, reflected as product modules.</p>
          </div>
          <div className="list">
            {[
              'Invite-only auth for friends/family',
              'Wall versions with additive / modified / reset states',
              'Manual hold annotation on top of wall photo',
              'Climb creation with start / middle / finish holds',
              'Climb ownership: only creator can edit/delete',
              'Compatibility across wall versions',
              'Community ratings + grade votes'
            ].map((item) => (
              <div key={item} className="badge">✓ {item}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card col">
          <div>
            <h2 className="section-title">Latest version climbs</h2>
            <p className="section-subtitle">Climbs created directly on the active wall setup.</p>
          </div>
          <div className="list">
            {latestClimbs.map((climb) => {
              const groups = groupClimbHolds(climb, latest);
              return (
                <div className="card" key={climb.id}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong>{climb.name}</strong>
                      <div className="small">by {climb.createdByName} · setter grade {climb.setterGrade}</div>
                    </div>
                    <div className="row">
                      <span className="route-chip">★ {averageRating(climb) ?? '—'}</span>
                      <span className="route-chip">community {communityGrade(climb)}</span>
                    </div>
                  </div>
                  <p className="small">{climb.notes}</p>
                  <div className="row">
                    <span className="route-chip">start: {groups.start.map((hold) => hold.label).join(', ') || '—'}</span>
                    <span className="route-chip">middle: {groups.middle.map((hold) => hold.label).join(', ') || '—'}</span>
                    <span className="route-chip">finish: {groups.finish.map((hold) => hold.label).join(', ') || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card col">
          <div>
            <h2 className="section-title">Inherited climb compatibility</h2>
            <p className="section-subtitle">Old climbs should remain usable when the hold map still supports them.</p>
          </div>
          <div className="list">
            {inheritedClimbs.map((climb) => {
              const status = getCompatibility(climb.id, latest.id, data.compatibility);
              return (
                <div key={climb.id} className="card">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{climb.name}</strong>
                    <span className="badge">{status?.status ?? 'unknown'}</span>
                  </div>
                  <div className="small">Originally created on {data.wall.versions.find((v) => v.id === climb.wallVersionId)?.name}</div>
                  <p className="small">{status?.reason ?? 'No compatibility data yet.'}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card col">
          <h2 className="section-title">Data model</h2>
          <p className="small">PostgreSQL + Prisma. Core tables: users, walls, wall_versions, holds, climbs, climb_holds, climb_ratings, climb_grade_votes, compatibility.</p>
        </div>
        <div className="card col">
          <h2 className="section-title">Permissions</h2>
          <p className="small">All members can create climbs. Only the owner can edit/delete their climb. Admins manage wall versions and holds.</p>
        </div>
        <div className="card col">
          <h2 className="section-title">Next implementation</h2>
          <p className="small">Wire auth, Prisma migrations, image upload, hold editor, climb create/edit forms, and persistence.</p>
        </div>
      </div>
    </div>
  );
}
