/**
 * Generates UID in format UID-2026XXX (3-digit sequence).
 * VID in format VID-2026XXX. In production, use a DB sequence or Supabase function.
 */
const YEAR = "2026";

export function generateUID(sequence: number): string {
  const padded = String(sequence).padStart(3, "0");
  return `UID-${YEAR}${padded}`;
}

export function generateVID(sequence: number): string {
  const padded = String(sequence).padStart(3, "0");
  return `VID-${YEAR}${padded}`;
}
