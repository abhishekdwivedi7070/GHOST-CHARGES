import pg, { Pool } from "pg";

pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env.");
}

export const pool = new Pool({ connectionString });

export async function query<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params);
}
