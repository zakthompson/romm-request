import mysql from 'mysql2/promise';
import { config } from '../config.js';

let pool: mysql.Pool | null = null;

export function getRommPool(): mysql.Pool | null {
  if (pool) return pool;

  const rommConfig = config.romm;
  if (!rommConfig) return null;

  pool = mysql.createPool({
    host: rommConfig.host,
    port: rommConfig.port,
    database: rommConfig.database,
    user: rommConfig.user,
    password: rommConfig.password,
    waitForConnections: true,
    connectionLimit: 5,
    enableKeepAlive: true,
  });

  return pool;
}

export async function closeRommPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
