import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1(): D1Database {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export async function all<T>(query: string, ...values: unknown[]): Promise<T[]> {
  const result = await getD1().prepare(query).bind(...values).all<T>();
  return result.results;
}

export async function first<T>(query: string, ...values: unknown[]): Promise<T | null> {
  return getD1().prepare(query).bind(...values).first<T>();
}

export async function run(query: string, ...values: unknown[]) {
  return getD1().prepare(query).bind(...values).run();
}
