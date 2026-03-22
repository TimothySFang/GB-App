'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, PointerEvent, useMemo, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { averageRating, communityGrade, getCompatibility, getLatestVersion, groupClimbHolds, hasSent, isFavorited } from '@/lib/utils';
import { Hold, HoldRole, Climb, WallVersion, ChangeType, Rating, DashboardData } from '@/lib/types';
import { WallPreview } from './wall-preview';

type TabId = 'home' | 'climbs' | 'new' | 'versions' | 'profile';
type ClimbFilter = 'all' | 'favorites' | 'sent';
type LayoutMode = 'edit' | 'create';

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

export function Dashboard({ initialData }: { initialData: DashboardData }) {
  const data = initialData;
  const canManageLayouts = data.currentUser.role === 'admin';
  const [versions, setVersions] = useState<WallVersion[]>(data.wall.versions);
  const latest = getLatestVersion({ ...data, wall: { ...data.wall, versions } });
  const hasLayouts = versions.length > 0;
  const [activeTab, setActiveTab] = useState<TabId>('climbs');
  const [selectedRole, setSelectedRole] = useState<HoldRole>('start');
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [climbs, setClimbs] = useState<Climb[]>(data.climbs);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(latest?.id ?? '');
  const [selectedClimbId, setSelectedClimbId] = useState<string | null>(null);
  const [editingClimbId, setEditingClimbId] = useState<string | null>(null);
  const [layoutHoldId, setLayoutHoldId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [climbSearch, setClimbSearch] = useState('');
  const [climbFilter, setClimbFilter] = useState<ClimbFilter>('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [detailClimbId, setDetailClimbId] = useState<string | null>(null);
  const [ratingDraft, setRatingDraft] = useState<number>(5);
  const [sendGradeDraft, setSendGradeDraft] = useState('V3');
  const [requestError, setRequestError] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('edit');
  const [savingLayout, setSavingLayout] = useState(false);
  const [dirtyLayoutIds, setDirtyLayoutIds] = useState<Set<string>>(new Set());
  const [versionDraft, setVersionDraft] = useState<VersionDraft>({
    name: latest ? `${latest.name} Copy` : 'New Layout',
    changeType: 'modified',
    notes: '',
    sourceVersionId: latest?.id ?? ''
  });
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? latest ?? null;
  const photoAdjust = selectedVersion ? {
    scale: selectedVersion.photoScale,
    offsetX: selectedVersion.photoOffsetX,
    offsetY: selectedVersion.photoOffsetY,
    rotation: selectedVersion.photoRotation
  } : { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 };
  const inheritedClimbs = latest ? climbs.filter((climb) => climb.wallVersionId !== latest.id) : [];
  const selectedHoldSet = new Set(Object.values(draft.selected).flat());
  const activeLayoutHold = selectedVersion?.holds.find((hold) => hold.id === layoutHoldId) ?? null;
  const detailClimb = climbs.find((climb) => climb.id === detailClimbId) ?? null;
  const currentUserId = data.currentUser.id;
  const isAdminUser = data.currentUser.role === 'admin';

  const filteredClimbs = useMemo(() => {
    return climbs.filter((climb) => {
      const matchesLayout = !selectedVersionId || climb.wallVersionId === selectedVersionId;
      const matchesSearch = climb.name.toLowerCase().includes(climbSearch.toLowerCase()) || climb.createdByName.toLowerCase().includes(climbSearch.toLowerCase());
      const matchesGrade = gradeFilter === 'all' || climb.setterGrade === gradeFilter || communityGrade(climb) === gradeFilter;
      const matchesFavorite = climbFilter !== 'favorites' || isFavorited(climb, currentUserId);
      const matchesSent = climbFilter !== 'sent' || hasSent(climb, currentUserId);
      return matchesLayout && matchesSearch && matchesGrade && matchesFavorite && matchesSent;
    });
  }, [climbs, climbSearch, gradeFilter, climbFilter, currentUserId, selectedVersionId]);

  const profileCreated = climbs.filter((climb) => climb.createdByUserId === currentUserId);
  const profileFavorites = climbs.filter((climb) => isFavorited(climb, currentUserId));
  const profileSent = climbs.filter((climb) => hasSent(climb, currentUserId));
  const layoutHasUnsavedChanges = selectedVersion ? dirtyLayoutIds.has(selectedVersion.id) : false;

  const markLayoutDirty = (versionId: string) => {
    setDirtyLayoutIds((current) => {
      const next = new Set(current);
      next.add(versionId);
      return next;
    });
  };

  const markLayoutClean = (versionId: string) => {
    setDirtyLayoutIds((current) => {
      const next = new Set(current);
      next.delete(versionId);
      return next;
    });
  };

  const updateSelectedVersion = (updater: (version: WallVersion) => WallVersion, markDirty = false) => {
    if (!selectedVersion) return;
    setVersions((current) => current.map((version) => (version.id === selectedVersion.id ? updater(version) : version)));
    if (markDirty) markLayoutDirty(selectedVersion.id);
  };

  const updatePhotoAdjust = (patch: Partial<{ scale: number; offsetX: number; offsetY: number; rotation: number }>) => {
    if (!selectedVersion) return;
    updateSelectedVersion((version) => ({
      ...version,
      photoScale: patch.scale ?? version.photoScale,
      photoOffsetX: patch.offsetX ?? version.photoOffsetX,
      photoOffsetY: patch.offsetY ?? version.photoOffsetY,
      photoRotation: patch.rotation ?? version.photoRotation
    }), true);
  };

  const updateClimb = (climbId: string, updater: (climb: Climb) => Climb) => {
    setClimbs((current) => current.map((climb) => (climb.id === climbId ? updater(climb) : climb)));
  };

  const readError = async (res: Response) => {
    try {
      const payload = await res.json();
      return typeof payload.error === 'string' ? payload.error : 'Request failed';
    } catch {
      return 'Request failed';
    }
  };

  const toggleFavorite = async (climbId: string) => {
    setRequestError('');
    const res = await fetch(`/api/climbs/${climbId}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      setRequestError(await readError(res));
      return;
    }

    updateClimb(climbId, (climb) => {
      const favorites = new Set(climb.favorites ?? []);
      if (favorites.has(currentUserId)) favorites.delete(currentUserId);
      else favorites.add(currentUserId);
      return { ...climb, favorites: [...favorites] };
    });
  };

  const saveRating = async (climbId: string, stars: number) => {
    setRequestError('');
    const res = await fetch(`/api/climbs/${climbId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars })
    });
    if (!res.ok) {
      setRequestError(await readError(res));
      return;
    }

    updateClimb(climbId, (climb) => {
      const otherRatings = (climb.ratings ?? []).filter((rating) => rating.userId !== currentUserId);
      const nextRatings: Rating[] = [...otherRatings, { userId: currentUserId, stars }];
      return { ...climb, ratings: nextRatings };
    });
  };

  const markSent = async (climbId: string, grade: string) => {
    setRequestError('');
    const res = await fetch(`/api/climbs/${climbId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade })
    });
    if (!res.ok) {
      setRequestError(await readError(res));
      return;
    }

    updateClimb(climbId, (climb) => {
      const otherSends = (climb.sends ?? []).filter((send) => send.userId !== currentUserId);
      const otherVotes = (climb.gradeVotes ?? []).filter((vote) => vote.userId !== currentUserId);
      return {
        ...climb,
        sends: [...otherSends, { userId: currentUserId, grade, sentAt: new Date().toISOString().slice(0, 10) }],
        gradeVotes: [...otherVotes, { userId: currentUserId, grade }]
      };
    });
  };

  const createVersionFromDraft = async () => {
    const source = versions.find((version) => version.id === versionDraft.sourceVersionId) ?? latest ?? null;
    setRequestError('');

    const res = await fetch('/api/layouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallId: data.wall.id,
        parentVersionId: source?.id,
        name: versionDraft.name.trim() || (source ? `${source.name} Copy` : 'New Layout'),
        changeType: versionDraft.changeType,
        imageUrl: source?.imageUrl ?? '',
        photoScale: source?.photoScale ?? 1,
        photoOffsetX: source?.photoOffsetX ?? 0,
        photoOffsetY: source?.photoOffsetY ?? 0,
        photoRotation: source?.photoRotation ?? 0,
        notes: versionDraft.notes.trim() || 'New layout draft',
        holds: (source?.holds ?? []).map((hold) => ({
          canonicalHoldId: hold.canonicalHoldId,
          label: hold.label,
          color: hold.color,
          x: hold.x,
          y: hold.y,
          status: versionDraft.changeType === 'additive' ? hold.status : 'active'
        }))
      })
    }).catch(() => null);

    if (!res) {
      setRequestError('Could not create the layout.');
      return;
    }

    if (!res.ok) {
      setRequestError(await readError(res));
      return;
    }

    const payload = await res.json();
    const nextVersion = payload.version as WallVersion;

    setVersions((current) => [...current, nextVersion]);
    setSelectedVersionId(nextVersion.id);
    markLayoutClean(nextVersion.id);
    setVersionDraft({ name: `${nextVersion.name} Copy`, changeType: 'modified', notes: '', sourceVersionId: nextVersion.id });
    setLayoutHoldId(null);
    setLayoutMode('edit');
  };

  const onBoardImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedVersion) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : selectedVersion.imageUrl;
      updateSelectedVersion((version) => ({ ...version, imageUrl: result }), true);
      setRequestError('');
    };
    reader.readAsDataURL(file);
  };

  const updateHoldPosition = (holdId: string, x: number, y: number) => {
    updateSelectedVersion((version) => ({
      ...version,
      holds: version.holds.map((hold) => hold.id === holdId ? { ...hold, x: clamp(x, 4, 96), y: clamp(y, 4, 96), status: hold.status === 'added' ? 'added' : 'moved' } : hold)
    }), true);
  };

  const addHoldAtPosition = (x: number, y: number) => {
    if (!selectedVersion) return;
    setRequestError('');
    const stamp = Date.now();
    const count = selectedVersion.holds.length + 1;
    const newHold: Hold = { id: `hold-${stamp}`, canonicalHoldId: `h${stamp}`, label: `N${count}`, color: '#facc15', x, y, status: 'added' };
    updateSelectedVersion((version) => ({ ...version, holds: [...version.holds, newHold] }), true);
    setLayoutHoldId(newHold.id);
  };

  const renameActiveHold = (label: string) => {
    if (!layoutHoldId) return;
    updateSelectedVersion((version) => ({ ...version, holds: version.holds.map((hold) => (hold.id === layoutHoldId ? { ...hold, label } : hold)) }), true);
  };

  const recolorActiveHold = (color: string) => {
    if (!layoutHoldId) return;
    updateSelectedVersion((version) => ({ ...version, holds: version.holds.map((hold) => (hold.id === layoutHoldId ? { ...hold, color } : hold)) }), true);
  };

  const removeHoldFromLayout = () => {
    if (!layoutHoldId) return;
    updateSelectedVersion((version) => ({ ...version, holds: version.holds.filter((hold) => hold.id !== layoutHoldId) }), true);
    setLayoutHoldId(null);
  };

  const saveSelectedLayout = async () => {
    if (!selectedVersion) return;
    setSavingLayout(true);
    setRequestError('');

    const res = await fetch(`/api/layouts/${selectedVersion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        name: selectedVersion.name,
        changeType: selectedVersion.changeType,
        notes: selectedVersion.notes,
        imageUrl: selectedVersion.imageUrl,
        photoScale: selectedVersion.photoScale,
        photoOffsetX: selectedVersion.photoOffsetX,
        photoOffsetY: selectedVersion.photoOffsetY,
        photoRotation: selectedVersion.photoRotation,
        holds: selectedVersion.holds.map((hold) => ({
          id: hold.id,
          canonicalHoldId: hold.canonicalHoldId,
          label: hold.label,
          color: hold.color,
          x: hold.x,
          y: hold.y,
          status: hold.status
        }))
      })
    }).catch(() => null);

    setSavingLayout(false);
    if (!res) {
      setRequestError('Could not save the layout changes.');
      return;
    }

    if (!res.ok) {
      setRequestError(await readError(res));
      return;
    }

    const payload = await res.json();
    const savedVersion = payload.version as WallVersion;
    setVersions((current) => current.map((version) => (version.id === savedVersion.id ? savedVersion : version)));
    markLayoutClean(savedVersion.id);
    setLayoutHoldId((current) => savedVersion.holds.some((hold) => hold.id === current) ? current : null);
  };

  const deleteSelectedLayout = async () => {
    if (!isAdminUser || !selectedVersion) return;
    if (!window.confirm('Delete this layout and all climbs under it?')) return;
    if (!window.confirm('Are you absolutely sure? This cannot be undone.')) return;

    const res = await fetch(`/api/layouts/${selectedVersion.id}?userId=${currentUserId}`, { method: 'DELETE' });
    if (!res.ok) return;

    const remaining = versions.filter((version) => version.id !== selectedVersion.id);
    setVersions(remaining);
    setClimbs((current) => current.filter((climb) => climb.wallVersionId !== selectedVersion.id));
    if (remaining.length) {
      setSelectedVersionId(remaining[remaining.length - 1].id);
      setVersionDraft((current) => ({
        ...current,
        sourceVersionId: remaining.some((version) => version.id === current.sourceVersionId) ? current.sourceVersionId : remaining[remaining.length - 1].id
      }));
    } else {
      setSelectedVersionId('');
      setLayoutHoldId(null);
      setLayoutMode('create');
      setVersionDraft((current) => ({ ...current, sourceVersionId: '' }));
    }
    markLayoutClean(selectedVersion.id);
  };

  const toggleHold = (holdId: string) => {
    setDraft((current) => {
      const next: DraftState = { ...current, selected: { start: [...current.selected.start], middle: [...current.selected.middle], finish: [...current.selected.finish] } };
      for (const role of ['start', 'middle', 'finish'] as HoldRole[]) {
        if (current.selected[role].includes(holdId) && role === selectedRole) {
          next.selected[role] = next.selected[role].filter((id) => id !== holdId);
          return next;
        }
        next.selected[role] = next.selected[role].filter((id) => id !== holdId);
      }
      next.selected[selectedRole].push(holdId);
      return next;
    });
  };

  const hasDraftSelections = Object.values(draft.selected).some((arr) => arr.length > 0);

  const saveDraftClimb = async () => {
    if (!selectedVersion) return setFormError('Create a layout before saving climbs.');
    if (layoutHasUnsavedChanges) return setFormError('Save layout changes before saving a climb on this layout.');
    if (!draft.name.trim()) return setFormError('Climb name is required.');
    if (!draft.setterGrade.trim()) return setFormError('Setter grade is required.');
    if (!draft.selected.start.length || !draft.selected.finish.length) return setFormError('At least one start hold and one finish hold are required.');
    setFormError('');
    setRequestError('');
    if (!window.confirm(editingClimbId ? 'Save changes to this climb?' : 'Create this climb?')) return;

    const holds = (['start', 'middle', 'finish'] as HoldRole[]).flatMap((role) => draft.selected[role].map((holdId, index) => ({ holdId, role, order: index + 1 })));
    const previous = editingClimbId ? climbs.find((c) => c.id === editingClimbId) : null;
    const baseClimb: Climb = {
      id: editingClimbId ?? `draft-${Date.now()}`,
      wallVersionId: selectedVersion.id,
      createdByUserId: currentUserId,
      createdByName: data.currentUser.name,
      name: draft.name.trim(),
      setterGrade: draft.setterGrade.trim(),
      notes: draft.notes.trim(),
      holds,
      ratings: previous?.ratings ?? [],
      gradeVotes: previous?.gradeVotes ?? [],
      favorites: previous?.favorites ?? [],
      sends: previous?.sends ?? []
    };
    const method = editingClimbId ? 'PATCH' : 'POST';
    const url = editingClimbId ? `/api/climbs/${editingClimbId}` : '/api/climbs';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallVersionId: selectedVersion.id,
        name: draft.name.trim(),
        setterGrade: draft.setterGrade.trim(),
        notes: draft.notes.trim(),
        holds
      })
    }).catch(() => null);

    if (!res) {
      setRequestError('Could not save the climb.');
      return;
    }

    if (!res.ok) {
      setRequestError(await readError(res));
      return;
    }

    const payload = editingClimbId ? null : await res.json();
    const savedClimb = editingClimbId ? baseClimb : { ...baseClimb, id: payload.id };

    setClimbs((current) => editingClimbId ? current.map((climb) => (climb.id === editingClimbId ? savedClimb : climb)) : [savedClimb, ...current]);
    setDraft(emptyDraft());
    setSelectedRole('start');
    setEditingClimbId(null);
    setSelectedClimbId(savedClimb.id);
    setDetailClimbId(savedClimb.id);
    setActiveTab('climbs');
  };

  const startEditing = (climb: Climb) => {
    if (climb.createdByUserId !== currentUserId) return;
    const selected: Record<HoldRole, string[]> = { start: [], middle: [], finish: [] };
    for (const ref of climb.holds) selected[ref.role].push(ref.holdId);
    setDraft({ name: climb.name, setterGrade: climb.setterGrade, notes: climb.notes, selected });
    setEditingClimbId(climb.id);
    setSelectedVersionId(climb.wallVersionId);
    setSelectedRole('start');
    setActiveTab('new');
  };

  const deleteClimb = async (climb: Climb) => {
    if (climb.createdByUserId !== currentUserId && !isAdminUser) return;
    setRequestError('');

    if (!window.confirm(`Delete "${climb.name}"?`)) return;

    const res = await fetch(`/api/climbs/${climb.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res) {
      setRequestError('Could not delete the climb.');
      return;
    }

    if (!res.ok) {
      setRequestError(await readError(res));
      return;
    }

    setClimbs((current) => current.filter((item) => item.id !== climb.id));
    if (selectedClimbId === climb.id) setSelectedClimbId(null);
    if (detailClimbId === climb.id) setDetailClimbId(null);
  };

  const highlightedDraftHolds = selectedVersion
    ? selectedVersion.holds
    .filter((hold) => selectedHoldSet.has(hold.canonicalHoldId))
    .map((hold) => ({ hold, role: (['start', 'middle', 'finish'] as HoldRole[]).find((candidate) => draft.selected[candidate].includes(hold.canonicalHoldId)) }))
    : [];

  const roleSummary = (role: HoldRole) => selectedVersion ? draft.selected[role].map((holdId) => selectedVersion.holds.find((hold) => hold.canonicalHoldId === holdId)?.label).filter(Boolean).join(', ') || 'None selected' : 'No layout selected';

  if (detailClimb) {
    return (
      <div className="container col mobile-shell">
        {requestError ? <div className="card auth-error">{requestError}</div> : null}
        <button className="button secondary" onClick={() => setDetailClimbId(null)}>← Back to climbs</button>
        <FullScreenClimbPage
          climb={detailClimb}
          currentUserId={currentUserId}
          versions={versions}
          latestVersion={latest}
          compatibility={data.compatibility}
          isAdminUser={isAdminUser}
          onFavorite={() => toggleFavorite(detailClimb.id)}
          onRate={(stars) => saveRating(detailClimb.id, stars)}
          onSend={(grade) => markSent(detailClimb.id, grade)}
          onEdit={() => startEditing(detailClimb)}
          onDelete={() => deleteClimb(detailClimb)}
          ratingDraft={ratingDraft}
          setRatingDraft={setRatingDraft}
          sendGradeDraft={sendGradeDraft}
          setSendGradeDraft={setSendGradeDraft}
        />
      </div>
    );
  }

  return (
    <div className="container col mobile-shell">
      {requestError ? <div className="card auth-error">{requestError}</div> : null}
      {activeTab === 'home' && (
        <div className="grid grid-2 mobile-grid-1">
          <div className="card col">
            <h2 className="section-title">Quick stats</h2>
            <div className="stats-row">
              <div className="stat-pill"><span className="small">Created</span><strong>{profileCreated.length}</strong></div>
              <div className="stat-pill"><span className="small">Sent</span><strong>{profileSent.length}</strong></div>
              <div className="stat-pill"><span className="small">Favorites</span><strong>{profileFavorites.length}</strong></div>
              <div className="stat-pill"><span className="small">Layouts</span><strong>{versions.length}</strong></div>
            </div>
          </div>
          <div className="card col">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="section-title">Current layout</h2>
                <p className="section-subtitle">Preview any saved layout from the homepage.</p>
              </div>
              <div className="compact-field">
                <label className="label">Layout to preview</label>
                <VersionSelect versions={versions} value={selectedVersionId} onChange={setSelectedVersionId} />
              </div>
            </div>
            {selectedVersion ? <WallPreview version={selectedVersion} uniformColor="#22c55e" /> : <EmptyState message="No layouts yet. Create one in the Layouts tab to start tracking holds and climbs." />}
          </div>
        </div>
      )}

      {activeTab === 'climbs' && (
        <div className="col">
          <div className="card col">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="section-title">Search & filters</h2>
                <p className="section-subtitle">Search by climb name, filter by grade, favorites, or sent status.</p>
              </div>
              <div className="compact-field">
                <label className="label">Layout filter</label>
                <VersionSelect versions={versions} value={selectedVersionId} onChange={setSelectedVersionId} />
              </div>
            </div>
            <div className="grid grid-3 mobile-grid-1">
              <input className="input" placeholder="Search climbs or setters" value={climbSearch} onChange={(e) => setClimbSearch(e.target.value)} />
              <select className="select" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                <option value="all">All grades</option>
                {['VB','V0','V1','V2','V3','V4','V5','V6'].map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
              <select className="select" value={climbFilter} onChange={(e) => setClimbFilter(e.target.value as ClimbFilter)}>
                <option value="all">All climbs</option>
                <option value="favorites">Favorites only</option>
                <option value="sent">Sent only</option>
              </select>
            </div>
          </div>
          <div className="list">
            {!filteredClimbs.length ? <div className="card small">{hasLayouts ? 'No climbs match this layout/filter yet.' : 'No layouts yet, so there are no climbs to show.'}</div> : null}
            {filteredClimbs.map((climb) => {
              const baseVersion = versions.find((v) => v.id === climb.wallVersionId) ?? latest;
              const favorite = isFavorited(climb, currentUserId);
              const sent = hasSent(climb, currentUserId);
              const compatibility = latest && climb.wallVersionId !== latest.id ? getCompatibility(climb.id, latest.id, data.compatibility) : null;
              if (!baseVersion) return null;
              return (
                <button key={climb.id} className={`card climb-list-button ${selectedClimbId === climb.id ? 'selected-panel' : ''}`} onClick={() => { setSelectedClimbId(climb.id); setDetailClimbId(climb.id); }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong>{climb.name}</strong>
                      <div className="small">by {climb.createdByName} · {baseVersion.name}</div>
                      <div className="small">setter {climb.setterGrade} · community {communityGrade(climb)}</div>
                    </div>
                    <div className="col" style={{ alignItems: 'flex-end' }}>
                      <span className="route-chip">★ {averageRating(climb) ?? '—'}</span>
                      <span className="route-chip">♥ {(climb.favorites ?? []).length}</span>
                    </div>
                  </div>
                  <div className="row">
                    {favorite && <span className="badge">favorite</span>}
                    {sent && <span className="badge">sent</span>}
                    {compatibility && <span className="badge">{compatibility.status}</span>}
                  </div>
                </button>
              );
            })}
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
              <div className="compact-field">
                <label className="label">Layout for this climb</label>
                <VersionSelect versions={versions} value={selectedVersionId} onChange={setSelectedVersionId} />
              </div>
            </div>
            {!selectedVersion ? (
              <EmptyState message="Create a layout first before adding climbs." />
            ) : (
              <>
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
                <div className="row">{(['start', 'middle', 'finish'] as HoldRole[]).map((role) => <button key={role} className={`button ${selectedRole === role ? '' : 'secondary'}`} type="button" onClick={() => setSelectedRole(role)}>{role}</button>)}</div>
              </div>
            </div>
            <div>
              <label className="label">Tap holds on the wall</label>
              <InteractiveWall version={selectedVersion} selectedRole={selectedRole} draft={draft.selected} onToggleHold={toggleHold} />
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
            {formError && <div className="card" style={{ borderColor: '#7f1d1d', color: '#fecaca' }}>{formError}</div>}
            <div className="row">
              <button className="button" type="button" onClick={saveDraftClimb}>{editingClimbId ? 'Update climb' : 'Save climb'}</button>
              <button className="button secondary" type="button" onClick={() => { if (!draft.name && !draft.setterGrade && !draft.notes && !hasDraftSelections) { setDraft(emptyDraft()); setEditingClimbId(null); return; } if (window.confirm('Discard unsaved climb changes?')) { setDraft(emptyDraft()); setEditingClimbId(null); setFormError(''); } }}>Reset</button>
            </div>
            <div className="card col"><strong>Draft preview</strong><WallPreview version={selectedVersion} highlighted={highlightedDraftHolds} scale={photoAdjust.scale} offsetX={photoAdjust.offsetX} offsetY={photoAdjust.offsetY} rotation={photoAdjust.rotation} wide /></div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'versions' && canManageLayouts && (
        <div className="grid grid-2 mobile-grid-1">
          <div className="col">
            <div className="card col">
              <div>
                <h2 className="section-title">Board layouts</h2>
                <p className="section-subtitle">Choose whether you want to edit a saved layout or create a new one from an existing layout.</p>
              </div>
              <div className="row">
                <button className={`button ${layoutMode === 'edit' ? '' : 'secondary'}`} type="button" onClick={() => setLayoutMode('edit')}>Edit existing layout</button>
                <button className={`button ${layoutMode === 'create' ? '' : 'secondary'}`} type="button" onClick={() => setLayoutMode('create')}>Create new layout</button>
              </div>
            </div>

            {layoutMode === 'create' ? (
              <div className="card col">
                <div>
                  <h2 className="section-title">Create new layout</h2>
                  <p className="section-subtitle">Pick a source layout to copy, then name and describe the new layout you want to create.</p>
                </div>
                <div className="grid grid-2 mobile-grid-1">
                  <div><label className="label">New layout name</label><input className="input" value={versionDraft.name} onChange={(e) => setVersionDraft((current) => ({ ...current, name: e.target.value }))} /></div>
                  <div className="col" style={{ gap: 8 }}>
                    <div><label className="label">Source layout to copy from</label><VersionSelect versions={versions} value={versionDraft.sourceVersionId} onChange={(value) => setVersionDraft((current) => ({ ...current, sourceVersionId: value }))} /></div>
                    <span className="small">{hasLayouts ? 'The new layout starts by copying this layout\'s image and hold map.' : 'No source layouts exist yet, so this new layout will start blank.'}</span>
                  </div>
                </div>
                <div className="grid grid-2 mobile-grid-1">
                  <div><label className="label">Change type</label><select className="select" value={versionDraft.changeType} onChange={(e) => setVersionDraft((current) => ({ ...current, changeType: e.target.value as ChangeType }))}><option value="additive">additive</option><option value="modified">modified</option><option value="reset">reset</option></select></div>
                  <div><label className="label">Notes</label><input className="input" value={versionDraft.notes} onChange={(e) => setVersionDraft((current) => ({ ...current, notes: e.target.value }))} /></div>
                </div>
                <button className="button" type="button" onClick={createVersionFromDraft}>Create new layout</button>
              </div>
            ) : (
              <div className="card col">
                <div className="layout-editor-header">
                  <div>
                    <h2 className="section-title">Edit existing layout</h2>
                    <p className="section-subtitle">Choose a saved layout, adjust its details, then save your changes.</p>
                  </div>
                  <div className="layout-editor-toolbar">
                    <div className="compact-field">
                      <label className="label">Layout to edit</label>
                      <VersionSelect versions={versions} value={selectedVersionId} onChange={(value) => { setSelectedVersionId(value); setLayoutHoldId(null); }} />
                    </div>
                    <label className="button secondary file-button">Upload image<input type="file" accept="image/*" onChange={onBoardImageUpload} /></label>
                    <button className="button secondary" type="button" onClick={saveSelectedLayout} disabled={!selectedVersion || !layoutHasUnsavedChanges || savingLayout}>{savingLayout ? 'Saving…' : 'Save changes'}</button>
                    <button className="button danger" type="button" onClick={deleteSelectedLayout} disabled={!selectedVersion}>Delete layout</button>
                  </div>
                </div>
                {!selectedVersion ? (
                  <EmptyState message="There are no layouts to edit right now. Switch to Create new layout to make the first one." />
                ) : (
                  <>
                <div className="grid grid-3 mobile-grid-1">
                  <div><label className="label">Layout name</label><input className="input" value={selectedVersion.name} onChange={(e) => updateSelectedVersion((version) => ({ ...version, name: e.target.value }), true)} /></div>
                  <div><label className="label">Change type</label><select className="select" value={selectedVersion.changeType} onChange={(e) => updateSelectedVersion((version) => ({ ...version, changeType: e.target.value as ChangeType }), true)}><option value="additive">additive</option><option value="modified">modified</option><option value="reset">reset</option></select></div>
                  <div className="card small layout-status-card">{layoutHasUnsavedChanges ? 'Unsaved layout changes' : 'All layout changes saved'}</div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" value={selectedVersion.notes} onChange={(e) => updateSelectedVersion((version) => ({ ...version, notes: e.target.value }), true)} />
                </div>
                <div className="card col">
                  <label className="label">Adjust photo</label>
                  <div className="grid grid-2 mobile-grid-1">
                    <div>
                      <div className="small">Zoom: {photoAdjust.scale.toFixed(2)}x</div>
                      <input className="range" type="range" min="0.6" max="1.8" step="0.05" value={photoAdjust.scale} onChange={(e) => updatePhotoAdjust({ scale: Number(e.target.value) })} />
                    </div>
                    <div>
                      <div className="small">Rotate: {photoAdjust.rotation}°</div>
                      <input className="range" type="range" min="-25" max="25" step="1" value={photoAdjust.rotation} onChange={(e) => updatePhotoAdjust({ rotation: Number(e.target.value) })} />
                    </div>
                    <div>
                      <div className="small">Move X: {photoAdjust.offsetX}px</div>
                      <input className="range" type="range" min="-120" max="120" step="2" value={photoAdjust.offsetX} onChange={(e) => updatePhotoAdjust({ offsetX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <div className="small">Move Y: {photoAdjust.offsetY}px</div>
                      <input className="range" type="range" min="-120" max="120" step="2" value={photoAdjust.offsetY} onChange={(e) => updatePhotoAdjust({ offsetY: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="row">
                    <button className="button secondary" type="button" onClick={() => updatePhotoAdjust({ scale: 1, offsetX: 0, offsetY: 0, rotation: 0 })}>Reset photo</button>
                    <button className="button danger" type="button" onClick={removeHoldFromLayout} disabled={!activeLayoutHold}>Delete selected hold</button>
                  </div>
                </div>
                <TapDragBoard version={selectedVersion} activeHoldId={layoutHoldId} onSelectHold={setLayoutHoldId} onMoveHold={updateHoldPosition} onAddHold={addHoldAtPosition} scale={photoAdjust.scale} offsetX={photoAdjust.offsetX} offsetY={photoAdjust.offsetY} rotation={photoAdjust.rotation} />
                <div className="grid grid-2 mobile-grid-1">
                  <div className="card col">
                    <strong>Selected hold</strong>
                    <span className="small">{activeLayoutHold ? `${activeLayoutHold.label} @ ${Math.round(activeLayoutHold.x)}, ${Math.round(activeLayoutHold.y)}` : 'Tap a hold to edit it.'}</span>
                    <label className="label">Label</label>
                    <input className="input" value={activeLayoutHold?.label ?? ''} onChange={(e) => renameActiveHold(e.target.value)} disabled={!activeLayoutHold} />
                    <label className="label">Color</label>
                    <input className="input" type="color" value={activeLayoutHold?.color ?? '#ffffff'} onChange={(e) => recolorActiveHold(e.target.value)} disabled={!activeLayoutHold} />
                  </div>
                  <div className="card col"><strong>How it works</strong><span className="small">- Choose the saved layout you want to update</span><span className="small">- Upload a fresh board photo for that layout</span><span className="small">- Tap the image to create a new hold</span><span className="small">- Drag any hold to reposition it</span><span className="small">- Tap a hold, then rename, recolor, or delete it</span></div>
                </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="col">
            <div className="card"><h2 className="section-title">Layout history</h2><p className="section-subtitle">Track layout changes and whether older climbs still work.</p></div>
            <div className="list">
              {!versions.length ? <div className="card small">No layouts saved yet.</div> : null}
              {versions.map((version) => <div key={version.id} className={`card ${version.id === selectedVersion?.id ? 'selected-panel' : ''}`}><div className="row" style={{ justifyContent: 'space-between' }}><strong>{version.name}</strong><span className="badge">{version.changeType}</span></div><div className="small">{version.holds.length} holds</div><p className="small">{version.notes}</p></div>)}
              {inheritedClimbs.map((climb) => {
                if (!latest) return null;
                const status = getCompatibility(climb.id, latest.id, data.compatibility);
                return <div key={climb.id} className="card"><div className="row" style={{ justifyContent: 'space-between' }}><strong>{climb.name}</strong><span className="badge">{status?.status ?? 'unknown'}</span></div><p className="small">{status?.reason ?? 'No compatibility data yet.'}</p></div>;
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <>
          <SessionHeader name={data.currentUser.name} email={data.currentUser.email} role={data.currentUser.role} />
          <div className="card">
            <div className="badge">GB App</div>
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">Your climbs, favorites, and sends.</p>
          </div>
          <div className="grid grid-3 mobile-grid-1">
            <ProfileColumn title="Created" climbs={profileCreated} onOpen={(id) => setDetailClimbId(id)} />
            <ProfileColumn title="Favorites" climbs={profileFavorites} onOpen={(id) => setDetailClimbId(id)} />
            <ProfileColumn title="Sent" climbs={profileSent} onOpen={(id) => setDetailClimbId(id)} />
          </div>
        </>
      )}

      <div className="bottom-nav-spacer" />
      <nav className={`bottom-nav ${canManageLayouts ? 'bottom-nav-5' : 'bottom-nav-4'}`}>
        {[
          ['home', '⌂', 'Home'],
          ['climbs', '◇', 'Climbs'],
          ['new', '＋', 'New'],
          ...(canManageLayouts ? [['versions', '◫', 'Layouts'] as const] : []),
          ['profile', '◎', 'Profile']
        ].map(([id, icon, label]) => (
          <button key={id} className={`bottom-nav-item compact with-label ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id as TabId)} aria-label={label}>
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function SessionHeader({ name, email, role }: { name: string; email: string; role: DashboardData['currentUser']['role'] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.refresh();
    setPending(false);
  };

  return (
    <div className="card session-card">
      <div>
        <div className="section-title">GB App</div>
        <div className="small">{name} · {email}</div>
      </div>
      <div className="row">
        <span className="badge">{role}</span>
        <button className="button secondary" type="button" disabled={pending} onClick={signOut}>
          {pending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

function ProfileColumn({ title, climbs, onOpen }: { title: string; climbs: Climb[]; onOpen: (id: string) => void }) {
  return (
    <div className="card col">
      <h2 className="section-title">{title}</h2>
      <div className="list">
        {climbs.length ? climbs.map((climb) => <button key={climb.id} className="card climb-list-button" onClick={() => onOpen(climb.id)}><strong>{climb.name}</strong><div className="small">setter {climb.setterGrade} · community {communityGrade(climb)}</div></button>) : <div className="small">Nothing here yet.</div>}
      </div>
    </div>
  );
}

function FullScreenClimbPage({ climb, currentUserId, isAdminUser, versions, latestVersion, compatibility, onFavorite, onRate, onSend, onEdit, onDelete, ratingDraft, setRatingDraft, sendGradeDraft, setSendGradeDraft }: { climb: Climb; currentUserId: string; isAdminUser: boolean; versions: WallVersion[]; latestVersion: WallVersion | null; compatibility: DashboardData['compatibility']; onFavorite: () => void; onRate: (stars: number) => void; onSend: (grade: string) => void; onEdit: () => void; onDelete: () => void; ratingDraft: number; setRatingDraft: (n: number) => void; sendGradeDraft: string; setSendGradeDraft: (v: string) => void; }) {
  const baseVersion = versions.find((v) => v.id === climb.wallVersionId) ?? latestVersion;
  if (!baseVersion) {
    return (
      <div className="card col">
        <h1 className="page-title">{climb.name}</h1>
        <p className="small">This climb&apos;s layout no longer exists.</p>
        <div className="row">
          <button className="button danger" onClick={onDelete}>Delete climb</button>
        </div>
      </div>
    );
  }
  const groups = groupClimbHolds(climb, baseVersion);
  const highlight = baseVersion.holds.filter((hold) => climb.holds.some((ref) => ref.holdId === hold.canonicalHoldId)).map((hold) => ({ hold, role: climb.holds.find((ref) => ref.holdId === hold.canonicalHoldId)?.role }));
  const status = latestVersion && climb.wallVersionId !== latestVersion.id ? compatibility.find((entry) => entry.climbId === climb.id && entry.targetWallVersionId === latestVersion.id) : null;
  const favorite = isFavorited(climb, currentUserId);
  const sent = hasSent(climb, currentUserId);
  const isOwner = climb.createdByUserId === currentUserId;
  const canManage = isOwner || isAdminUser;
  return (
    <div className="card col">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">{climb.name}</h1>
          <div className="small">by {climb.createdByName} · {baseVersion.name}</div>
          <div className="small">setter {climb.setterGrade} · community {communityGrade(climb)} · ★ {averageRating(climb) ?? '—'}</div>
        </div>
        <div className="row">
          {favorite && <span className="badge">favorite</span>}
          {sent && <span className="badge">sent</span>}
        </div>
      </div>
      <WallPreview version={baseVersion} highlighted={highlight} />
      <div className="row">
        <span className="route-chip">start: {groups.start.map((hold) => hold.label).join(', ') || '—'}</span>
        <span className="route-chip">middle: {groups.middle.map((hold) => hold.label).join(', ') || '—'}</span>
        <span className="route-chip">finish: {groups.finish.map((hold) => hold.label).join(', ') || '—'}</span>
      </div>
      {status && <div className="badge">current layout status: {status.status}</div>}
      <p className="small">{climb.notes || 'No notes yet.'}</p>
      <div className="grid grid-2 mobile-grid-1">
        <div className="card col">
          <strong>Actions</strong>
          <button className={`button ${favorite ? 'secondary' : ''}`} onClick={onFavorite}>{favorite ? 'Unfavorite' : 'Favorite'}</button>
          <label className="label">Rate this climb</label>
          <select className="select" value={ratingDraft} onChange={(e) => setRatingDraft(Number(e.target.value))}>{[5,4,3,2,1].map((stars) => <option key={stars} value={stars}>{stars} stars</option>)}</select>
          <button className="button secondary" onClick={() => onRate(ratingDraft)}>Save rating</button>
          <label className="label">Mark sent with grade</label>
          <select className="select" value={sendGradeDraft} onChange={(e) => setSendGradeDraft(e.target.value)}>{['VB','V0','V1','V2','V3','V4','V5','V6'].map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select>
          <button className="button secondary" onClick={() => onSend(sendGradeDraft)}>{sent ? 'Update send grade' : 'Mark sent'}</button>
        </div>
        <div className="card col">
          <strong>Stats</strong>
          <span className="small">Favorites: {(climb.favorites ?? []).length}</span>
          <span className="small">Ratings: {climb.ratings.length}</span>
          <span className="small">Sends: {climb.sends?.length ?? 0}</span>
          <span className="small">Community grade: {communityGrade(climb)}</span>
          <span className="small">Average rating: {averageRating(climb) ?? 'No ratings yet'}</span>
        </div>
      </div>
      <div className="row">
        <button className={`button ${isOwner ? '' : 'secondary disabled-button'}`} onClick={onEdit} disabled={!isOwner}>Edit climb</button>
        <button className={`button danger ${canManage ? '' : 'disabled-button'}`} onClick={onDelete} disabled={!canManage}>Delete climb</button>
      </div>
    </div>
  );
}

function VersionSelect({ versions, value, onChange }: { versions: WallVersion[]; value: string; onChange: (value: string) => void }) {
  return (
    <select className="select compact-select" value={value} onChange={(e) => onChange(e.target.value)} disabled={!versions.length}>
      {!versions.length ? <option value="">No layouts</option> : null}
      {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
    </select>
  );
}

function InteractiveWall({ version, selectedRole, draft, onToggleHold }: { version: WallVersion; selectedRole: HoldRole; draft: Record<HoldRole, string[]>; onToggleHold: (holdId: string) => void; }) {
  return (
    <div className="wall-preview interactive-wall">
      <div className="wall-preview-image-layer" style={{ transform: `translate(${version.photoOffsetX}px, ${version.photoOffsetY}px) scale(${version.photoScale}) rotate(${version.photoRotation}deg)` }}>
        <img className="wall-image" src={version.imageUrl} alt={version.name} />
      </div>
      <div className="wall-preview-inner">
        {version.holds.map((hold: Hold) => {
          const role = (['start', 'middle', 'finish'] as HoldRole[]).find((candidate) => draft[candidate].includes(hold.canonicalHoldId));
          const isSelected = Boolean(role);
          const roleColor = role === 'start' ? '#22c55e' : role === 'middle' ? '#f59e0b' : role === 'finish' ? '#ec4899' : '#ffffff';
          return <button key={hold.id} type="button" className={`hold-button ${isSelected ? 'selected' : ''}`} title={`${hold.label} · add as ${selectedRole}`} style={{ left: `${hold.x}%`, top: `${hold.y}%`, color: roleColor }} onClick={() => onToggleHold(hold.canonicalHoldId)}><span>{hold.label}</span></button>;
        })}
      </div>
    </div>
  );
}

function TapDragBoard({ version, activeHoldId, onSelectHold, onMoveHold, onAddHold, scale = 1, offsetX = 0, offsetY = 0, rotation = 0 }: { version: WallVersion; activeHoldId: string | null; onSelectHold: (holdId: string) => void; onMoveHold: (holdId: string, x: number, y: number) => void; onAddHold: (x: number, y: number) => void; scale?: number; offsetX?: number; offsetY?: number; rotation?: number; }) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ holdId: string; pointerId: number } | null>(null);
  const toPercent = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  };
  const handleBoardClick = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('button')) return;
    const pos = toPercent(event.clientX, event.clientY);
    onAddHold(pos.x, pos.y);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const pos = toPercent(event.clientX, event.clientY);
    onMoveHold(dragRef.current.holdId, pos.x, pos.y);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };
  return (
    <div ref={boardRef} className="wall-preview interactive-wall board-editor" onPointerDown={handleBoardClick} onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <div className="wall-preview-image-layer" style={{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)` }}>
        <img className="wall-image" src={version.imageUrl} alt={version.name} />
      </div>
      <div className="wall-preview-inner">
        {version.holds.map((hold) => <button key={hold.id} type="button" className={`hold-button draggable ${activeHoldId === hold.id ? 'selected' : ''}`} style={{ left: `${hold.x}%`, top: `${hold.y}%`, color: '#22c55e' }} onPointerDown={(event) => { event.stopPropagation(); dragRef.current = { holdId: hold.id, pointerId: event.pointerId }; onSelectHold(hold.id); }}><span>{hold.label}</span></button>)}
      </div>
      <div className="board-helper">Tap empty space to add a hold · drag a hold to move it</div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function EmptyState({ message }: { message: string }) {
  return <div className="card small">{message}</div>;
}
