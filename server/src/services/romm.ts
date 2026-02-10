import type { RowDataPacket } from 'mysql2/promise';
import { getRommPool } from '../db/romm.js';

interface PlatformRow extends RowDataPacket {
  igdb_id: number;
}

export async function getCollectionPlatforms(
  igdbGameId: number
): Promise<number[]> {
  const pool = getRommPool();
  if (!pool) return [];

  const [rows] = await pool.query<PlatformRow[]>(
    `SELECT DISTINCT p.igdb_id
     FROM roms r
     JOIN platforms p ON r.platform_id = p.id
     WHERE r.igdb_id = ?
       AND p.igdb_id IS NOT NULL`,
    [igdbGameId]
  );

  return rows.map((row) => row.igdb_id);
}
