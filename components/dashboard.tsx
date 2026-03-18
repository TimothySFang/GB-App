'use client';

import { useMemo, useState } from 'react';
import { mockData } from '@/lib/mock-data';
import { averageRating, communityGrade, getCompatibility, getLatestVersion, groupClimbHolds } from '@/lib/utils';
import { Hold, HoldRole, Climb, WallVersion, ChangeType } from '@/lib/types';
import { WallPreview } from './wall-preview';

type TabId = 'home' | 'climbs' | 'new' | 'versions';

type DraftState = {
  name: string;
  setterGrade: string;
  notes: string;
  selected: Record<HoldRole, string[]>;
};

type VersionDraft = {
  name: string;
  changeType: ChangeType;
  notes: string;
  sourceVersionId: string;
};

const emptyDraft = (): DraftState => ({
  name: '',
  setterGrade: '',
  notes: '',
  selected: { start: [], middle: [], finish: [] }
});

export function Dashboard() {
  const data = mockData;
  const [versions, setVersions] = useState<WallVersion[]>(data.wall.versions);
  const latest = versions[versions.length - 1];
  const [activeTab, setActiveTab] = useState<TabId>('versions');
  const [selectedRole, setSelectedRole] = useState<HoldRole>('start');
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [climbs, setClimbs] = useState<Climb[]>(data.climbs);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(latest.id);
  const [selectedClimbId, setSelectedClimbId] = useState<string | null>(null);
  const [editingClimbId, setEditingClimbId] = useState<string | null>(null);
  const [layoutHoldId, setLayoutHoldId] = useState<string | null>(null);
  const [versionDraft, setVersionDraft] = useState<VersionDraft>({
    name: `${latest.name} Copy`,
    changeType: 'modified',
    notes: '',
    sourceVersionId: latest.id
  });

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? latest;
  const latestClimbs = climbs.filter((climb) => climb.wallVersionId === latest.id);
  const inheritedClimbs = climbs.filter((climb) => climb.wallVersionId !== latest.id);
  const visibleClimbs = useMemo(
    () => climbs.filter((climb) => climb.wallVersionId === selectedVersion.id || climb.wallVersionId !== latest.id),
    [climbs, selectedVersion.id, latest.id]
  );
  const selectedClimb = climbs.find((climb) => climb.id === selectedClimbId) ?? null;
  const selectedHoldSet = new Set(Object.values(draft.selected).flat());
  const activeLayoutHold = selectedVersion.holds.find((hold) => hold.id === layoutHoldId) ?? null;

  const updateSelectedVersion = (updater: (version: WallVersion) => WallVersion) => {
    setVersions((current) => current.map((version) => (version.id === selectedVersion.id ? updater(version) : version)));
  };

  const moveLayoutHold = (dx: number, dy: number) => {
    if (!layoutHoldId) return;
    updateSelectedVersion((version) => ({
      ...version,
      holds: version.holds.map((hold) =>
        hold.id === layoutHoldId
          ? { ...hold, x: clamp(hold.x + dx, 6, 94), y: clamp(hold.y + dy, 6, 94), status: version.id === hold.id ? hold.status : 'moved' }
          : hold
      )
    }));
  };

  const addHoldToLayout = () => {
    const count = selectedVersion.holds.length + 1;
    const newHold: Hold = {
      id: `hold-${Date.now()}`,
      canonicalHoldId: `h${Date.now()}`,
      label: `N${count}`,
      color: '#facc15',
      x: 50,
      y: 50,
      status: 'added'
    };
    updateSelectedVersion((version) => ({ ...version, holds: [...version.holds, newHold] }));
    setLayoutHoldId(newHold.id);
  };

  const removeHoldFromLayout = () => {
    if (!layoutHoldId) return;
    updateSelectedVersion((version) => ({ ...version, holds: version.holds.filter((hold) => hold.id !== layoutHoldId) }));
    setLayoutHoldId(null);
  };

  const createVersionFromDraft = () => {
    const source = versions.find((version) => version.id === versionDraft.sourceVersionId) ?? latest;
    const nextVersion: WallVersion = {
      id: `wv-${Date.now()}`,
      wallId: source.wallId,
      parentVersionId: source.id,
      name: versionDraft.name.trim() || `${source.name} Copy`,
      changeType: versionDraft.changeType,
      imageUrl: source.imageUrl,
      notes: versionDraft.notes.trim() || 'New layout draft',
      holds: source.holds.map((hold) => ({
        ...hold,
        id: `${hold.id}-copy-${Date.now()}`,
        status: versionDraft.changeType === 'additive' ? hold.status : 'active'
      }))
    };
    setVersions((current) => [...current, nextVersion]);
    setSelectedVersionId(nextVersion.id);
    setVersionDraft({
      name: `${nextVersion.name} Copy`,
      changeType: 'modified',
      notes: '',
      sourceVersionId: nextVersion.id
    });
    setLayoutHoldId(null);
  };

  const toggleHold = (holdId: string) => {
    setDraft((current) => {
      const next: DraftState = {
        ...current,
        selected: {
          start: [...current.selected.start],
          middle: [...current.selected.middle],
          finish: [...current.selected.finish]
        }
      };

      for (const role of ['start', 'middle', 'finish'] as HoldRole[]) {
        next.selected[role] = next.selected[role].filter((id) => id !== holdId);
      }

      const wasInCurrentRole = current.selected[selectedRole].includes(holdId);
      if (!wasInCurrentRole) next.selected[selectedRole].push(holdId);
      return next;
    });
  };

  const saveDraftClimb = () => {
    if (!draft.name.trim()) return;

    const holds = (['start', 'middle', 'finish'] as HoldRole[]).flatMap((role) =>
      draft.selected[role].map((holdId, index) => ({ holdId, role, order: index + 1 }))
    );

    const baseClimb: Climb = {
      id: editingClimbId ?? `draft-${Date.now()}`,
      wallVersionId: selectedVersion.id,
      createdByUserId: data.currentUser.id,
      createdByName: data.currentUser.name,
      name: draft.name.trim(),
      setterGrade: draft.setterGrade.trim() || 'Project',
      notes: draft.notes.trim(),
      holds,
      ratings: editingClimbId ? climbs.find((c) => c.id === editingClimbId)?.ratings ?? [] : [],
      gradeVotes: editingClimbId ? climbs.find((c) => c.id === editingClimbId)?.gradeVotes ?? [] : []
    };

    setClimbs((current) => {
      if (editingClimbId) return current.map((climb) => (climb.id === editingClimbId ? baseClimb : climb));
      return [baseClimb, ...current];
    });

    setDraft(emptyDraft());
    setSelectedRole('start');
    setEditingClimbId(null);
    setSelectedClimbId(baseClimb.id);
    setActiveTab('climbs');
  };

  const startEditing = (climb: Climb) => {
    if (climb.createdByUserId !== data.currentUser.id) return;
    const selected: Record<HoldRole, string[]> = { start: [], middle: [], finish: [] };
    for (const ref of climb.holds) selected[ref.role].push(ref.holdId);
    setDraft({ name: climb.name, setterGrade: climb.setterGrade, notes: climb.notes, selected });
    setEditingClimbId(climb.id);
    setSelectedVersionId(climb.wallVersionId);
    setSelectedRole('start');
    setActiveTab('new');
  };

  const deleteClimb = (climb: Climb) => {
    if (climb.createdByUserId !== data.currentUser.id) return;
    setClimbs((current) => current.filter((item) => item.id !== climb.id));
    if (selectedClimbId === climb.id) setSelectedClimbId(null);
  };

  const highlightedDraftHolds = selectedVersion.holds
    .filter((hold) => selectedHoldSet.has(hold.canonicalHoldId))
    .map((hold) => {
      const role = (['start', 'middle', 'finish'] as HoldRole[]).find((candidate) => draft.selected[candidate].includes(hold.canonicalHoldId));
      return { hold, role };
    });

  const roleSummary = (role: HoldRole) =>
    draft.selected[role].map((holdId) => selectedVersion.holds.find((hold) => hold.canonicalHoldId === holdId)?.label).filter(Boolean).join(', ') || 'None selected';

  return (
    <div className="container col mobile-shell">
      <div className="card">
        <div className="badge">MVP1 · private wall app</div>
        <h1 className="page-title">{data.wall.name}</h1>
        <p className="page-subtitle">Save climbs, manage wall versions, and let friends/family grade problems.</p>
        <div className="row">
          <span className="badge">{selectedVersion.name}</span>
          <span className="badge">{climbs.length} climbs</span>
          <span className="badge">{versions.length} layouts</span>
        </div>
      </div>

      {activeTab === 'home' && (
        <div className="card col">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="section-title">Current wall</h2>
              <p className="section-subtitle">Latest version preview with hold identity carried forward.</p>
            </div>
            <VersionSelect versions={versions} value={selectedVersionId} onChange={setSelectedVersionId} />
          </div>
          <WallPreview version={selectedVersion} />
          <div className="row">
            <span className="badge">{selectedVersion.changeType}</span>
            <span className="badge">{selectedVersion.holds.length} holds</span>
            <span className="badge">Owner-safe climb editing</span>
          </div>
          <p className="small">{selectedVersion.notes}</p>
        </div>
      )}

      {activeTab === 'climbs' && (
        <div className="grid grid-2 mobile-grid-1">
          <div className="col">
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="section-title">Climbs</h2>
                  <p className="section-subtitle">Browse by wall version and tap a climb for details.</p>
                </div>
                <VersionSelect versions={versions} value={selectedVersionId} onChange={setSelectedVersionId} />
              </div>
            </div>
            <div className="list">
              {visibleClimbs.map((climb) => {
                const baseVersion = versions.find((v) => v.id === climb.wallVersionId) ?? latest;
                const compatibility = climb.wallVersionId === latest.id ? null : getCompatibility(climb.id, latest.id, data.compatibility);
                return (
                  <button key={climb.id} className={`card climb-list-button ${selectedClimbId === climb.id ? 'selected-panel' : ''}`} onClick={() => setSelectedClimbId(climb.id)}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong>{climb.name}</strong>
                        <div className="small">by {climb.createdByName} · {baseVersion.name}</div>
                      </div>
                      <div className="col" style={{ alignItems: 'flex-end' }}>
                        <span className="route-chip">★ {averageRating(climb) ?? '—'}</span>
                        <span className="route-chip">{communityGrade(climb)}</span>
                      </div>
                    </div>
                    {compatibility && <div className="badge">{compatibility.status}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col">
            <div className="card">
              <h2 className="section-title">Climb detail</h2>
              <p className="section-subtitle">See route holds and manage your own climbs.</p>
            </div>
            {selectedClimb ? (
              <ClimbDetail climb={selectedClimb} currentUserId={data.currentUser.id} latestVersion={latest} versions={versions} compatibility={data.compatibility} onEdit={startEditing} onDelete={deleteClimb} />
            ) : (
              <div className="card"><p className="small">Select a climb from the list to inspect it.</p></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="col">
          <div className="card col">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="section-title">{editingClimbId ? 'Edit climb' : 'New climb'}</h2>
                <p className="section-subtitle">Pick a role, tap holds on the wall, and save the climb into local prototype state.</p>
              </div>
              <VersionSelect versions={versions} value={selectedVersionId} onChange={setSelectedVersionId} />
            </div>

            <div>
              <label className="label">Climb name</label>
              <input className="input" placeholder="ex. Compression Goblin" value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} />
            </div>

            <div className="grid grid-2 mobile-grid-1">
              <div>
                <label className="label">Setter grade</label>
                <input className="input" placeholder="V4" value={draft.setterGrade} onChange={(e) => setDraft((current) => ({ ...current, setterGrade: e.target.value }))} />
              </div>
              <div>
                <label className="label">Current picker mode</label>
                <div className="row">
                  {(['start', 'middle', 'finish'] as HoldRole[]).map((role) => <button key={role} className={`button ${selectedRole === role ? '' : 'secondary'}`} type="button" onClick={() => setSelectedRole(role)}>{role}</button>)}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Tap holds on the wall</label>
              <InteractiveWall version={selectedVersion} selectedRole={selectedRole} selectedHoldSet={selectedHoldSet} onToggleHold={toggleHold} />
            </div>

            <div className="grid grid-3 mobile-grid-1">
              <div className="card col"><strong>Start holds</strong><span className="small">{roleSummary('start')}</span></div>
              <div className="card col"><strong>Middle holds</strong><span className="small">{roleSummary('middle')}</span></div>
              <div className="card col"><strong>Finish holds</strong><span className="small">{roleSummary('finish')}</span></div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="textarea" placeholder="Big move off the orange sidepull into the top jug." value={draft.notes} onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))} />
            </div>

            <div className="row">
              <button className="button" type="button" onClick={saveDraftClimb}>{editingClimbId ? 'Update climb' : 'Save climb'}</button>
              <button className="button secondary" type="button" onClick={() => { setDraft(emptyDraft()); setEditingClimbId(null); }}>Reset</button>
            </div>

            <div className="card col">
              <strong>Draft preview</strong>
              <WallPreview version={selectedVersion} highlighted={highlightedDraftHolds} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="grid grid-2 mobile-grid-1">
          <div className="col">
            <div className="card col">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="section-title">Board layouts</h2>
                  <p className="section-subtitle">Create a new layout version, duplicate an old one, and tweak hold positions.</p>
                </div>
                <VersionSelect versions={versions} value={selectedVersionId} onChange={setSelectedVersionId} />
              </div>
              <div className="grid grid-2 mobile-grid-1">
                <div>
                  <label className="label">New layout name</label>
                  <input className="input" value={versionDraft.name} onChange={(e) => setVersionDraft((current) => ({ ...current, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Source layout</label>
                  <VersionSelect versions={versions} value={versionDraft.sourceVersionId} onChange={(value) => setVersionDraft((current) => ({ ...current, sourceVersionId: value }))} />
                </div>
              </div>
              <div className="grid grid-2 mobile-grid-1">
                <div>
                  <label className="label">Change type</label>
                  <select className="select" value={versionDraft.changeType} onChange={(e) => setVersionDraft((current) => ({ ...current, changeType: e.target.value as ChangeType }))}>
                    <option value="additive">additive</option>
                    <option value="modified">modified</option>
                    <option value="reset">reset</option>
                  </select>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" value={versionDraft.notes} onChange={(e) => setVersionDraft((current) => ({ ...current, notes: e.target.value }))} />
                </div>
              </div>
              <button className="button" type="button" onClick={createVersionFromDraft}>Create new layout</button>
            </div>

            <div className="card col">
              <h2 className="section-title">Layout editor</h2>
              <p className="section-subtitle">Tap a hold below, then nudge it around. Great enough for MVP prototype land.</p>
              <InteractiveLayoutWall version={selectedVersion} activeHoldId={layoutHoldId} onSelectHold={setLayoutHoldId} />
              <div className="row wrap-grid">
                <button className="button secondary" type="button" onClick={() => moveLayoutHold(0, -3)}>Up</button>
                <button className="button secondary" type="button" onClick={() => moveLayoutHold(-3, 0)}>Left</button>
                <button className="button secondary" type="button" onClick={() => moveLayoutHold(3, 0)}>Right</button>
                <button className="button secondary" type="button" onClick={() => moveLayoutHold(0, 3)}>Down</button>
                <button className="button secondary" type="button" onClick={addHoldToLayout}>Add hold</button>
                <button className="button danger" type="button" onClick={removeHoldFromLayout}>Remove hold</button>
              </div>
              <div className="small">Selected hold: {activeLayoutHold ? `${activeLayoutHold.label} (${Math.round(activeLayoutHold.x)}, ${Math.round(activeLayoutHold.y)})` : 'none'}</div>
            </div>
          </div>

          <div className="col">
            <div className="card"><h2 className="section-title">Version timeline</h2><p className="section-subtitle">Track resets and whether older climbs still work.</p></div>
            <div className="list">
              {versions.map((version) => (
                <div key={version.id} className={`card ${version.id === selectedVersion.id ? 'selected-panel' : ''}`}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><strong>{version.name}</strong><span className="badge">{version.changeType}</span></div>
                  <div className="small">{version.holds.length} holds</div>
                  <p className="small">{version.notes}</p>
                </div>
              ))}
              {inheritedClimbs.map((climb) => {
                const status = getCompatibility(climb.id, latest.id, data.compatibility);
                return (
                  <div key={climb.id} className="card">
                    <div className="row" style={{ justifyContent: 'space-between' }}><strong>{climb.name}</strong><span className="badge">{status?.status ?? 'unknown'}</span></div>
                    <p className="small">{status?.reason ?? 'No compatibility data yet.'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {[
          ['home', 'Home'],
          ['climbs', 'Climbs'],
          ['new', 'New'],
          ['versions', 'Layouts']
        ].map(([id, label]) => <button key={id} className={`bottom-nav-item ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id as TabId)}>{label}</button>)}
      </nav>
    </div>
  );
}

function VersionSelect({ versions, value, onChange }: { versions: WallVersion[]; value: string; onChange: (value: string) => void }) {
  return <select className="select compact-select" value={value} onChange={(e) => onChange(e.target.value)}>{versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}</select>;
}

function ClimbDetail({ climb, currentUserId, latestVersion, versions, compatibility, onEdit, onDelete }: { climb: Climb; currentUserId: string; latestVersion: WallVersion; versions: WallVersion[]; compatibility: typeof mockData.compatibility; onEdit: (climb: Climb) => void; onDelete: (climb: Climb) => void; }) {
  const baseVersion = versions.find((v) => v.id === climb.wallVersionId) ?? latestVersion;
  const groups = groupClimbHolds(climb, baseVersion);
  const highlight = baseVersion.holds.filter((hold) => climb.holds.some((ref) => ref.holdId === hold.canonicalHoldId)).map((hold) => ({ hold, role: climb.holds.find((ref) => ref.holdId === hold.canonicalHoldId)?.role }));
  const status = climb.wallVersionId === latestVersion.id ? null : compatibility.find((entry) => entry.climbId === climb.id && entry.targetWallVersionId === latestVersion.id);
  const isOwner = climb.createdByUserId === currentUserId;

  return (
    <div className="card col">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0 }}>{climb.name}</h3>
          <div className="small">by {climb.createdByName} · setter {climb.setterGrade}</div>
          <div className="small">created on {baseVersion.name}</div>
        </div>
        <div className="col" style={{ alignItems: 'flex-end' }}>
          <span className="route-chip">★ {averageRating(climb) ?? '—'}</span>
          <span className="route-chip">community {communityGrade(climb)}</span>
        </div>
      </div>
      <p className="small">{climb.notes || 'No notes yet.'}</p>
      <WallPreview version={baseVersion} highlighted={highlight} />
      <div className="row">
        <span className="route-chip">start: {groups.start.map((hold) => hold.label).join(', ') || '—'}</span>
        <span className="route-chip">middle: {groups.middle.map((hold) => hold.label).join(', ') || '—'}</span>
        <span className="route-chip">finish: {groups.finish.map((hold) => hold.label).join(', ') || '—'}</span>
      </div>
      {status && <div className="badge">latest version: {status.status}</div>}
      <div className="row">
        <button className={`button ${isOwner ? '' : 'secondary disabled-button'}`} type="button" onClick={() => onEdit(climb)} disabled={!isOwner}>Edit</button>
        <button className={`button danger ${isOwner ? '' : 'disabled-button'}`} type="button" onClick={() => onDelete(climb)} disabled={!isOwner}>Delete</button>
      </div>
      {!isOwner && <p className="small">Only the climb owner can edit or delete this route.</p>}
    </div>
  );
}

function InteractiveWall({ version, selectedRole, selectedHoldSet, onToggleHold }: { version: WallVersion; selectedRole: HoldRole; selectedHoldSet: Set<string>; onToggleHold: (holdId: string) => void; }) {
  return (
    <div className="wall-preview interactive-wall">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wall-image" src={version.imageUrl} alt={version.name} />
      {version.holds.map((hold: Hold) => {
        const isSelected = selectedHoldSet.has(hold.canonicalHoldId);
        return <button key={hold.id} type="button" className={`hold-button ${isSelected ? 'selected' : ''}`} title={`${hold.label} · add as ${selectedRole}`} style={{ left: `${hold.x}%`, top: `${hold.y}%`, background: hold.color }} onClick={() => onToggleHold(hold.canonicalHoldId)}><span>{hold.label}</span></button>;
      })}
    </div>
  );
}

function InteractiveLayoutWall({ version, activeHoldId, onSelectHold }: { version: WallVersion; activeHoldId: string | null; onSelectHold: (holdId: string) => void; }) {
  return (
    <div className="wall-preview interactive-wall">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wall-image" src={version.imageUrl} alt={version.name} />
      {version.holds.map((hold) => (
        <button key={hold.id} type="button" className={`hold-button ${activeHoldId === hold.id ? 'selected' : ''}`} style={{ left: `${hold.x}%`, top: `${hold.y}%`, background: hold.color }} onClick={() => onSelectHold(hold.id)}>
          <span>{hold.label}</span>
        </button>
      ))}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
