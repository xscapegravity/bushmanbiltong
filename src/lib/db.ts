import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Singleton better-sqlite3 connection with WAL mode.
 * Migrations run once per process at first import (idempotent, version-tracked).
 */

declare global {
  // eslint-disable-next-line no-var
  var __bbdb: Database.Database | undefined;
}

function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);

  const applied = new Set(
    db.prepare("SELECT name FROM migrations").all().map((r: any) => r.name)
  );

  const dir = path.join(process.cwd(), "migrations");
  if (!fs.existsSync(dir)) return;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const insert = db.prepare("INSERT INTO migrations (name) VALUES (?)");

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const tx = db.transaction(() => {
      db.exec(sql);
      insert.run(file);
      console.log(`[db] migration applied: ${file}`);
    });
    tx();
  }
}

export function getDb(): Database.Database {
  if (globalThis.__bbdb) return globalThis.__bbdb;

  const dbPath = process.env.DATABASE_PATH || "./data/biltong.db";
  const dir = path.dirname(dbPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[db] created data dir: ${dir}`);
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);

  globalThis.__bbdb = db;
  return db;
}
