/**
 * Dice auth state path: optional in-memory override (set by Electron/frontend in dev) and env fallback.
 * Used by expenses scraper and dice-auth routes.
 */
import path from "path";
import fs from "fs";

let pathOverride: string | undefined;

export function setDiceAuthPathOverride(p: string | undefined): void {
  pathOverride = p ? path.resolve(p) : undefined;
}

export function getDiceAuthStatePath(): string | undefined {
  const raw = pathOverride ?? process.env.DICE_AUTH_STATE_PATH;
  if (!raw) return undefined;
  const resolved = path.resolve(process.cwd(), raw);
  if (!fs.existsSync(resolved)) return undefined;
  return resolved;
}

/** Returns true if auth state file exists (from override or env). */
export function hasDiceAuth(): boolean {
  const p = getDiceAuthStatePath();
  if (!p) return false;
  try {
    return fs.statSync(p).size > 0;
  } catch {
    return false;
  }
}
