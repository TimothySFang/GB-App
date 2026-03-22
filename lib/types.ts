export type Role = 'admin' | 'member';
export type ChangeType = 'additive' | 'modified' | 'reset';
export type HoldStatus = 'active' | 'moved' | 'removed' | 'added';
export type HoldRole = 'start' | 'middle' | 'finish';
export type CompatibilityStatus = 'compatible' | 'needs_review' | 'incompatible';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Hold = {
  id: string;
  canonicalHoldId: string;
  label: string;
  color: string;
  x: number;
  y: number;
  status: HoldStatus;
};

export type ClimbHold = {
  holdId: string;
  role: HoldRole;
  order: number;
};

export type GradeVote = {
  userId: string;
  grade: string;
};

export type Rating = {
  userId: string;
  stars: number;
};

export type Send = {
  userId: string;
  grade: string;
  sentAt: string;
};

export type Climb = {
  id: string;
  wallVersionId: string;
  createdByUserId: string;
  createdByName: string;
  name: string;
  setterGrade: string;
  notes: string;
  holds: ClimbHold[];
  ratings: Rating[];
  gradeVotes: GradeVote[];
  favorites?: string[];
  sends?: Send[];
};

export type Compatibility = {
  climbId: string;
  targetWallVersionId: string;
  status: CompatibilityStatus;
  reason: string;
};

export type WallVersion = {
  id: string;
  wallId: string;
  parentVersionId?: string;
  name: string;
  changeType: ChangeType;
  imageUrl: string;
  photoScale: number;
  photoOffsetX: number;
  photoOffsetY: number;
  photoRotation: number;
  notes: string;
  holds: Hold[];
};

export type Wall = {
  id: string;
  name: string;
  notes: string;
  versions: WallVersion[];
};

export type DashboardData = {
  currentUser: User;
  users: User[];
  wall: Wall;
  climbs: Climb[];
  compatibility: Compatibility[];
};
