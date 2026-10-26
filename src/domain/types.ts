/* eslint-disable no-bitwise -- UUID variant/version bits require byte masks. */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface Device {
  id: string;
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  source: 'mdns' | 'tcp' | 'manual' | 'qr';
  lastSeenAt: string;
}

export interface Diagnostic {
  id: string;
  deviceId: string;
  type: 'snmp' | 'ssh';
  createdAt: string;
  status: 'success' | 'error';
  payload: Record<string, unknown>;
  error?: string;
  syncStatus: SyncStatus;
}

export interface Installation {
  id: string;
  deviceId?: string;
  site: string;
  equipment: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  notes: string;
  photos: string[];
  diagnosticIds: string[];
  reportPath?: string;
  syncStatus: SyncStatus;
  updatedAt: string;
}

export interface OutboxItem {
  id: string;
  entityType: 'device' | 'diagnostic' | 'installation' | 'report';
  entityId: string;
  operation: 'upsert';
  payload: string;
  status: SyncStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError?: string;
  idempotencyKey: string;
  createdAt: string;
}

export const uuid = () => {
  const bytes = Array.from({length: 16}, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = bytes.map(v => v.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
