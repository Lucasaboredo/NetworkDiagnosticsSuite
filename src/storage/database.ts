import { open } from 'react-native-nitro-sqlite';
import {
  Device,
  Diagnostic,
  Installation,
  OutboxItem,
  uuid,
} from '../domain/types';

type Database = ReturnType<typeof open>;
let database: Database | undefined;

export async function getDatabase() {
  if (database) return database;
  database = open({ name: 'network_diagnostics.sqlite' });
  await database.executeAsync('PRAGMA foreign_keys = ON');
  await database.executeAsync('PRAGMA journal_mode = WAL');
  await database.executeBatchAsync([
    {
      query: `CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, ip TEXT NOT NULL, mac TEXT, hostname TEXT, vendor TEXT, source TEXT NOT NULL, last_seen_at TEXT NOT NULL, UNIQUE(ip))`,
    },
    {
      query: `CREATE TABLE IF NOT EXISTS diagnostics (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, type TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, error TEXT, sync_status TEXT NOT NULL, FOREIGN KEY(device_id) REFERENCES devices(id))`,
    },
    {
      query: `CREATE TABLE IF NOT EXISTS installations (id TEXT PRIMARY KEY, device_id TEXT, site TEXT NOT NULL, equipment TEXT NOT NULL, created_at TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL, notes TEXT NOT NULL, photos TEXT NOT NULL, diagnostic_ids TEXT NOT NULL, report_path TEXT, sync_status TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    },
    {
      query: `CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT, idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)`,
    },
    {
      query:
        'CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox(status, next_attempt_at)',
    },
    {
      query:
        'CREATE INDEX IF NOT EXISTS idx_diag_device ON diagnostics(device_id, created_at)',
    },
  ]);
  return database;
}

const rows = <T>(result: any): T[] =>
  Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i));
const queueCommand = (
  entityType: OutboxItem['entityType'],
  entityId: string,
  payload: unknown,
) => {
  const now = new Date().toISOString();
  return {
    query: `INSERT INTO outbox (id,entity_type,entity_id,operation,payload,status,attempts,next_attempt_at,idempotency_key,created_at) VALUES (?,?,?,?,?,'pending',0,?,?,?)`,
    params: [
      uuid(),
      entityType,
      entityId,
      'upsert',
      JSON.stringify(payload),
      now,
      `${entityType}:${entityId}:${now}`,
      now,
    ],
  };
};

export const deviceRepository = {
  async upsert(device: Device, enqueue = false) {
    const db = await getDatabase();
    const existing = await db.executeAsync(
      'SELECT id FROM devices WHERE ip=?',
      [device.ip],
    );
    const canonical = {
      ...device,
      id: String(existing.rows.item(0)?.id ?? device.id),
    };
    const command = {
      query: `INSERT OR REPLACE INTO devices (id,ip,mac,hostname,vendor,source,last_seen_at) VALUES (?,?,?,?,?,?,?)`,
      params: [
        canonical.id,
        device.ip,
        device.mac ?? null,
        device.hostname ?? null,
        device.vendor ?? null,
        device.source,
        device.lastSeenAt,
      ],
    };
    if (enqueue)
      await db.executeBatchAsync([
        command,
        queueCommand('device', canonical.id, canonical),
      ]);
    else await db.executeAsync(command.query, command.params);
    return canonical;
  },
  async all(search = ''): Promise<Device[]> {
    const db = await getDatabase();
    const result = await db.executeAsync(
      `SELECT id,ip,mac,hostname,vendor,source,last_seen_at AS lastSeenAt FROM devices WHERE ip LIKE ? OR hostname LIKE ? ORDER BY last_seen_at DESC`,
      [`%${search}%`, `%${search}%`],
    );
    return rows<Device>(result);
  },
  async find(id: string): Promise<Device | undefined> {
    const db = await getDatabase();
    const result = await db.executeAsync(
      `SELECT id,ip,mac,hostname,vendor,source,last_seen_at AS lastSeenAt FROM devices WHERE id=?`,
      [id],
    );
    return rows<Device>(result)[0];
  },
};

export const diagnosticRepository = {
  async save(item: Diagnostic) {
    const db = await getDatabase();
    await db.executeBatchAsync([
      {
        query: `INSERT INTO diagnostics (id,device_id,type,created_at,status,payload,error,sync_status) VALUES (?,?,?,?,?,?,?,?)`,
        params: [
          item.id,
          item.deviceId,
          item.type,
          item.createdAt,
          item.status,
          JSON.stringify(item.payload),
          item.error ?? null,
          item.syncStatus,
        ],
      },
      queueCommand('diagnostic', item.id, item),
    ]);
  },
  async all(search = ''): Promise<Diagnostic[]> {
    const db = await getDatabase();
    const result = await db.executeAsync(
      `SELECT d.id,d.device_id AS deviceId,d.type,d.created_at AS createdAt,d.status,d.payload,d.error,d.sync_status AS syncStatus FROM diagnostics d LEFT JOIN devices v ON v.id=d.device_id WHERE v.ip LIKE ? OR v.hostname LIKE ? OR d.type LIKE ? ORDER BY d.created_at DESC`,
      [`%${search}%`, `%${search}%`, `%${search}%`],
    );
    return rows<any>(result).map(x => ({
      ...x,
      payload: JSON.parse(x.payload),
    }));
  },
};

export const installationRepository = {
  async save(item: Installation) {
    const db = await getDatabase();
    await db.executeBatchAsync([
      {
        query: `INSERT OR REPLACE INTO installations (id,device_id,site,equipment,created_at,latitude,longitude,accuracy,notes,photos,diagnostic_ids,report_path,sync_status,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params: [
          item.id,
          item.deviceId ?? null,
          item.site,
          item.equipment,
          item.createdAt,
          item.latitude,
          item.longitude,
          item.accuracy ?? null,
          item.notes,
          JSON.stringify(item.photos),
          JSON.stringify(item.diagnosticIds),
          item.reportPath ?? null,
          item.syncStatus,
          item.updatedAt,
        ],
      },
      queueCommand('installation', item.id, item),
    ]);
  },
  async all(search = ''): Promise<Installation[]> {
    const db = await getDatabase();
    const result = await db.executeAsync(
      `SELECT id,device_id AS deviceId,site,equipment,created_at AS createdAt,latitude,longitude,accuracy,notes,photos,diagnostic_ids AS diagnosticIds,report_path AS reportPath,sync_status AS syncStatus,updated_at AS updatedAt FROM installations WHERE site LIKE ? OR equipment LIKE ? ORDER BY created_at DESC`,
      [`%${search}%`, `%${search}%`],
    );
    return rows<any>(result).map(x => ({
      ...x,
      photos: JSON.parse(x.photos),
      diagnosticIds: JSON.parse(x.diagnosticIds),
    }));
  },
};

export const outboxRepository = {
  async ready(): Promise<OutboxItem[]> {
    const db = await getDatabase();
    const result = await db.executeAsync(
      `SELECT id,entity_type AS entityType,entity_id AS entityId,operation,payload,status,attempts,next_attempt_at AS nextAttemptAt,last_error AS lastError,idempotency_key AS idempotencyKey,created_at AS createdAt FROM outbox WHERE status IN ('pending','error') AND next_attempt_at<=? ORDER BY created_at LIMIT 50`,
      [new Date().toISOString()],
    );
    return rows<OutboxItem>(result);
  },
  async all(): Promise<OutboxItem[]> {
    const db = await getDatabase();
    const result = await db.executeAsync(
      `SELECT id,entity_type AS entityType,entity_id AS entityId,operation,payload,status,attempts,next_attempt_at AS nextAttemptAt,last_error AS lastError,idempotency_key AS idempotencyKey,created_at AS createdAt FROM outbox ORDER BY created_at DESC`,
    );
    return rows<OutboxItem>(result);
  },
  async markSyncing(id: string) {
    const db = await getDatabase();
    await db.executeAsync(`UPDATE outbox SET status='syncing' WHERE id=?`, [
      id,
    ]);
  },
  async markSynced(id: string, entityType: string, entityId: string) {
    const db = await getDatabase();
    const table =
      entityType === 'diagnostic'
        ? 'diagnostics'
        : entityType === 'installation'
        ? 'installations'
        : null;
    const commands = [
      {
        query: `UPDATE outbox SET status='synced',last_error=NULL WHERE id=?`,
        params: [id],
      },
    ];
    if (table)
      commands.push({
        query: `UPDATE ${table} SET sync_status='synced' WHERE id=?`,
        params: [entityId],
      });
    await db.executeBatchAsync(commands);
  },
  async markError(item: OutboxItem, error: string) {
    const db = await getDatabase();
    const attempts = item.attempts + 1;
    const delay = Math.min(300000, Math.pow(2, attempts) * 5000);
    await db.executeAsync(
      `UPDATE outbox SET status='error',attempts=?,next_attempt_at=?,last_error=? WHERE id=?`,
      [attempts, new Date(Date.now() + delay).toISOString(), error, item.id],
    );
  },
  async retry(id: string) {
    const db = await getDatabase();
    await db.executeAsync(
      `UPDATE outbox SET status='pending',next_attempt_at=?,last_error=NULL WHERE id=?`,
      [new Date().toISOString(), id],
    );
  },
};

export async function getDashboardCounts() {
  const db = await getDatabase();
  const result: Record<string, number> = {};
  for (const [key, table] of [
    ['devices', 'devices'],
    ['diagnostics', 'diagnostics'],
    ['installations', 'installations'],
    ['pending', 'outbox'],
  ] as const) {
    const where = key === 'pending' ? ` WHERE status!='synced'` : '';
    const r = await db.executeAsync(
      `SELECT COUNT(*) AS count FROM ${table}${where}`,
    );
    result[key] = Number(r.rows.item(0)?.count ?? 0);
  }
  return result;
}
