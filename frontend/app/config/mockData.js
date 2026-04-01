export const mockCamera = {
  id: 1,
  name: 'Pool Cam #1',
  status: 'online',
  lastSeen: '5s ago',
  location: 'North Pool Deck',
  uptime: '99%',
};

export const mockAlerts = [
  {
    id: 'a1',
    title: 'Child near pool edge',
    severity: 'high',
    cameraName: 'Pool Cam #1',
    createdAt: '2026-04-01 14:22',
    timeAgo: '5m ago',
    status: 'open',
    description: 'Child detected within danger zone boundary.',
    media: ['https://via.placeholder.com/320x180.png?text=Frame'],
  },
  {
    id: 'a2',
    title: 'Adult in safe zone',
    severity: 'low',
    cameraName: 'Pool Cam #1',
    createdAt: '2026-04-01 13:58',
    timeAgo: '30m ago',
    status: 'resolved',
    description: 'Adult detected, no action required.',
    media: [],
  },
  {
    id: 'a3',
    title: 'Object left near pool',
    severity: 'medium',
    cameraName: 'Pool Cam #1',
    createdAt: '2026-04-01 12:40',
    timeAgo: '2h ago',
    status: 'open',
    description: 'Unknown object detected near the pool edge.',
    media: ['https://via.placeholder.com/320x180.png?text=Object'],
  },
];
