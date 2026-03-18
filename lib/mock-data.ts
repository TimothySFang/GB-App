import { DashboardData } from './types';

export const mockData: DashboardData = {
  currentUser: { id: 'u1', name: 'Timmy', email: 'timmy@example.com', role: 'admin' },
  users: [
    { id: 'u1', name: 'Timmy', email: 'timmy@example.com', role: 'admin' },
    { id: 'u2', name: 'Ava', email: 'ava@example.com', role: 'member' },
    { id: 'u3', name: 'Marcus', email: 'marcus@example.com', role: 'member' }
  ],
  wall: {
    id: 'wall-1',
    name: 'Garage Board',
    notes: '40 degree home wall with frequent hold tweaks.',
    versions: [
      {
        id: 'wv-1',
        wallId: 'wall-1',
        name: 'Spring Base Set',
        changeType: 'reset',
        imageUrl: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80',
        notes: 'Original baseline set for MVP.',
        holds: [
          { id: 'h1v1', canonicalHoldId: 'h1', label: 'A1', color: '#fb7185', x: 18, y: 72, status: 'active' },
          { id: 'h2v1', canonicalHoldId: 'h2', label: 'A2', color: '#f59e0b', x: 34, y: 61, status: 'active' },
          { id: 'h3v1', canonicalHoldId: 'h3', label: 'A3', color: '#22d3ee', x: 52, y: 50, status: 'active' },
          { id: 'h4v1', canonicalHoldId: 'h4', label: 'A4', color: '#a78bfa', x: 65, y: 37, status: 'active' },
          { id: 'h5v1', canonicalHoldId: 'h5', label: 'A5', color: '#4ade80', x: 76, y: 18, status: 'active' }
        ]
      },
      {
        id: 'wv-2',
        wallId: 'wall-1',
        parentVersionId: 'wv-1',
        name: 'Spring + Add-ons',
        changeType: 'additive',
        imageUrl: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80',
        notes: 'A few extra holds added for more options.',
        holds: [
          { id: 'h1v2', canonicalHoldId: 'h1', label: 'A1', color: '#fb7185', x: 18, y: 72, status: 'active' },
          { id: 'h2v2', canonicalHoldId: 'h2', label: 'A2', color: '#f59e0b', x: 34, y: 61, status: 'active' },
          { id: 'h3v2', canonicalHoldId: 'h3', label: 'A3', color: '#22d3ee', x: 52, y: 50, status: 'active' },
          { id: 'h4v2', canonicalHoldId: 'h4', label: 'A4', color: '#a78bfa', x: 65, y: 37, status: 'active' },
          { id: 'h5v2', canonicalHoldId: 'h5', label: 'A5', color: '#4ade80', x: 76, y: 18, status: 'active' },
          { id: 'h6v2', canonicalHoldId: 'h6', label: 'B1', color: '#f97316', x: 25, y: 38, status: 'added' },
          { id: 'h7v2', canonicalHoldId: 'h7', label: 'B2', color: '#60a5fa', x: 44, y: 28, status: 'added' }
        ]
      }
    ]
  },
  climbs: [
    {
      id: 'c1',
      wallVersionId: 'wv-1',
      createdByUserId: 'u1',
      createdByName: 'Timmy',
      name: 'Warmup Groove',
      setterGrade: 'V2',
      notes: 'Friendly warm-up with a long reach to the finish.',
      holds: [
        { holdId: 'h1', role: 'start', order: 1 },
        { holdId: 'h2', role: 'middle', order: 2 },
        { holdId: 'h3', role: 'middle', order: 3 },
        { holdId: 'h5', role: 'finish', order: 4 }
      ],
      ratings: [
        { userId: 'u2', stars: 4 },
        { userId: 'u3', stars: 5 }
      ],
      gradeVotes: [
        { userId: 'u2', grade: 'V2' },
        { userId: 'u3', grade: 'V3' }
      ]
    },
    {
      id: 'c2',
      wallVersionId: 'wv-2',
      createdByUserId: 'u2',
      createdByName: 'Ava',
      name: 'Orange Slice',
      setterGrade: 'V4',
      notes: 'Uses the new orange sidepull and finishes on the green jug.',
      holds: [
        { holdId: 'h1', role: 'start', order: 1 },
        { holdId: 'h6', role: 'middle', order: 2 },
        { holdId: 'h7', role: 'middle', order: 3 },
        { holdId: 'h5', role: 'finish', order: 4 }
      ],
      ratings: [{ userId: 'u1', stars: 5 }],
      gradeVotes: [{ userId: 'u1', grade: 'V4' }]
    }
  ],
  compatibility: [
    {
      climbId: 'c1',
      targetWallVersionId: 'wv-2',
      status: 'compatible',
      reason: 'All referenced holds still exist in the additive version.'
    }
  ]
};
